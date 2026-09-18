import { SearchBar } from "@/components/search-bar";

export default function Home() {
  return (
    <main id="conteudo" className="mx-auto flex w-full max-w-5xl flex-1 flex-col justify-center px-6 py-16 sm:py-24">
      <p className="mb-5 text-sm font-semibold uppercase tracking-widest text-teal-700 dark:text-teal-400">
        Biblioteca Digital
      </p>
      <h1 className="max-w-3xl text-4xl font-semibold leading-tight tracking-tight sm:text-6xl">
        Conhecimento aberto, mais perto de você.
      </h1>
      <p className="mt-6 max-w-2xl text-lg leading-8 text-zinc-600 dark:text-zinc-400">
        Encontre publicações no OpenAlex, arXiv e DOAJ. Consulte os detalhes e
        baixe documentos quando a fonte disponibilizar um PDF.
      </p>
      <div className="mt-10 max-w-3xl">
        <SearchBar />
      </div>
      <section aria-label="Sobre o acervo" className="mt-16 grid gap-6 border-t border-zinc-200 pt-8 sm:grid-cols-3 dark:border-zinc-800">
        <div>
          <h2 className="font-semibold">Três fontes, uma busca</h2>
          <p className="mt-2 text-sm leading-6 text-zinc-600 dark:text-zinc-400">Resultados reunidos de catálogos científicos e repositórios.</p>
        </div>
        <div>
          <h2 className="font-semibold">Transparência na origem</h2>
          <p className="mt-2 text-sm leading-6 text-zinc-600 dark:text-zinc-400">Confira autores, data e a página original de cada publicação.</p>
        </div>
        <div>
          <h2 className="font-semibold">PDF quando disponível</h2>
          <p className="mt-2 text-sm leading-6 text-zinc-600 dark:text-zinc-400">Nem todo registro inclui um arquivo. A disponibilidade depende da fonte.</p>
        </div>
      </section>
    </main>
  );
}
