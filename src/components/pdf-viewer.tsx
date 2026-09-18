"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { GlobalWorkerOptions, getDocument, type PDFDocumentProxy } from "pdfjs-dist";

GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

const MAX_PAGINAS = 20;
const ESCALA = 1.5;

type EstadoLeitor = "loading" | "ready" | "error";

function mensagemAmigavel(erro: unknown): string {
  const original = erro instanceof Error ? erro.message : "Falha ao carregar o PDF.";
  if (original.includes("(400)")) {
    return "O endereço do arquivo não foi aceito pelo serviço. Abra o PDF na origem.";
  }
  if (original.includes("(502)")) {
    return "Não foi possível obter o arquivo desta fonte no momento. Tente outro resultado ou mais tarde.";
  }
  return original;
}

type PaginaMudou = (pagina: number, total: number) => void;

export function PdfViewer({ urlArquivo, paginaInicial = 1, aoMudarPagina }: { urlArquivo: string; paginaInicial?: number; aoMudarPagina?: PaginaMudou }) {
  const palcoRef = useRef<HTMLDivElement | null>(null);
  const secaoRef = useRef<HTMLElement | null>(null);
  const docRef = useRef<PDFDocumentProxy | null>(null);
  const cacheRef = useRef(new Map<string, HTMLCanvasElement>());
  const rendersRef = useRef<{ cancel: () => void }[]>([]);
  const textosRef = useRef<string[] | null>(null);
  const paginaRef = useRef(paginaInicial);
  const toqueXRef = useRef<number | null>(null);
  const aoMudarRef = useRef<PaginaMudou | undefined>(aoMudarPagina);
  useEffect(() => {
    aoMudarRef.current = aoMudarPagina;
  });

  const [estado, setEstado] = useState<EstadoLeitor>("loading");
  const [mensagem, setMensagem] = useState("");
  const [total, setTotal] = useState(0);
  const [pagina, setPagina] = useState(paginaInicial);
  const [direcao, setDirecao] = useState<1 | -1>(1);
  const [zoom, setZoom] = useState(1);
  const [telaCheia, setTelaCheia] = useState(false);
  const [termo, setTermo] = useState("");
  const [ocorrencias, setOcorrencias] = useState<{ pagina: number; vezes: number }[]>([]);
  const [indiceOcorrencia, setIndiceOcorrencia] = useState(0);
  const [buscando, setBuscando] = useState(false);
  const [buscaSemResultado, setBuscaSemResultado] = useState(false);

  // Carrega o documento (uma vez por URL).
  useEffect(() => {
    let cancelado = false;
    const cache = cacheRef.current;
    const tarefa = getDocument({ url: urlArquivo, withCredentials: false });
    (async () => {
      try {
        const doc = await tarefa.promise;
        if (cancelado) return;
        docRef.current = doc;
        cache.clear();
        const limite = Math.min(doc.numPages, MAX_PAGINAS);
        const inicio = Math.min(Math.max(paginaRef.current, 1), limite);
        paginaRef.current = inicio;
        setTotal(limite);
        setPagina(inicio);
        setDirecao(1);
        setEstado("ready");
      } catch (error) {
        if (!cancelado) {
          setEstado("error");
          setMensagem(mensagemAmigavel(error));
        }
      }
    })();
    return () => {
      cancelado = true;
      rendersRef.current.forEach((render) => render.cancel());
      rendersRef.current = [];
      void tarefa.destroy().catch(() => undefined);
      docRef.current = null;
      cache.clear();
    };
  }, [urlArquivo]);

  const obterCanvas = useCallback(async (numero: number, escala: number, cancelado: () => boolean) => {
    const chave = `${numero}@${escala.toFixed(2)}`;
    const emCache = cacheRef.current.get(chave);
    if (emCache) return emCache;
    const doc = docRef.current;
    if (!doc) return null;
    const page = await doc.getPage(numero);
    if (cancelado()) return null;
    const viewport = page.getViewport({ scale: ESCALA * escala });
    const canvas = document.createElement("canvas");
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext("2d");
    if (!ctx || cancelado()) return null;
    const render = page.render({ canvasContext: ctx, canvas, viewport });
    rendersRef.current.push(render);
    try {
      await render.promise;
    } finally {
      rendersRef.current = rendersRef.current.filter((item) => item !== render);
    }
    if (cancelado()) return null;
    cacheRef.current.set(chave, canvas);
    return canvas;
  }, []);

  // Exibe a página atual no palco, deslizando conforme a direção.
  useEffect(() => {
    if (estado !== "ready" || total === 0) return;
    const palco = palcoRef.current;
    if (!palco) return;
    let cancelado = false;
    const foiCancelado = () => cancelado;
    (async () => {
      const canvas = await obterCanvas(pagina, zoom, foiCancelado);
      if (cancelado || !canvas) return;
      palco.textContent = "";
      const classe = direcao === 1 ? "animate-page-from-right" : "animate-page-from-left";
      canvas.classList.remove("animate-page-from-right", "animate-page-from-left");
      // Reforça o reflow para a animação repetir ao revisitar a página.
      void canvas.offsetWidth;
      canvas.className = `mx-auto block max-w-full bg-white shadow-[0_10px_30px_rgba(34,26,16,0.25)] ${classe}`;
      palco.appendChild(canvas);
      // Pré-renderiza as vizinhas para a virada ser instantânea.
      if (pagina < total) void obterCanvas(pagina + 1, zoom, foiCancelado).catch(() => undefined);
      if (pagina > 1) void obterCanvas(pagina - 1, zoom, foiCancelado).catch(() => undefined);
      // Avisa quem escuta (progresso de leitura), com respiro entre viradas.
      // O guard `cancelado` pertence ao efeito: se a página mudar, este aviso morre.
      window.setTimeout(() => {
        if (!cancelado) aoMudarRef.current?.(pagina, total);
      }, 800);
    })().catch(() => undefined);
    return () => {
      cancelado = true;
    };
  }, [estado, pagina, direcao, total, zoom, obterCanvas]);

  function ajustarZoom(delta: number) {
    setZoom((atual) => Math.min(2.5, Math.max(0.5, Math.round((atual + delta) * 100) / 100)));
  }

  async function alternarTelaCheia() {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else {
        await secaoRef.current?.requestFullscreen();
      }
    } catch {
      // Fullscreen indisponível: o leitor segue normal.
    }
  }

  useEffect(() => {
    const aoMudar = () => setTelaCheia(document.fullscreenElement !== null);
    document.addEventListener("fullscreenchange", aoMudar);
    return () => document.removeEventListener("fullscreenchange", aoMudar);
  }, []);

  async function extrairTextos(): Promise<string[]> {
    if (textosRef.current) return textosRef.current;
    const doc = docRef.current;
    if (!doc) return [];
    const textos: string[] = [];
    for (let num = 1; num <= total; num++) {
      const page = await doc.getPage(num);
      const conteudo = await page.getTextContent();
      textos.push(conteudo.items.map((item) => ("str" in item ? item.str : "")).join(" "));
    }
    textosRef.current = textos;
    return textos;
  }

  async function buscarNoTexto(evento: React.FormEvent) {
    evento.preventDefault();
    const consulta = termo.trim().toLowerCase();
    if (consulta.length < 2 || buscando) return;
    setBuscando(true);
    setBuscaSemResultado(false);
    try {
      const textos = await extrairTextos();
      const achados = textos
        .map((texto, indice) => {
          const vezes = texto.toLowerCase().split(consulta).length - 1;
          return vezes > 0 ? { pagina: indice + 1, vezes } : null;
        })
        .filter((achado): achado is { pagina: number; vezes: number } => achado !== null);
      setOcorrencias(achados);
      setIndiceOcorrencia(0);
      setBuscaSemResultado(achados.length === 0);
      if (achados[0]) irPara(achados[0].pagina);
    } finally {
      setBuscando(false);
    }
  }

  function navegarOcorrencia(proxima: boolean) {
    if (ocorrencias.length === 0) return;
    const proximo = (indiceOcorrencia + (proxima ? 1 : ocorrencias.length - 1)) % ocorrencias.length;
    setIndiceOcorrencia(proximo);
    const alvo = ocorrencias[proximo];
    if (alvo) irPara(alvo.pagina);
  }

  const irPara = useCallback(
    (alvo: number) => {
      if (estado !== "ready" || total === 0) return;
      const destino = Math.min(Math.max(alvo, 1), total);
      setDirecao(destino >= paginaRef.current ? 1 : -1);
      paginaRef.current = destino;
      setPagina(destino);
    },
    [estado, total],
  );

  // Setas do teclado folheiam o livro (exceto digitando na busca).
  useEffect(() => {
    const aoTeclar = (evento: KeyboardEvent) => {
      const alvo = evento.target as HTMLElement | null;
      if (alvo && (alvo.tagName === "INPUT" || alvo.tagName === "TEXTAREA" || alvo.tagName === "SELECT")) return;
      if (evento.key === "ArrowRight") irPara(paginaRef.current + 1);
      if (evento.key === "ArrowLeft") irPara(paginaRef.current - 1);
    };
    window.addEventListener("keydown", aoTeclar);
    return () => window.removeEventListener("keydown", aoTeclar);
  }, [irPara]);

  if (estado === "error") {
    return (
      <p role="alert" className="mt-4 rounded-md border border-red-300 bg-[#fdf3ef] p-4 text-sm font-medium text-red-800">
        Não foi possível exibir o leitor: {mensagem}
      </p>
    );
  }

  if (estado === "loading") {
    return (
      <section aria-label="Leitor de PDF" className="mt-6">
        <div role="status" className="rounded-md border border-rule bg-parchment p-8">
          <p className="font-display text-xl">Abrindo o livro…</p>
          <p className="mt-2 text-sm italic text-ink-soft">Buscando as páginas na fonte.</p>
          <div aria-hidden="true" className="mt-6 motion-safe:animate-pulse">
            <div className="mx-auto aspect-[3/4] max-w-sm rounded-sm bg-rule" />
          </div>
        </div>
      </section>
    );
  }

  return (
    <section ref={secaoRef} aria-label="Leitor de PDF" className="mt-6 rounded-md [&:fullscreen]:overflow-auto [&:fullscreen]:bg-parchment [&:fullscreen]:p-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-t-md border border-rule border-b-0 bg-library-950 px-4 py-3 text-parchment">
        <button
          onClick={() => irPara(pagina - 1)}
          disabled={pagina <= 1}
          aria-label="Página anterior"
          className="rounded px-3 py-2 text-sm font-semibold hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-gilt-400 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <span aria-hidden="true">←</span> Anterior
        </button>
        <p aria-live="polite" className="font-display text-lg tracking-wide">
          Página {pagina} de {total}
        </p>
        <div className="flex items-center gap-1" role="group" aria-label="Zoom">
          <button onClick={() => ajustarZoom(-0.25)} disabled={zoom <= 0.5} aria-label="Reduzir zoom" className="rounded px-3 py-2 text-sm font-semibold hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-gilt-400 disabled:opacity-40">A−</button>
          <button onClick={() => setZoom(1)} aria-label="Zoom original" className="min-w-14 rounded px-2 py-2 text-sm font-semibold hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-gilt-400">{Math.round(zoom * 100)}%</button>
          <button onClick={() => ajustarZoom(0.25)} disabled={zoom >= 2.5} aria-label="Aumentar zoom" className="rounded px-3 py-2 text-sm font-semibold hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-gilt-400 disabled:opacity-40">A+</button>
        </div>
        <button
          onClick={() => irPara(pagina + 1)}
          disabled={pagina >= total}
          aria-label="Próxima página"
          className="rounded px-3 py-2 text-sm font-semibold hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-gilt-400 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Próxima <span aria-hidden="true">→</span>
        </button>
        <button
          onClick={alternarTelaCheia}
          aria-label={telaCheia ? "Sair da tela cheia" : "Ler em tela cheia"}
          aria-pressed={telaCheia}
          className="rounded px-3 py-2 text-sm font-semibold hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-gilt-400"
        >
          {telaCheia ? "⤢ Sair" : "⤢ Tela cheia"}
        </button>
      </div>
      <div
        ref={palcoRef}
        role="region"
        aria-label={`Página ${pagina} de ${total}`}
        className="book-stage min-h-96 rounded-b-md border border-rule border-t-0 bg-parchment p-4 shadow-[inset_14px_0_28px_rgba(34,26,16,0.10)] sm:p-8"
        onTouchStart={(evento) => {
          toqueXRef.current = evento.touches[0]?.clientX ?? null;
        }}
        onTouchEnd={(evento) => {
          const inicio = toqueXRef.current;
          const fim = evento.changedTouches[0]?.clientX;
          toqueXRef.current = null;
          if (inicio === null || fim === undefined) return;
          const delta = fim - inicio;
          if (delta < -40) irPara(paginaRef.current + 1);
          if (delta > 40) irPara(paginaRef.current - 1);
        }}
      />
      <div className="mt-4 flex flex-wrap items-center gap-4">
        <form onSubmit={buscarNoTexto} role="search" aria-label="Buscar no documento" className="flex w-full max-w-md items-center gap-2">
          <label htmlFor="busca-documento" className="sr-only">Buscar no documento</label>
          <input
            id="busca-documento"
            type="search"
            value={termo}
            onChange={(e) => setTermo(e.target.value)}
            minLength={2}
            placeholder="Buscar no documento…"
            className="min-w-0 flex-1 rounded-md border border-rule bg-vellum px-3 py-2 text-sm outline-none placeholder:text-ink-soft/70 focus-visible:border-library-700 focus-visible:ring-2 focus-visible:ring-library-700/40"
          />
          <button type="submit" disabled={buscando} className="rounded-md bg-library-800 px-4 py-2 text-sm font-semibold text-parchment hover:bg-library-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-library-700 disabled:opacity-60">
            {buscando ? "Buscando…" : "Buscar"}
          </button>
        </form>
        {ocorrencias.length > 0 && (
          <div className="flex items-center gap-2 text-sm" role="status">
            <button onClick={() => navegarOcorrencia(false)} aria-label="Ocorrência anterior" className="rounded border border-rule px-2 py-1 font-semibold hover:bg-vellum focus-visible:outline-2 focus-visible:outline-library-700">←</button>
            <span>{indiceOcorrencia + 1} de {ocorrencias.length} · pág. {ocorrencias[indiceOcorrencia]?.pagina}</span>
            <button onClick={() => navegarOcorrencia(true)} aria-label="Próxima ocorrência" className="rounded border border-rule px-2 py-1 font-semibold hover:bg-vellum focus-visible:outline-2 focus-visible:outline-library-700">→</button>
          </div>
        )}
        {buscaSemResultado && !buscando && (
          <p role="status" className="text-sm italic text-ink-soft">Nenhuma ocorrência neste trecho do livro.</p>
        )}
      </div>
      <div className="mt-4 flex items-center gap-4">
        <label htmlFor="ir-para-pagina" className="text-sm font-semibold text-ink-soft">
          Ir para a página
        </label>
        <input
          id="ir-para-pagina"
          type="range"
          min={1}
          max={total}
          value={pagina}
          onChange={(evento) => irPara(Number(evento.target.value))}
          aria-label="Ir para a página"
          className="w-full max-w-xs accent-[#184636]"
        />
      </div>
      <p className="mt-3 text-sm italic text-ink-soft">
        {total >= MAX_PAGINAS
          ? `Pré-visualização das ${MAX_PAGINAS} primeiras páginas. Use as setas do teclado ou deslize o dedo para folhear.`
          : "Use as setas do teclado ou deslize o dedo para folhear."}
      </p>
    </section>
  );
}
