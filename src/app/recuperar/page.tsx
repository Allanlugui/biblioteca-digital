"use client";

import { useState } from "react";
import { criarClienteNavegador } from "@/lib/supabase/cliente";
import { recuperarSchema } from "@/schemas/auth";

const CONFIGURADO = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "") !== "";

export default function RecuperarPage() {
  const [email, setEmail] = useState("");
  const [erro, setErro] = useState("");
  const [enviado, setEnviado] = useState(false);
  const [carregando, setCarregando] = useState(false);

  async function recuperar(evento: React.FormEvent) {
    evento.preventDefault();
    setErro("");
    if (!recuperarSchema.safeParse({ email }).success) {
      setErro("Informe um e-mail válido.");
      return;
    }
    setCarregando(true);
    try {
      const supabase = criarClienteNavegador();
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent("/redefinir")}`,
      });
      if (error) throw error;
      setEnviado(true);
    } catch {
      setErro("Não foi possível enviar. Tente de novo.");
    } finally {
      setCarregando(false);
    }
  }

  return (
    <main id="conteudo" className="mx-auto w-full max-w-xl flex-1 px-6 py-14">
      <p className="text-xs font-semibold uppercase tracking-[0.32em] text-gilt-700">Conta da biblioteca</p>
      <h1 className="mt-3 font-display text-4xl tracking-tight">Recuperar senha</h1>
      {!CONFIGURADO ? (
        <p role="alert" className="mt-6 rounded-md border border-gilt-600/60 bg-vellum p-5 text-ink-soft">
          Recuperação indisponível neste ambiente.
        </p>
      ) : enviado ? (
        <section className="mt-6 rounded-md border border-rule bg-vellum p-8 text-center">
          <h2 className="font-display text-2xl">Verifique seu e-mail</h2>
          <p className="mt-3 text-ink-soft">Enviamos um link para criar uma nova senha.</p>
        </section>
      ) : (
        <form onSubmit={recuperar} className="mt-6 rounded-md border border-rule bg-vellum p-6 sm:p-8">
          <p className="text-sm leading-6 text-ink-soft">Informe o e-mail da conta para receber o link de redefinição.</p>
          <label htmlFor="email" className="mb-2 mt-4 block text-sm font-semibold">E-mail</label>
          <input id="email" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="voce@exemplo.com" className="w-full rounded-md border border-rule bg-parchment px-4 py-3 outline-none placeholder:text-ink-soft/70 focus-visible:border-library-700 focus-visible:ring-2 focus-visible:ring-library-700/40" />
          {erro && <p role="alert" className="mt-3 text-sm font-medium text-red-800">{erro}</p>}
          <button type="submit" disabled={carregando} className="mt-5 w-full rounded-md bg-library-800 px-6 py-3 font-semibold text-parchment hover:bg-library-900 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-library-700 disabled:opacity-60">
            {carregando ? "Enviando…" : "Enviar link"}
          </button>
        </form>
      )}
    </main>
  );
}
