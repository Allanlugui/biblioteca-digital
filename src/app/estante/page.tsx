import type { Metadata } from "next";
import Link from "next/link";
import { BotaoRemover } from "@/components/botao-remover";
import { ColecoesManager } from "@/components/colecoes-manager";
import { formatarData, nomesFontes } from "@/lib/apresentacao";
import { criarClienteServidor, supabaseLeituraConfigurado } from "@/lib/supabase/servidor";
import type { Fonte } from "@/types";

export const metadata: Metadata = { title: "Minha estante | Biblioteca Digital" };

type ItemEstante = {
  salvoEm: string;
  documento: {
    id: string;
    fonte: Fonte;
    titulo: string;
    autores: string[] | null;
    data_publicacao: string | null;
  } | null;
  progresso: { pagina: number; total_paginas: number | null } | null;
};

function percentual(pagina: number, total: number | null): number | null {
  if (!total || total <= 0) return null;
  return Math.min(100, Math.round((pagina / total) * 100));
}

export default async function EstantePage() {
  if (!supabaseLeituraConfigurado()) {
    return (
      <main id="conteudo" className="mx-auto w-full max-w-3xl flex-1 px-6 py-14">
        <h1 className="font-display text-4xl tracking-tight">Minha estante</h1>
        <p className="mt-4 leading-7 text-ink-soft">A estante ainda não está configurada neste ambiente. Navegar e ler continua livre para todos.</p>
      </main>
    );
  }
  const supabase = await criarClienteServidor();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) {
    return (
      <main id="conteudo" className="mx-auto w-full max-w-3xl flex-1 px-6 py-14 text-center">
        <p aria-hidden="true" className="font-display text-4xl text-gilt-600">❦</p>
        <h1 className="mt-4 font-display text-4xl tracking-tight">Sua estante particular</h1>
        <p className="mx-auto mt-4 max-w-xl leading-7 text-ink-soft">
          Entre para guardar documentos, ver seu histórico de buscas e continuar cada leitura exatamente de onde parou.
        </p>
        <Link href="/entrar" className="mt-8 inline-block rounded-md bg-library-800 px-8 py-4 font-semibold text-parchment hover:bg-library-900 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-library-700">
          Entrar sem senha
        </Link>
      </main>
    );
  }

  const [estante, progresso, buscas] = await Promise.all([
    supabase.from("estante").select("created_at, documentos(id, fonte, titulo, autores, data_publicacao)").eq("user_id", auth.user.id).order("created_at", { ascending: false }),
    supabase.from("progresso_leitura").select("documento_id, pagina, total_paginas, atualizado_em").eq("user_id", auth.user.id).order("atualizado_em", { ascending: false }).limit(10),
    supabase.from("buscas").select("consulta, total, created_at").eq("user_id", auth.user.id).order("created_at", { ascending: false }).limit(10),
  ]);

  const porDocumento = new Map((progresso.data ?? []).map((p) => [p.documento_id, p]));
  const itens: ItemEstante[] = (estante.data ?? []).map((item) => {
    const docs = item.documentos;
    const documento = Array.isArray(docs) ? (docs[0] ?? null) : (docs ?? null);
    return {
      salvoEm: item.created_at,
      documento,
      progresso: porDocumento.get(documento?.id ?? "") ?? null,
    };
  });
  const continuando = (progresso.data ?? []).filter((p) => p.pagina > 1);

  return (
    <main id="conteudo" className="mx-auto w-full max-w-6xl flex-1 px-6 py-10 sm:py-14">
      <p className="text-xs font-semibold uppercase tracking-[0.32em] text-gilt-700">Painel do leitor</p>
      <h1 className="mt-3 font-display text-4xl tracking-tight sm:text-5xl">Minha estante</h1>
      <p className="mt-3 text-ink-soft">{auth.user.email}</p>

      <section aria-label="Continuar lendo" className="mt-10">
        <h2 className="font-display text-2xl">Continuar lendo</h2>
        <div className="rule-double mt-3" aria-hidden="true" />
        {continuando.length === 0 ? (
          <p className="mt-4 text-sm italic text-ink-soft">Nenhuma leitura em andamento. Abra um livro e avance uma página para começar.</p>
        ) : (
          <ul className="mt-5 grid gap-4 md:grid-cols-2">
            {continuando.map((p) => {
              const pct = percentual(p.pagina, p.total_paginas);
              return (
                <li key={p.documento_id} className="rounded-md border border-rule bg-vellum p-5">
                  <Link prefetch={false} href={`/documento/${encodeURIComponent(p.documento_id)}`} className="font-display text-lg hover:text-library-700 hover:underline focus-visible:outline-2 focus-visible:outline-library-700">
                    {p.documento_id}
                  </Link>
                  <p className="mt-1 text-sm text-ink-soft">Página {p.pagina}{p.total_paginas ? ` de ${p.total_paginas}` : ""}</p>
                  {pct !== null && (
                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-rule" role="img" aria-label={`${pct}% lido`}>
                      <div className="h-full bg-library-700" style={{ width: `${pct}%` }} />
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section aria-label="Coleções" className="mt-12">
        <h2 className="font-display text-2xl">Coleções</h2>
        <div className="rule-double mt-3" aria-hidden="true" />
        <p className="mt-4 text-sm leading-6 text-ink-soft">Pastas temáticas para organizar a estante. Favoritos ficam em “Salvos” acima.</p>
        <ColecoesManager />
      </section>

      <section aria-label="Documentos salvos" className="mt-12">
        <h2 className="font-display text-2xl">Salvos ({itens.length})</h2>
        <div className="rule-double mt-3" aria-hidden="true" />
        {itens.length === 0 ? (
          <p className="mt-4 text-sm italic text-ink-soft">Sua estante está vazia. Use “Salvar na estante” na ficha de um documento.</p>
        ) : (
          <ul className="mt-5 grid gap-4 md:grid-cols-2">
            {itens.map((item) => {
              const doc = item.documento;
              if (!doc) return null;
              return (
                <li key={doc.id} className="flex flex-col rounded-md border border-rule bg-vellum p-5">
                  <span className="w-fit rounded-sm bg-library-900 px-2.5 py-1 text-xs font-semibold uppercase tracking-wider text-parchment">{nomesFontes[doc.fonte] ?? doc.fonte}</span>
                  <Link prefetch={false} href={`/documento/${encodeURIComponent(doc.id)}`} className="mt-3 font-display text-xl leading-snug hover:text-library-700 hover:underline focus-visible:outline-2 focus-visible:outline-library-700">
                    {doc.titulo}
                  </Link>
                  <p className="mt-2 text-sm italic text-ink-soft">{(doc.autores ?? []).join(", ") || "Autoria não informada"} · {formatarData(doc.data_publicacao)}</p>
                  {item.progresso && <p className="mt-2 text-sm text-ink-soft">Página {item.progresso.pagina}{item.progresso.total_paginas ? ` de ${item.progresso.total_paginas}` : ""}</p>}
                  <div className="mt-3"><BotaoRemover id={doc.id} titulo={doc.titulo} /></div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section aria-label="Buscas recentes" className="mt-12">
        <h2 className="font-display text-2xl">Buscas recentes</h2>
        <div className="rule-double mt-3" aria-hidden="true" />
        {(buscas.data ?? []).length === 0 ? (
          <p className="mt-4 text-sm italic text-ink-soft">Nenhuma busca registrada ainda.</p>
        ) : (
          <ul className="mt-4 flex flex-wrap gap-2">
            {(buscas.data ?? []).map((b, i) => (
              <li key={`${b.consulta}-${i}`}>
                <Link prefetch={false} href={`/busca?q=${encodeURIComponent(b.consulta)}`} className="inline-block rounded-full border border-rule bg-vellum px-4 py-1.5 text-sm font-medium text-library-800 hover:border-library-700 hover:underline focus-visible:outline-2 focus-visible:outline-library-700">
                  {b.consulta}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
