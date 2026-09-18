import Link from "next/link";
import { formatarData, nomesFontes } from "@/lib/apresentacao";
import type { Documento } from "@/types";

export function ResultCard({ documento }: { documento: Documento }) {
  return (
    <article className="flex h-full flex-col rounded-md border border-rule bg-vellum p-6 shadow-[0_1px_0_rgba(34,26,16,0.06),0_10px_24px_rgba(34,26,16,0.05)] transition-shadow hover:shadow-[0_1px_0_rgba(34,26,16,0.06),0_16px_32px_rgba(34,26,16,0.10)]">
      <div className="mb-4 flex flex-wrap items-center gap-2 text-xs font-semibold">
        <span className="rounded-sm bg-library-900 px-2.5 py-1 uppercase tracking-wider text-parchment">{nomesFontes[documento.fonte]}</span>
        {documento.urlPdf ? (
          <span className="rounded-sm border border-gilt-600/50 bg-gilt-100 px-2.5 py-1 uppercase tracking-wider text-gilt-700">PDF disponível</span>
        ) : (
          <span className="rounded-sm border border-rule px-2.5 py-1 uppercase tracking-wider text-ink-soft">Sem PDF direto</span>
        )}
      </div>
      <h2 className="break-words font-display text-2xl leading-snug">
        <Link prefetch={false} href={`/documento/${encodeURIComponent(documento.id)}`} className="rounded hover:text-library-700 hover:underline focus-visible:outline-2 focus-visible:outline-library-700">
          {documento.titulo}
        </Link>
      </h2>
      <p className="mt-3 line-clamp-2 text-sm italic leading-6 text-ink-soft">{documento.autores.length ? documento.autores.join(", ") : "Autoria não informada"}</p>
      <p className="mt-1 text-xs font-semibold uppercase tracking-wider text-ink-soft">{formatarData(documento.dataPublicacao)}</p>
      {documento.descricao && <p className="mt-4 line-clamp-3 text-sm leading-6 text-ink-soft">{documento.descricao}</p>}
      <Link prefetch={false} href={`/documento/${encodeURIComponent(documento.id)}`} className="mt-auto inline-flex items-center gap-2 pt-6 text-sm font-semibold text-library-800 underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-library-700">
        Consultar a ficha<span className="sr-only"> de {documento.titulo}</span><span aria-hidden="true">→</span>
      </Link>
    </article>
  );
}
