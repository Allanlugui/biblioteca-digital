import Link from "next/link";

export default function NotFound() {
  return (
    <main id="conteudo" className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center px-6 py-20 text-center sm:py-28">
      <p className="text-xs font-semibold uppercase tracking-[0.32em] text-gilt-700">
        Erro 404
      </p>
      <p aria-hidden="true" className="mt-4 font-display text-5xl text-gilt-600">❦</p>
      <h1 className="mt-4 font-display text-4xl tracking-tight sm:text-5xl">
        Esta página saiu da estante.
      </h1>
      <p className="mt-5 max-w-xl leading-7 text-ink-soft">
        O endereço procurado não existe ou foi removido. Volte ao início ou
        consulte o acervo para encontrar o que procura.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-4">
        <Link
          href="/"
          className="rounded-md bg-library-800 px-6 py-3 font-semibold text-parchment hover:bg-library-900 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-library-700"
        >
          Voltar ao início
        </Link>
        <Link
          prefetch={false}
          href="/busca"
          className="rounded-md border-2 border-library-800 px-6 py-3 font-semibold text-library-800 hover:bg-library-50 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-library-700"
        >
          Buscar no acervo
        </Link>
      </div>
    </main>
  );
}
