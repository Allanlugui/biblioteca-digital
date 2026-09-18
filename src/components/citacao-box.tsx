"use client";

import { useState } from "react";
import { formatosCitacao, gerarCitacao, rotulosFormatos, type FormatoCitacao } from "@/lib/citacoes";
import type { Documento } from "@/types";

export function CitacaoBox({ documento }: { documento: Documento }) {
  const [formato, setFormato] = useState<FormatoCitacao>("abnt");
  const [copiado, setCopiado] = useState(false);
  const texto = gerarCitacao(documento, formato);
  const podeBaixar = formato === "bibtex" || formato === "ris";

  async function copiar() {
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado(true);
      window.setTimeout(() => setCopiado(false), 2000);
    } catch {
      // Clipboard indisponível: o texto segue selecionável abaixo.
    }
  }

  function baixar() {
    const blob = new Blob([texto], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${documento.id}.${formato === "bibtex" ? "bib" : "ris"}`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  return (
    <div className="mt-4 rounded-md border border-rule bg-parchment p-4">
      <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Formato da citação">
        {formatosCitacao.map((f) => (
          <button
            key={f}
            onClick={() => setFormato(f)}
            aria-pressed={formato === f}
            className={`rounded-full px-3 py-1.5 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-library-700 ${
              formato === f
                ? "bg-library-800 text-parchment"
                : "border border-rule bg-vellum text-ink-soft hover:border-library-700"
            }`}
          >
            {rotulosFormatos[f]}
          </button>
        ))}
      </div>
      <pre className="mt-3 overflow-x-auto whitespace-pre-wrap break-words rounded-sm border border-rule bg-vellum p-4 font-mono text-sm leading-6">{texto}</pre>
      <div className="mt-3 flex flex-wrap gap-3">
        <button onClick={copiar} className="rounded-md bg-library-800 px-5 py-2.5 text-sm font-semibold text-parchment hover:bg-library-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-library-700">
          {copiado ? "Copiado!" : "Copiar citação"}
        </button>
        {podeBaixar && (
          <button onClick={baixar} className="rounded-md border-2 border-library-800 px-5 py-2.5 text-sm font-semibold text-library-800 hover:bg-library-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-library-700">
            Baixar .{formato === "bibtex" ? "bib" : "ris"}
          </button>
        )}
      </div>
      <p role="status" aria-live="polite" className="sr-only">{copiado ? "Citação copiada." : ""}</p>
      <p className="mt-2 text-xs italic text-ink-soft">Gerada só com os metadados informados pela fonte.</p>
    </div>
  );
}
