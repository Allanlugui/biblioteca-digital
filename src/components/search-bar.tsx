type SearchBarProps = {
  defaultValue?: string;
  grande?: boolean;
};

export function SearchBar({ defaultValue = "", grande = false }: SearchBarProps) {
  return (
    <form action="/busca" method="get" role="search" className="w-full">
      <label htmlFor="consulta" className="mb-2 block text-sm font-semibold text-ink">
        Título, autor ou assunto
      </label>
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative min-w-0 flex-1">
          <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink-soft">
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.8-3.8" />
          </svg>
          <input
            id="consulta"
            name="q"
            type="search"
            defaultValue={defaultValue}
            required
            minLength={2}
            maxLength={200}
            placeholder="Ex.: computação quântica"
            className={`w-full min-w-0 rounded-md border border-rule bg-vellum pl-11 pr-4 text-ink shadow-[inset_0_1px_3px_rgba(34,26,16,0.08)] outline-none placeholder:text-ink-soft/70 focus-visible:border-library-700 focus-visible:ring-2 focus-visible:ring-library-700/40 ${grande ? "py-4 text-lg" : "py-3"}`}
          />
        </div>
        <button
          type="submit"
          className={`rounded-md bg-library-800 font-semibold text-parchment shadow-[0_2px_0_rgba(11,36,28,0.9)] hover:bg-library-900 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-library-700 active:translate-y-px active:shadow-none ${grande ? "px-8 py-4 text-lg" : "px-6 py-3"}`}
        >
          Buscar documentos
        </button>
      </div>
    </form>
  );
}
