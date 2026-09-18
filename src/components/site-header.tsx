import Link from "next/link";
import { criarClienteServidor, supabaseLeituraConfigurado } from "@/lib/supabase/servidor";

function Marca() {
  return (
    <Link href="/" className="flex items-center gap-3 rounded focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-gilt-400">
      <span aria-hidden="true" className="flex h-10 w-10 items-center justify-center rounded-sm border border-gilt-400/70 bg-library-900">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#d4a72c" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
          <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
        </svg>
      </span>
      <span className="leading-tight">
        <span className="block font-display text-lg tracking-wide text-parchment sm:text-xl">Biblioteca Digital</span>
        <span className="block text-[10px] font-semibold uppercase tracking-[0.28em] text-gilt-400 sm:text-[11px]">Acesso aberto</span>
      </span>
    </Link>
  );
}

async function AreaUsuario() {
  if (!supabaseLeituraConfigurado()) return null;
  const supabase = await criarClienteServidor();
  const { data } = await supabase.auth.getUser();
  if (!data.user) {
    return (
      <Link href="/entrar" className="rounded px-3 py-2 text-parchment/90 hover:bg-white/10 hover:text-parchment focus-visible:outline-2 focus-visible:outline-gilt-400">
        Entrar
      </Link>
    );
  }
  return (
    <>
      <Link href="/estante" className="whitespace-nowrap rounded px-2 py-2 text-parchment/90 hover:bg-white/10 hover:text-parchment focus-visible:outline-2 focus-visible:outline-gilt-400 sm:px-3">
        <span className="sm:hidden">Estante</span>
        <span className="hidden sm:inline">Minha estante</span>
      </Link>
      <form action="/auth/sair" method="post" className="inline">
        <button type="submit" className="rounded px-3 py-2 text-parchment/70 hover:bg-white/10 hover:text-parchment focus-visible:outline-2 focus-visible:outline-gilt-400">
          Sair
        </button>
      </form>
    </>
  );
}

export async function SiteHeader() {
  return (
    <header className="bg-library-950 text-parchment">
      <div aria-hidden="true" className="h-1 bg-gradient-to-r from-gilt-700 via-gilt-400 to-gilt-700" />
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-4 py-4 sm:gap-6 sm:px-6">
        <Marca />
        <nav aria-label="Navegação principal" className="flex shrink-0 items-center gap-1 text-sm font-semibold">
          <Link href="/" className="hidden rounded px-3 py-2 text-parchment/90 hover:bg-white/10 hover:text-parchment focus-visible:outline-2 focus-visible:outline-gilt-400 sm:block">
            Início
          </Link>
          <AreaUsuario />
          <Link href="/busca" className="whitespace-nowrap rounded border border-gilt-400/60 bg-gilt-400/10 px-3 py-2 text-[13px] text-gilt-100 hover:bg-gilt-400/20 focus-visible:outline-2 focus-visible:outline-gilt-400 sm:px-4 sm:text-sm">
            Buscar no acervo
          </Link>
        </nav>
      </div>
    </header>
  );
}
