"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

type Colecao = { id: string; nome: string };

export function GuardarEmColecao({ documentoId }: { documentoId: string }) {
  const router = useRouter();
  const [aberto, setAberto] = useState(false);
  const [colecoes, setColecoes] = useState<Colecao[] | null>(null);
  const [nova, setNova] = useState("");

  const carregar = useCallback(async () => {
    try {
      const resposta = await fetch("/api/colecoes", { cache: "no-store" });
      if (resposta.status === 401) {
        router.push("/entrar");
        return;
      }
      if (!resposta.ok) return;
      const corpo = await resposta.json();
      setColecoes(corpo.data ?? []);
    } catch {
      // Sem coleções, sem bloqueio.
    }
  }, [router]);

  async function alternar(colecaoId: string, guardado: boolean) {
    if (guardado) {
      await fetch(`/api/colecoes/${encodeURIComponent(colecaoId)}/itens?documento=${encodeURIComponent(documentoId)}`, { method: "DELETE" });
    } else {
      const resposta = await fetch(`/api/colecoes/${encodeURIComponent(colecaoId)}/itens`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documento: documentoId }),
      });
      if (resposta.status === 401) {
        router.push("/entrar");
        return;
      }
    }
    await carregar();
  }

  async function criar(evento: React.FormEvent) {
    evento.preventDefault();
    const resposta = await fetch("/api/colecoes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nome: nova.trim() }),
    });
    if (resposta.status === 401) {
      router.push("/entrar");
      return;
    }
    if (resposta.ok) {
      setNova("");
      await carregar();
    }
  }

  if (!aberto) {
    return (
      <button
        onClick={() => {
          setAberto(true);
          void carregar();
        }}
        className="rounded-md border-2 border-library-800 px-6 py-3 font-semibold text-library-800 hover:bg-library-50 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-library-700"
      >
        Guardar em coleção
      </button>
    );
  }

  return (
    <div className="w-full rounded-md border border-rule bg-parchment p-4">
      <p className="text-sm font-semibold">Guardar em coleção</p>
      {colecoes === null ? (
        <p className="mt-2 text-sm italic text-ink-soft">Carregando…</p>
      ) : colecoes.length === 0 ? (
        <p className="mt-2 text-sm italic text-ink-soft">Crie a primeira coleção abaixo.</p>
      ) : (
        <ul className="mt-2 space-y-1.5">
          {colecoes.map((colecao) => (
            <li key={colecao.id}>
              <ColecaoItem colecao={colecao} documentoId={documentoId} aoAlternar={alternar} />
            </li>
          ))}
        </ul>
      )}
      <form onSubmit={criar} className="mt-3 flex gap-2">
        <label htmlFor="nova-colecao-ficha" className="sr-only">Nova coleção</label>
        <input
          id="nova-colecao-ficha"
          value={nova}
          onChange={(e) => setNova(e.target.value)}
          maxLength={80}
          placeholder="Nova coleção…"
          className="min-w-0 flex-1 rounded-md border border-rule bg-vellum px-3 py-2 text-sm outline-none focus-visible:border-library-700"
        />
        <button type="submit" className="rounded-md bg-library-800 px-4 py-2 text-sm font-semibold text-parchment hover:bg-library-900 focus-visible:outline-2 focus-visible:outline-library-700">
          Criar
        </button>
      </form>
      <button onClick={() => setAberto(false)} className="mt-2 text-sm font-semibold text-ink-soft underline-offset-4 hover:underline">
        Fechar
      </button>
    </div>
  );
}

function ColecaoItem({ colecao, documentoId, aoAlternar }: { colecao: Colecao; documentoId: string; aoAlternar: (id: string, guardado: boolean) => Promise<void> }) {
  const [guardado, setGuardado] = useState(false);

  useEffect(() => {
    let ativo = true;
    fetch(`/api/colecoes/${encodeURIComponent(colecao.id)}/itens?documento=${encodeURIComponent(documentoId)}`, { cache: "no-store" })
      .then(async (resposta) => {
        if (!resposta.ok) return;
        const corpo = await resposta.json();
        if (ativo) setGuardado(corpo.data?.guardado === true);
      })
      .catch(() => undefined);
    return () => {
      ativo = false;
    };
  }, [colecao.id, documentoId]);

  return (
    <button
      onClick={() => {
        setGuardado(!guardado);
        void aoAlternar(colecao.id, guardado);
      }}
      aria-pressed={guardado}
      className="flex w-full items-center justify-between gap-2 rounded px-2 py-1.5 text-left text-sm hover:bg-vellum focus-visible:outline-2 focus-visible:outline-library-700"
    >
      <span className="truncate">{colecao.nome}</span>
      <span aria-hidden="true" className="font-semibold text-library-800">{guardado ? "✓" : "+"}</span>
    </button>
  );
}
