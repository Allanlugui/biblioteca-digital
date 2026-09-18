"use client";

import { useState } from "react";
import { criarClienteNavegador } from "@/lib/supabase/cliente";

const CONFIGURADO = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "") !== "";

export default function EntrarPage() {
  const [email, setEmail] = useState("");
  const [enviado, setEnviado] = useState(false);
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(false);

  async function entrar(evento: React.FormEvent) {
    evento.preventDefault();
    setErro("");
    setCarregando(true);
    try {
      const supabase = criarClienteNavegador();
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
      });
      if (error) throw error;
      setEnviado(true);
    } catch {
      setErro("Não foi possível enviar o link. Confira o e-mail e tente de novo.");
    } finally {
      setCarregando(false);
    }
  }

  return (
    <main id="conteudo" className="mx-auto w-full max-w-xl flex-1 px-6 py-14">
      <p className="text-xs font-semibold uppercase tracking-[0.32em] text-gilt-700">Conta da biblioteca</p>
      <h1 className="mt-3 font-display text-4xl tracking-tight">Entrar sem senha</h1>
      {!CONFIGURADO ? (
        <p role="alert" className="mt-6 rounded-md border border-gilt-600/60 bg-vellum p-5 text-ink-soft">
          O login ainda não está configurado neste ambiente. Navegar e ler continua livre para todos.
        </p>
      ) : enviado ? (
        <section className="mt-6 rounded-md border border-rule bg-vellum p-8 text-center">
          <p aria-hidden="true" className="font-display text-3xl text-gilt-600">❦</p>
          <h2 className="mt-3 font-display text-2xl">Verifique seu e-mail</h2>
          <p className="mt-3 text-ink-soft">Enviamos um link de acesso para <strong>{email}</strong>. Ele vale por pouco tempo.</p>
        </section>
      ) : (
        <form onSubmit={entrar} className="mt-6 rounded-md border border-rule bg-vellum p-6 sm:p-8">
          <p className="text-sm leading-6 text-ink-soft">
            Conta opcional: só precisa dela quem quiser guardar a estante, o histórico e o ponto exato da leitura.
          </p>
          <label htmlFor="email" className="mb-2 mt-5 block text-sm font-semibold">E-mail</label>
          <input
            id="email"
            name="email"
            type="email"
            required
            maxLength={254}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="voce@exemplo.com"
            className="w-full rounded-md border border-rule bg-parchment px-4 py-3 outline-none placeholder:text-ink-soft/70 focus-visible:border-library-700 focus-visible:ring-2 focus-visible:ring-library-700/40"
          />
          {erro && <p role="alert" className="mt-3 text-sm font-medium text-red-800">{erro}</p>}
          <button
            type="submit"
            disabled={carregando}
            className="mt-5 w-full rounded-md bg-library-800 px-6 py-3 font-semibold text-parchment hover:bg-library-900 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-library-700 disabled:opacity-60"
          >
            {carregando ? "Enviando…" : "Receber link de acesso"}
          </button>
        </form>
      )}
    </main>
  );
}
