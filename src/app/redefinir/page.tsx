"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { criarClienteNavegador } from "@/lib/supabase/cliente";
import { redefinirSchema } from "@/schemas/auth";

export default function RedefinirPage() {
  const router = useRouter();
  const [senha, setSenha] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(false);

  async function redefinir(evento: React.FormEvent) {
    evento.preventDefault();
    setErro("");
    const parsed = redefinirSchema.safeParse({ senha, confirmar });
    if (!parsed.success) {
      setErro(parsed.error.issues[0]?.message ?? "Verifique os campos.");
      return;
    }
    setCarregando(true);
    try {
      const supabase = criarClienteNavegador();
      const { error } = await supabase.auth.updateUser({ password: parsed.data.senha });
      if (error) throw error;
      router.push("/estante");
      router.refresh();
    } catch {
      setErro("Link inválido ou expirado. Peça um novo em Recuperar senha.");
    } finally {
      setCarregando(false);
    }
  }

  const campo = "w-full rounded-md border border-rule bg-parchment px-4 py-3 outline-none placeholder:text-ink-soft/70 focus-visible:border-library-700 focus-visible:ring-2 focus-visible:ring-library-700/40";

  return (
    <main id="conteudo" className="mx-auto w-full max-w-xl flex-1 px-6 py-14">
      <p className="text-xs font-semibold uppercase tracking-[0.32em] text-gilt-700">Conta da biblioteca</p>
      <h1 className="mt-3 font-display text-4xl tracking-tight">Nova senha</h1>
      <form onSubmit={redefinir} className="mt-6 rounded-md border border-rule bg-vellum p-6 sm:p-8">
        <label htmlFor="senha" className="mb-2 block text-sm font-semibold">Nova senha</label>
        <input id="senha" type="password" required autoComplete="new-password" value={senha} onChange={(e) => setSenha(e.target.value)} placeholder="Mínimo 6 caracteres" className={campo} />
        <label htmlFor="confirmar" className="mb-2 mt-4 block text-sm font-semibold">Confirmar nova senha</label>
        <input id="confirmar" type="password" required autoComplete="new-password" value={confirmar} onChange={(e) => setConfirmar(e.target.value)} placeholder="Repita a senha" className={campo} />
        {erro && <p role="alert" className="mt-3 text-sm font-medium text-red-800">{erro}</p>}
        <button type="submit" disabled={carregando} className="mt-5 w-full rounded-md bg-library-800 px-6 py-3 font-semibold text-parchment hover:bg-library-900 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-library-700 disabled:opacity-60">
          {carregando ? "Salvando…" : "Salvar nova senha"}
        </button>
      </form>
    </main>
  );
}
