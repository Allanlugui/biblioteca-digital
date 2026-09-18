import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { BotaoRetirar } from "@/components/botao-retirar";
import { formatarData } from "@/lib/apresentacao";
import { criarClienteServidor, supabaseLeituraConfigurado } from "@/lib/supabase/servidor";
import type { Fonte } from "@/types";

export const metadata: Metadata = { title: "Coleção" };

export default async function ColecaoPage({ params }: PageProps<"/estante/colecao/[id]">) {
  const { id } = await params;
  if (!supabaseLeituraConfigurado()) {
    return (
      <main id="conteudo" className="mx-auto w-full max-w-3xl flex-1 px-6 py-14">
        <h1 className="font-display text-4xl tracking-tight">Coleção</h1>
        <p className="mt-4 leading-7 text-ink-soft">As coleções ainda não estão configuradas neste ambiente.</p>
      </main>
    );
  }
  const supabase = await criarClienteServidor();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) notFound();

  const colecao = await supabase
    .from("colecoes")
    .select("id, nome")
    .eq("id", id)
    .eq("user_id", auth.user.id)
    .maybeSingle();
  if (!colecao.data) notFound();

  const itens = await supabase
    .from("colecao_itens")
    .select("documentos(id, fonte, titulo, autores, data_publicacao)")
    .eq("colecao_id", id)
    .order("created_at", { ascending: false });

  const docs = (itens.data ?? [])
    .map((item) => {
      const d = item.documentos;
      return Array.isArray(d) ? d[0] : d;
    })
    .filter((d): d is { id: string; fonte: Fonte; titulo: string; autores: string[] | null; data_publicacao: string | null } => Boolean(d));

  return (
    <main id="conteudo" className="mx-auto w-full max-w-6xl flex-1 px-6 py-10 sm:py-14">
      <Link prefetch={false} href="/estante" className="inline-flex items-center gap-2 text-sm font-semibold text-library-800 underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-library-700">
        <span aria-hidden="true">←</span> Voltar à estante
      </Link>
      <p className="mt-6 text-xs font-semibold uppercase tracking-[0.32em] text-gilt-700">Coleção</p>
      <h1 className="mt-3 break-words font-display text-4xl tracking-tight sm:text-5xl">{colecao.data.nome}</h1>
      <p className="mt-3 text-ink-soft">{docs.length} {docs.length === 1 ? "documento" : "documentos"}</p>
      {docs.length === 0 ? (
        <p className="mt-6 rounded-md border border-dashed border-gilt-600/60 bg-vellum p-8 text-center text-ink-soft">
          Coleção vazia. Guarde documentos pela ficha de cada obra.
        </p>
      ) : (
        <ul className="mt-6 grid gap-4 md:grid-cols-2">
          {docs.map((doc) => (
            <li key={doc.id} className="flex flex-col rounded-md border border-rule bg-vellum p-5">
              <Link prefetch={false} href={`/documento/${encodeURIComponent(doc.id)}`} className="font-display text-xl leading-snug hover:text-library-700 hover:underline focus-visible:outline-2 focus-visible:outline-library-700">
                {doc.titulo}
              </Link>
              <p className="mt-2 text-sm italic text-ink-soft">{(doc.autores ?? []).join(", ") || "Autoria não informada"} · {formatarData(doc.data_publicacao)}</p>
              <div className="mt-3"><BotaoRetirar colecaoId={id} documentoId={doc.id} titulo={doc.titulo} /></div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
