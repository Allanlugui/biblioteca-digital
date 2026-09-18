"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { criarClienteNavegador } from "@/lib/supabase/cliente";
import { cadastroSchema, loginSchema } from "@/schemas/auth";

const CONFIGURADO = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "") !== "";

function mensagemErroSupabase(codigo: string | undefined): string {
  if (codigo === "invalid_credentials") return "E-mail ou senha incorretos.";
  if (codigo === "email_not_confirmed") return "Confirme seu e-mail antes de entrar.";
  if (codigo === "user_already_exists") return "Este e-mail já tem conta. Entre em vez disso.";
  if (codigo === "weak_password") return "Escolha uma senha mais forte.";
  return "Não foi possível concluir. Tente de novo.";
}

export default function EntrarPage() {
  const router = useRouter();
  const [aba, setAba] = useState<"entrar" | "criar">("entrar");
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [emailLink, setEmailLink] = useState("");
  const [erro, setErro] = useState("");
  const [info, setInfo] = useState("");
  const [carregando, setCarregando] = useState(false);

  async function entrar(evento: React.FormEvent) {
    evento.preventDefault();
    setErro("");
    setInfo("");
    const parsed = loginSchema.safeParse({ email, senha });
    if (!parsed.success) {
      setErro(parsed.error.issues[0]?.message ?? "Verifique os campos.");
      return;
    }
    setCarregando(true);
    try {
      const supabase = criarClienteNavegador();
      const { error } = await supabase.auth.signInWithPassword({ email: parsed.data.email, password: parsed.data.senha });
      if (error) {
        setErro(mensagemErroSupabase((error as { code?: string }).code));
        return;
      }
      router.push("/estante");
      router.refresh();
    } finally {
      setCarregando(false);
    }
  }

  async function criarConta(evento: React.FormEvent) {
    evento.preventDefault();
    setErro("");
    setInfo("");
    const parsed = cadastroSchema.safeParse({ nome, email, senha, confirmar });
    if (!parsed.success) {
      setErro(parsed.error.issues[0]?.message ?? "Verifique os campos.");
      return;
    }
    setCarregando(true);
    try {
      const supabase = criarClienteNavegador();
      const { error } = await supabase.auth.signUp({
        email: parsed.data.email,
        password: parsed.data.senha,
        options: { data: { nome: parsed.data.nome }, emailRedirectTo: `${window.location.origin}/auth/callback` },
      });
      if (error) {
        setErro(mensagemErroSupabase((error as { code?: string }).code));
        return;
      }
      setInfo("Conta criada! Se pedirmos confirmação, verifique seu e-mail antes de entrar.");
      setAba("entrar");
    } finally {
      setCarregando(false);
    }
  }

  async function enviarLink(evento: React.FormEvent) {
    evento.preventDefault();
    setErro("");
    setInfo("");
    if (!emailLink.trim()) {
      setErro("Informe o e-mail para receber o link.");
      return;
    }
    setCarregando(true);
    try {
      const supabase = criarClienteNavegador();
      const { error } = await supabase.auth.signInWithOtp({
        email: emailLink.trim(),
        options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
      });
      if (error) throw error;
      setInfo(`Link enviado para ${emailLink.trim()}. Ele vale por pouco tempo.`);
    } catch {
      setErro("Não foi possível enviar o link. Tente de novo.");
    } finally {
      setCarregando(false);
    }
  }

  const campo = "w-full rounded-md border border-rule bg-parchment px-4 py-3 outline-none placeholder:text-ink-soft/70 focus-visible:border-library-700 focus-visible:ring-2 focus-visible:ring-library-700/40";

  return (
    <main id="conteudo" className="mx-auto w-full max-w-xl flex-1 px-6 py-14">
      <p className="text-xs font-semibold uppercase tracking-[0.32em] text-gilt-700">Conta da biblioteca</p>
      <h1 className="mt-3 font-display text-4xl tracking-tight">Entrar</h1>
      {!CONFIGURADO ? (
        <p role="alert" className="mt-6 rounded-md border border-gilt-600/60 bg-vellum p-5 text-ink-soft">
          O login ainda não está configurado neste ambiente. Navegar e ler continua livre para todos.
        </p>
      ) : (
        <>
          <div className="mt-6 flex gap-2" role="tablist" aria-label="Entrar ou criar conta">
            {(["entrar", "criar"] as const).map((a) => (
              <button
                key={a}
                role="tab"
                aria-selected={aba === a}
                onClick={() => {
                  setAba(a);
                  setErro("");
                  setInfo("");
                }}
                className={`rounded-full px-5 py-2 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-library-700 ${
                  aba === a ? "bg-library-800 text-parchment" : "border border-rule bg-vellum text-ink-soft hover:border-library-700"
                }`}
              >
                {a === "entrar" ? "Entrar" : "Criar conta"}
              </button>
            ))}
          </div>

          {aba === "entrar" ? (
            <form onSubmit={entrar} className="mt-4 rounded-md border border-rule bg-vellum p-6 sm:p-8">
              <label htmlFor="email" className="mb-2 block text-sm font-semibold">E-mail</label>
              <input id="email" name="email" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="voce@exemplo.com" className={campo} />
              <label htmlFor="senha" className="mb-2 mt-4 block text-sm font-semibold">Senha</label>
              <input id="senha" name="password" type="password" required autoComplete="current-password" value={senha} onChange={(e) => setSenha(e.target.value)} placeholder="Sua senha" className={campo} />
              {erro && <p role="alert" className="mt-3 text-sm font-medium text-red-800">{erro}</p>}
              {info && <p role="status" className="mt-3 text-sm font-medium text-library-800">{info}</p>}
              <button type="submit" disabled={carregando} className="mt-5 w-full rounded-md bg-library-800 px-6 py-3 font-semibold text-parchment hover:bg-library-900 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-library-700 disabled:opacity-60">
                {carregando ? "Entrando…" : "Entrar"}
              </button>
              <p className="mt-4 text-center text-sm">
                <Link href="/recuperar" className="font-semibold text-library-800 underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-library-700">
                  Esqueci minha senha
                </Link>
              </p>
            </form>
          ) : (
            <form onSubmit={criarConta} className="mt-4 rounded-md border border-rule bg-vellum p-6 sm:p-8">
              <label htmlFor="nome" className="mb-2 block text-sm font-semibold">Nome</label>
              <input id="nome" name="name" type="text" required autoComplete="name" maxLength={80} value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Seu nome" className={campo} />
              <label htmlFor="email-criar" className="mb-2 mt-4 block text-sm font-semibold">E-mail</label>
              <input id="email-criar" name="email" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="voce@exemplo.com" className={campo} />
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="senha-criar" className="mb-2 mt-4 block text-sm font-semibold">Senha</label>
                  <input id="senha-criar" name="new-password" type="password" required autoComplete="new-password" value={senha} onChange={(e) => setSenha(e.target.value)} placeholder="Mínimo 6 caracteres" className={campo} />
                </div>
                <div>
                  <label htmlFor="confirmar" className="mb-2 mt-4 block text-sm font-semibold">Confirmar senha</label>
                  <input id="confirmar" name="confirm-password" type="password" required autoComplete="new-password" value={confirmar} onChange={(e) => setConfirmar(e.target.value)} placeholder="Repita a senha" className={campo} />
                </div>
              </div>
              {erro && <p role="alert" className="mt-3 text-sm font-medium text-red-800">{erro}</p>}
              {info && <p role="status" className="mt-3 text-sm font-medium text-library-800">{info}</p>}
              <button type="submit" disabled={carregando} className="mt-5 w-full rounded-md bg-library-800 px-6 py-3 font-semibold text-parchment hover:bg-library-900 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-library-700 disabled:opacity-60">
                {carregando ? "Criando…" : "Criar conta"}
              </button>
            </form>
          )}

          <details className="mt-6 rounded-md border border-rule bg-vellum p-5">
            <summary className="cursor-pointer text-sm font-semibold text-library-800 underline-offset-4 hover:underline">
              Prefere entrar por link de acesso?
            </summary>
            <form onSubmit={enviarLink} className="mt-4">
              <label htmlFor="email-link" className="mb-2 block text-sm font-semibold">E-mail</label>
              <input id="email-link" type="email" required value={emailLink} onChange={(e) => setEmailLink(e.target.value)} placeholder="voce@exemplo.com" className={campo} />
              <button type="submit" disabled={carregando} className="mt-3 w-full rounded-md border-2 border-library-800 px-6 py-2.5 text-sm font-semibold text-library-800 hover:bg-library-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-library-700 disabled:opacity-60">
                {carregando ? "Enviando…" : "Receber link de acesso"}
              </button>
            </form>
          </details>
        </>
      )}
    </main>
  );
}
