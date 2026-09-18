"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { documentoRespostaSchema } from "@/schemas/respostas";
import { ErrorState, LoadingState } from "./query-states";
import { useApi } from "./use-api";
import { formatarData, linkExternoSeguro, nomesFontes } from "@/lib/apresentacao";
import { DownloadButton } from "./download-button";

const PdfViewer = dynamic(
  () => import("./pdf-viewer").then((mod) => mod.PdfViewer),
  { ssr: false, loading: () => <p className="mt-6 text-sm italic text-ink-soft">Preparando o leitor…</p> },
);

export function DocumentoClient({ id }: { id: string }) {
  const { estado, tentarNovamente } = useApi(`/api/documento/${encodeURIComponent(id)}`, documentoRespostaSchema);
  const [leitorAberto, setLeitorAberto] = useState(false);

  if (estado.status === "loading") return <div className="mt-8"><LoadingState /></div>;
  if (estado.status === "error") return <div className="mt-8"><ErrorState mensagem={estado.mensagem} tentarNovamente={tentarNovamente} /></div>;

  const documento = estado.data;
  const urlPagina = linkExternoSeguro(documento.urlPagina);
  const urlPdfExterno = linkExternoSeguro(documento.urlPdf);

  return (
    <article className="mt-8 overflow-hidden rounded-md border border-rule bg-vellum shadow-[0_16px_40px_rgba(34,26,16,0.08)]">
      <div aria-hidden="true" className="h-1.5 bg-gradient-to-r from-gilt-700 via-gilt-400 to-gilt-700" />
      <div className="p-8 sm:p-10">
        <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
          <span className="rounded-sm bg-library-900 px-2.5 py-1 uppercase tracking-wider text-parchment">{nomesFontes[documento.fonte]}</span>
          {documento.urlPdf ? (
            <span className="rounded-sm border border-gilt-600/50 bg-gilt-100 px-2.5 py-1 uppercase tracking-wider text-gilt-700">PDF disponível</span>
          ) : (
            <span className="rounded-sm border border-rule px-2.5 py-1 uppercase tracking-wider text-ink-soft">Registro sem PDF direto</span>
          )}
        </div>
        <h1 className="mt-5 break-words font-display text-4xl leading-tight">{documento.titulo}</h1>
        <dl className="mt-6 grid gap-4 border-t border-rule pt-6 sm:grid-cols-2">
          <div>
            <dt className="text-xs font-semibold uppercase tracking-[0.2em] text-ink-soft">Autoria</dt>
            <dd className="mt-1 italic leading-6">{documento.autores.length ? documento.autores.join(", ") : "Não informada"}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-[0.2em] text-ink-soft">Publicado</dt>
            <dd className="mt-1">{formatarData(documento.dataPublicacao)}</dd>
          </div>
        </dl>
        {documento.descricao && <p className="mt-6 leading-7 text-ink-soft">{documento.descricao}</p>}
        <div className="mt-8 flex flex-wrap items-center gap-4 border-t border-rule pt-6">
          {documento.urlPdf ? <DownloadButton id={documento.id} /> : null}
          {urlPdfExterno && <a href={urlPdfExterno} target="_blank" rel="noopener noreferrer" className="text-sm font-semibold text-library-800 underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-library-700">Abrir PDF na origem<span className="sr-only"> (abre em nova aba)</span></a>}
          {urlPagina && <a href={urlPagina} target="_blank" rel="noopener noreferrer" className="text-sm font-semibold text-library-800 underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-library-700">Página da publicação<span className="sr-only"> (abre em nova aba)</span></a>}
        </div>
        {documento.urlPdf && !leitorAberto && (
          <button onClick={() => setLeitorAberto(true)} className="mt-6 w-full rounded-md border-2 border-library-800 px-6 py-3 font-semibold text-library-800 hover:bg-library-50 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-library-700 sm:w-auto">
            Ler no navegador
          </button>
        )}
        {leitorAberto && urlPdfExterno && <PdfViewer urlPdf={urlPdfExterno} />}
      </div>
    </article>
  );
}
