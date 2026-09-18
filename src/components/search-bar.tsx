type SearchBarProps = {
  defaultValue?: string;
};

export function SearchBar({ defaultValue = "" }: SearchBarProps) {
  return (
    <form action="/busca" method="get" role="search" className="w-full">
      <label htmlFor="consulta" className="mb-2 block text-sm font-medium">
        Título, autor ou assunto
      </label>
      <div className="flex flex-col gap-3 sm:flex-row">
        <input
          id="consulta"
          name="q"
          type="search"
          defaultValue={defaultValue}
          required
          minLength={2}
          maxLength={200}
          placeholder="Ex.: computação quântica"
          className="min-w-0 flex-1 rounded-xl border border-zinc-300 bg-white px-4 py-3 text-zinc-950 outline-none focus-visible:ring-2 focus-visible:ring-teal-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
        />
        <button
          type="submit"
          className="rounded-xl bg-teal-700 px-6 py-3 font-semibold text-white hover:bg-teal-800 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-teal-600"
        >
          Buscar documentos
        </button>
      </div>
    </form>
  );
}
