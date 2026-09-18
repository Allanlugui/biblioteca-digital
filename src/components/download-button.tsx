"use client";

import { useState } from "react";

export function DownloadButton({ id }: { id: string }) {
  const [baixando, setBaixando] = useState(false);
  const [erro, setErro] = useState("");

  async function baixar() {
    setBaixando(true);
    setErro("");
    try {
      const resposta = await fetch(`/api/download/${encodeURIComponent(id)}`, { cache: "no-store" });
      if (!resposta.ok) throw new Error(resposta.status === 429 ? "Limite de requisições atingido. Aguarde um minuto." : "O download não está disponível agora. Tente novamente mais tarde.");
      if (!resposta.headers.get("content-type")?.includes("application/pdf")) throw new Error("A origem não retornou um PDF.");
      const arquivo = await resposta.blob();
      const url = URL.createObjectURL(arquivo);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${id}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Falha ao baixar o PDF.");
    } finally {
      setBaixando(false);
    }
  }

  return <div><button onClick={baixar} disabled={baixando} aria-busy={baixando} className="rounded-xl bg-teal-700 px-6 py-3 font-semibold text-white hover:bg-teal-800 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-teal-600 disabled:cursor-wait disabled:opacity-60">{baixando ? "Preparando download…" : "Baixar PDF"}</button>{erro && <p role="alert" className="mt-3 max-w-lg text-sm text-red-700 dark:text-red-400">{erro}</p>}</div>;
}
