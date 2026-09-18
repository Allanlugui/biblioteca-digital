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
  { ssr: false, loading: () => <p className="mt-6 text-sm text-zinc-600 dark:text-zinc-400">Carregando leitor…</p> },
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
    <article className="mt-8 rounded-2xl border border-zinc-200 p-8 dark:border-zinc-800">
      <div className="flex flex-wrap items-center gap-3 text-xs font-semibold">
        <span className="rounded-full bg-zinc-100 px-3 py-1 dark:bg-zinc-800">{nomesFontes[documento.fonte]}</span>
        <span className="text-teal-700 dark:text-teal-400">{documento.urlPdf ? "PDF disponível na fonte" : "Registro sem PDF direto"}</span>
      </div>
      <h1 className="mt-5 break-words text-3xl font-semibold leading-9">{documento.titulo}</h1>
      <p className="mt-4 text-zinc-600 dark:text-zinc-400"><span className="font-medium">Autoria:</span> {documento.autores.length ? documento.autores.join(", ") : "Não informada"}</p>
      <p className="mt-2 text-zinc-600 dark:text-zinc-400"><span className="font-medium">Publicado:</span> {formatarData(documento.dataPublicacao)}</p>
      {documento.descricao && <p className="mt-5 leading-7 text-zinc-600 dark:text-zinc-400">{documento.descricao}</p>}
      <div className="mt-8 flex flex-wrap items-center gap-4">
        {documento.urlPdf ? <DownloadButton id={documento.id} /> : null}
        {urlPdfExterno && <a href={urlPdfExterno} target="_blank" rel="noopener noreferrer" className="text-sm font-semibold text-teal-700 underline-offset-4 hover:underline dark:text-teal-400">Abrir PDF na origem<span className="sr-only"> (abre em nova aba)</span></a>}
        {urlPagina && <a href={urlPagina} target="_blank" rel="noopener noreferrer" className="text-sm font-semibold text-teal-700 underline-offset-4 hover:underline dark:text-teal-400">Página da publicação<span className="sr-only"> (abre em nova aba)</span></a>}
      </div>
      {documento.urlPdf && !leitorAberto && (
        <button onClick={() => setLeitorAberto(true)} className="mt-6 rounded-xl border border-teal-700 px-6 py-3 font-semibold text-teal-700 hover:bg-teal-50 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-teal-600 dark:text-teal-400 dark:hover:bg-teal-950">
          Ler no navegador
        </button>
      )}
      {leitorAberto && urlPdfExterno && <PdfViewer urlPdf={urlPdfExterno} />}
    </article>
  );
}
