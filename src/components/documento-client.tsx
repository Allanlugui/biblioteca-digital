"use client";

import dynamic from "next/dynamic";
import { useCallback, useState } from "react";
import { documentoRespostaSchema } from "@/schemas/respostas";
import { ErrorState, LoadingState } from "./query-states";
import { useApi } from "./use-api";
import { formatarData, linkExternoSeguro, nomesFontes } from "@/lib/apresentacao";
import { DownloadButton } from "./download-button";
import { CitacaoBox } from "./citacao-box";
import { GuardarEmColecao } from "./guardar-em-colecao";
import { Relacionados } from "./relacionados";
import { SaveButton } from "./save-button";

const PdfViewer = dynamic(
  () => import("./pdf-viewer").then((mod) => mod.PdfViewer),
  { ssr: false, loading: () => <p className="mt-6 text-sm italic text-ink-soft">Preparando o leitor…</p> },
);

function chaveLocal(id: string): string {
  return `leitura:${id}`;
}

function lerPaginaLocal(id: string): number | null {
  try {
    const valor = window.localStorage.getItem(chaveLocal(id));
    const pagina = valor ? Number.parseInt(valor, 10) : NaN;
    return Number.isInteger(pagina) && pagina >= 1 ? pagina : null;
  } catch {
    return null;
  }
}

export function DocumentoClient({ id }: { id: string }) {
  const { estado, tentarNovamente } = useApi(`/api/documento/${encodeURIComponent(id)}`, documentoRespostaSchema);
  const [leitorAberto, setLeitorAberto] = useState(false);
  const [fonteArquivo, setFonteArquivo] = useState<string | null>(null);
  const [paginaInicial, setPaginaInicial] = useState(1);
  const [leitorPronto, setLeitorPronto] = useState(false);

  const guardarProgresso = useCallback(
    async (pagina: number, total: number) => {
      try {
        window.localStorage.setItem(chaveLocal(id), String(pagina));
      } catch {
        // Navegador sem storage: o progresso segue só na sessão.
      }
      try {
        await fetch("/api/progresso", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ documento: id, pagina, total }),
        });
      } catch {
        // Anônimo ou offline: fica só no navegador.
      }
    },
    [id],
  );

  async function abrirLeitor() {
    setLeitorAberto(true);
    // 1. Ponto de retomada: servidor primeiro, navegador como fallback.
    let inicio = lerPaginaLocal(id) ?? 1;
    try {
      const resposta = await fetch(`/api/progresso?documento=${encodeURIComponent(id)}`, { cache: "no-store" });
      if (resposta.ok) {
        const corpo = await resposta.json();
        if (typeof corpo.data?.pagina === "number" && corpo.data.pagina >= 1) {
          inicio = corpo.data.pagina;
        }
      }
    } catch {
      // Anônimo: vale o que está no navegador.
    }
    setPaginaInicial(inicio);
    // 2. Fonte do arquivo: acervo universal, com fallback para o proxy direto.
    try {
      const resposta = await fetch(`/api/arquivo/${encodeURIComponent(id)}`, { cache: "no-store" });
      if (resposta.ok) {
        const corpo = await resposta.json();
        if (typeof corpo.data?.url === "string" && corpo.data.url) {
          setFonteArquivo(corpo.data.url);
          setLeitorPronto(true);
          return;
        }
      }
    } catch {
      // Acervo indisponível: usa a origem direta abaixo.
    }
    setFonteArquivo(null);
    setLeitorPronto(true);
  }

  if (estado.status === "loading") return <div className="mt-8"><LoadingState /></div>;
  if (estado.status === "error") return <div className="mt-8"><ErrorState mensagem={estado.mensagem} tentarNovamente={tentarNovamente} /></div>;

  const documento = estado.data;
  const urlPagina = linkExternoSeguro(documento.urlPagina);
  const urlPdfExterno = linkExternoSeguro(documento.urlPdf);
  const proxyDireto = urlPdfExterno ? `/api/proxy?url=${encodeURIComponent(urlPdfExterno)}` : null;
  const doiUrl = documento.doi ? `https://doi.org/${documento.doi}` : null;

  return (
    <article className="mt-8 overflow-hidden rounded-md border border-rule bg-vellum shadow-[0_16px_40px_rgba(34,26,16,0.08)]">
      <div aria-hidden="true" className="h-1.5 bg-gradient-to-r from-gilt-700 via-gilt-400 to-gilt-700" />
      <div className="p-8 sm:p-10">
        <section aria-label="Informações do documento">
          <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
            <span className="rounded-sm bg-library-900 px-2.5 py-1 uppercase tracking-wider text-parchment">{nomesFontes[documento.fonte]}</span>
            {documento.urlPdf ? (
              <span className="rounded-sm border border-gilt-600/50 bg-gilt-100 px-2.5 py-1 uppercase tracking-wider text-gilt-700">PDF disponível</span>
            ) : (
              <span className="rounded-sm border border-rule px-2.5 py-1 uppercase tracking-wider text-ink-soft">Registro sem PDF direto</span>
            )}
            {documento.disponivelEm.length > 1 && (
              <span className="rounded-sm bg-library-100 px-2.5 py-1 uppercase tracking-wider text-library-800">Disponível em {documento.disponivelEm.length} fontes</span>
            )}
          </div>
          <h1 className="mt-5 break-words font-display text-4xl leading-tight">{documento.titulo}</h1>
          <dl className="mt-6 grid gap-x-8 gap-y-4 border-t border-rule pt-6 sm:grid-cols-2">
            <div>
              <dt className="text-xs font-semibold uppercase tracking-[0.2em] text-ink-soft">Autoria</dt>
              <dd className="mt-1 italic leading-6">{documento.autores.length ? documento.autores.join(", ") : "Não informada"}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-[0.2em] text-ink-soft">Publicado</dt>
              <dd className="mt-1">{formatarData(documento.dataPublicacao)}</dd>
            </div>
            {documento.doi && (
              <div>
                <dt className="text-xs font-semibold uppercase tracking-[0.2em] text-ink-soft">DOI</dt>
                <dd className="mt-1">
                  <a href={doiUrl as string} target="_blank" rel="noopener noreferrer" className="break-all font-mono text-sm text-library-800 underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-library-700">
                    {documento.doi}<span className="sr-only"> (abre em nova aba)</span>
                  </a>
                </dd>
              </div>
            )}
            {typeof documento.citacoes === "number" && (
              <div>
                <dt className="text-xs font-semibold uppercase tracking-[0.2em] text-ink-soft">Citações</dt>
                <dd className="mt-1">{documento.citacoes} {documento.citacoes === 1 ? "citação registrada" : "citações registradas"}</dd>
              </div>
            )}
            {documento.tipo && (
              <div>
                <dt className="text-xs font-semibold uppercase tracking-[0.2em] text-ink-soft">Tipo</dt>
                <dd className="mt-1 capitalize">{documento.tipo}</dd>
              </div>
            )}
            {documento.idioma && (
              <div>
                <dt className="text-xs font-semibold uppercase tracking-[0.2em] text-ink-soft">Idioma</dt>
                <dd className="mt-1 uppercase">{documento.idioma}</dd>
              </div>
            )}
          </dl>
          {documento.assuntos.length > 0 && (
            <div className="mt-6">
              <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-ink-soft">Assuntos</h2>
              <ul className="mt-2 flex flex-wrap gap-2">
                {documento.assuntos.map((assunto) => (
                  <li key={assunto} className="rounded-full border border-rule bg-parchment px-3 py-1 text-sm">{assunto}</li>
                ))}
              </ul>
            </div>
          )}
        </section>
        {documento.descricao && (
          <section aria-label="Resumo" className="mt-8 border-t border-rule pt-6">
            <h2 className="font-display text-2xl">Resumo</h2>
            <p className="mt-3 leading-7 text-ink-soft">{documento.descricao}</p>
          </section>
        )}
        <section aria-label="Citar" className="mt-8 border-t border-rule pt-6">
          <h2 className="font-display text-2xl">Citar</h2>
          <CitacaoBox documento={documento} />
        </section>
        <Relacionados id={documento.id} />
        <section aria-label="Arquivos" className="mt-8 border-t border-rule pt-6">
          <h2 className="font-display text-2xl">Arquivos</h2>
          {!documento.urlPdf ? (
            <p className="mt-3 text-sm italic text-ink-soft">A fonte não disponibiliza o PDF deste registro. Consulte a página da publicação.</p>
          ) : (
            <div className="mt-4 flex flex-wrap items-center gap-4">
              <DownloadButton id={documento.id} />
              <SaveButton id={documento.id} />
              {urlPdfExterno && <a href={urlPdfExterno} target="_blank" rel="noopener noreferrer" className="text-sm font-semibold text-library-800 underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-library-700">Abrir PDF na origem<span className="sr-only"> (abre em nova aba)</span></a>}
            </div>
          )}
          <div className="mt-4 max-w-xl">
            <GuardarEmColecao documentoId={documento.id} />
          </div>
          {!documento.urlPdf && (
            <div className="mt-4"><SaveButton id={documento.id} /></div>
          )}
        </section>
        <section aria-label="Origem" className="mt-8 border-t border-rule pt-6">
          <h2 className="font-display text-2xl">Origem</h2>
          <p className="mt-3 text-sm leading-6 text-ink-soft">
            Registro fornecido por <strong>{nomesFontes[documento.fonte]}</strong>. Metadados e arquivos pertencem à fonte original.
          </p>
          <div className="mt-3 flex flex-wrap gap-4">
            {urlPagina && <a href={urlPagina} target="_blank" rel="noopener noreferrer" className="text-sm font-semibold text-library-800 underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-library-700">Ver registro original<span className="sr-only"> (abre em nova aba)</span></a>}
          </div>
        </section>
        {documento.urlPdf && !leitorAberto && (
          <button onClick={abrirLeitor} className="mt-8 w-full rounded-md border-2 border-library-800 px-6 py-3 font-semibold text-library-800 hover:bg-library-50 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-library-700 sm:w-auto">
            Ler no navegador
          </button>
        )}
        {leitorAberto && !leitorPronto && (
          <p className="mt-6 text-sm italic text-ink-soft" role="status">Buscando o livro no acervo…</p>
        )}
        {leitorAberto && leitorPronto && (fonteArquivo ?? proxyDireto) && (
          <PdfViewer
            urlArquivo={(fonteArquivo ?? proxyDireto) as string}
            paginaInicial={paginaInicial}
            aoMudarPagina={(pagina, total) => void guardarProgresso(pagina, total)}
          />
        )}
      </div>
    </article>
  );
}
