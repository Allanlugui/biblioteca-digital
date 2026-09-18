import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="bg-library-950 text-parchment/80">
      <div className="mx-auto grid w-full max-w-6xl gap-10 px-6 py-12 md:grid-cols-3">
        <div>
          <p className="font-display text-lg text-parchment">Biblioteca Digital</p>
          <p className="mt-3 max-w-xs text-sm leading-6">
            Sala de leitura da ciência aberta: busca agregada, download direto e
            leitor integrado, sem sair daqui.
          </p>
        </div>
        <nav aria-label="Navegação do acervo">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-gilt-400">Navegação</p>
          <ul className="mt-4 space-y-2 text-sm font-medium">
            <li>
              <Link href="/" className="rounded hover:text-parchment hover:underline focus-visible:outline-2 focus-visible:outline-gilt-400">
                Início
              </Link>
            </li>
            <li>
              <Link href="/busca" className="rounded hover:text-parchment hover:underline focus-visible:outline-2 focus-visible:outline-gilt-400">
                Buscar no acervo
              </Link>
            </li>
            <li>
              <Link href="/estante" className="rounded hover:text-parchment hover:underline focus-visible:outline-2 focus-visible:outline-gilt-400">
                Minha estante
              </Link>
            </li>
          </ul>
        </nav>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-gilt-400">Sobre o acervo</p>
          <p className="mt-4 text-sm leading-6">
            A disponibilidade de PDF depende de cada fonte. Metadados e arquivos
            pertencem aos seus publicadores de origem.
          </p>
        </div>
      </div>
      <div className="border-t border-white/10">
        <p className="mx-auto w-full max-w-6xl px-6 py-5 text-xs tracking-wide text-parchment/60">
          Biblioteca Digital — conhecimento aberto, mais perto de você.
        </p>
      </div>
    </footer>
  );
}
