"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type Colecao = { id: string; nome: string; total: number };

export function ColecoesManager() {
  const router = useRouter();
  const [colecoes, setColecoes] = useState<Colecao[] | null>(null);
  const [nome, setNome] = useState("");
  const [erro, setErro] = useState("");

  useEffect(() => {
    let ativo = true;
    fetch("/api/colecoes", { cache: "no-store" })
      .then(async (resposta) => {
        if (!resposta.ok) return;
        const corpo = await resposta.json();
        if (ativo) setColecoes(corpo.data ?? []);
      })
      .catch(() => undefined);
    return () => {
      ativo = false;
    };
  }, []);

  async function recarregar() {
    try {
      const resposta = await fetch("/api/colecoes", { cache: "no-store" });
      if (!resposta.ok) return;
      const corpo = await resposta.json();
      setColecoes(corpo.data ?? []);
    } catch {
      // Painel segue com as demais seções.
    }
  }

  async function criar(evento: React.FormEvent) {
    evento.preventDefault();
    setErro("");
    try {
      const resposta = await fetch("/api/colecoes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nome: nome.trim() }),
      });
      if (!resposta.ok) {
        setErro("Não foi possível criar. Use um nome com até 80 caracteres.");
        return;
      }
      setNome("");
      await recarregar();
      router.refresh();
    } catch {
      setErro("Não foi possível criar. Tente de novo.");
    }
  }

  async function excluir(id: string, nomeColecao: string) {
    if (!window.confirm(`Excluir a coleção “${nomeColecao}”? Os documentos salvos na estante permanecem.`)) return;
    await fetch(`/api/colecoes/${encodeURIComponent(id)}`, { method: "DELETE" });
    await recarregar();
    router.refresh();
  }

  return (
    <div>
      <form onSubmit={criar} className="mt-5 flex max-w-xl flex-col gap-3 sm:flex-row">
        <label htmlFor="nova-colecao" className="sr-only">Nome da nova coleção</label>
        <input
          id="nova-colecao"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          maxLength={80}
          placeholder="Ex.: Inteligência Artificial"
          className="min-w-0 flex-1 rounded-md border border-rule bg-vellum px-4 py-2.5 outline-none placeholder:text-ink-soft/70 focus-visible:border-library-700 focus-visible:ring-2 focus-visible:ring-library-700/40"
        />
        <button type="submit" className="rounded-md bg-library-800 px-6 py-2.5 font-semibold text-parchment hover:bg-library-900 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-library-700">
          Criar coleção
        </button>
      </form>
      {erro && <p role="alert" className="mt-2 text-sm font-medium text-red-800">{erro}</p>}
      {colecoes === null ? (
        <p className="mt-4 text-sm italic text-ink-soft">Carregando coleções…</p>
      ) : colecoes.length === 0 ? (
        <p className="mt-4 text-sm italic text-ink-soft">Nenhuma coleção ainda. Crie a primeira acima.</p>
      ) : (
        <ul className="mt-5 grid gap-4 md:grid-cols-2">
          {colecoes.map((colecao) => (
            <li key={colecao.id} className="flex items-center justify-between gap-4 rounded-md border border-rule bg-vellum p-5">
              <div>
                <Link prefetch={false} href={`/estante/colecao/${encodeURIComponent(colecao.id)}`} className="font-display text-xl hover:text-library-700 hover:underline focus-visible:outline-2 focus-visible:outline-library-700">
                  {colecao.nome}
                </Link>
                <p className="mt-1 text-sm text-ink-soft">{colecao.total} {colecao.total === 1 ? "documento" : "documentos"}</p>
              </div>
              <button onClick={() => void excluir(colecao.id, colecao.nome)} aria-label={`Excluir coleção ${colecao.nome}`} className="text-sm font-semibold text-red-800 underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-library-700">
                Excluir
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
