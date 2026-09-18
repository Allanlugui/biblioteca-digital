"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function BotaoRemover({ id, titulo }: { id: string; titulo: string }) {
  const router = useRouter();
  const [removendo, setRemovendo] = useState(false);

  async function remover() {
    setRemovendo(true);
    try {
      await fetch(`/api/estante/${encodeURIComponent(id)}`, { method: "DELETE" });
    } finally {
      router.refresh();
    }
  }

  return (
    <button
      onClick={remover}
      disabled={removendo}
      aria-label={`Remover ${titulo} da estante`}
      className="text-sm font-semibold text-red-800 underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-library-700 disabled:opacity-60"
    >
      {removendo ? "Removendo…" : "Remover"}
    </button>
  );
}
