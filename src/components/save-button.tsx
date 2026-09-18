"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export function SaveButton({ id }: { id: string }) {
  const router = useRouter();
  const [salvo, setSalvo] = useState(false);
  const [ocupado, setOcupado] = useState(false);

  useEffect(() => {
    let ativo = true;
    fetch(`/api/estante?documento=${encodeURIComponent(id)}`, { cache: "no-store" })
      .then(async (resposta) => {
        if (!resposta.ok) return;
        const corpo = await resposta.json();
        if (ativo) setSalvo(corpo.data?.salvo === true);
      })
      .catch(() => undefined);
    return () => {
      ativo = false;
    };
  }, [id]);

  async function alternar() {
    setOcupado(true);
    try {
      const resposta = salvo
        ? await fetch(`/api/estante/${encodeURIComponent(id)}`, { method: "DELETE" })
        : await fetch("/api/estante", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id }),
          });
      if (resposta.status === 401) {
        router.push("/entrar");
        return;
      }
      if (resposta.ok) setSalvo(!salvo);
    } finally {
      setOcupado(false);
    }
  }

  return (
    <button
      onClick={alternar}
      disabled={ocupado}
      aria-pressed={salvo}
      className="rounded-md border-2 border-gilt-600 px-6 py-3 font-semibold text-gilt-700 hover:bg-gilt-100 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-gilt-600 disabled:opacity-60"
    >
      {salvo ? "Salvo na estante" : "Salvar na estante"}
    </button>
  );
}
