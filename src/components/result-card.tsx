import Link from "next/link";
import { formatarData, nomesFontes } from "@/lib/apresentacao";
import type { Documento } from "@/types";

export function ResultCard({ documento }: { documento: Documento }) {
  return (
    <article className="flex h-full flex-col rounded-2xl border border-zinc-200 p-6 dark:border-zinc-800">
      <div className="mb-4 flex flex-wrap items-center gap-3 text-xs font-semibold">
        <span className="rounded-full bg-zinc-100 px-3 py-1 dark:bg-zinc-800">{nomesFontes[documento.fonte]}</span>
        <span className="text-teal-700 dark:text-teal-400">{documento.urlPdf ? "PDF disponível na fonte" : "Sem PDF direto"}</span>
      </div>
      <h2 className="break-words text-xl font-semibold leading-7">
        <Link prefetch={false} href={`/documento/${encodeURIComponent(documento.id)}`} className="rounded hover:text-teal-700 focus-visible:outline-2 focus-visible:outline-teal-600 dark:hover:text-teal-400">
          {documento.titulo}
        </Link>
      </h2>
      <p className="mt-3 line-clamp-2 text-sm text-zinc-600 dark:text-zinc-400">{documento.autores.length ? documento.autores.join(", ") : "Autoria não informada"}</p>
      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">{formatarData(documento.dataPublicacao)}</p>
      {documento.descricao && <p className="mt-4 line-clamp-3 text-sm leading-6 text-zinc-600 dark:text-zinc-400">{documento.descricao}</p>}
      <Link prefetch={false} href={`/documento/${encodeURIComponent(documento.id)}`} className="mt-auto pt-6 text-sm font-semibold text-teal-700 underline-offset-4 hover:underline dark:text-teal-400">
        Ver detalhes<span className="sr-only"> de {documento.titulo}</span>
      </Link>
    </article>
  );
}
