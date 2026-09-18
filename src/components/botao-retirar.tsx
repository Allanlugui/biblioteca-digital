"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function BotaoRetirar({ colecaoId, documentoId, titulo }: { colecaoId: string; documentoId: string; titulo: string }) {
  const router = useRouter();
  const [retirando, setRetirando] = useState(false);

  async function retirar() {
    setRetirando(true);
    try {
      await fetch(`/api/colecoes/${encodeURIComponent(colecaoId)}/itens?documento=${encodeURIComponent(documentoId)}`, { method: "DELETE" });
    } finally {
      router.refresh();
    }
  }

  return (
    <button
      onClick={retirar}
      disabled={retirando}
      aria-label={`Retirar ${titulo} da coleção`}
      className="text-sm font-semibold text-red-800 underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-library-700 disabled:opacity-60"
    >
      {retirando ? "Retirando…" : "Retirar"}
    </button>
  );
}
