export function LoadingState() {
  return (
    <div role="status" className="rounded-md border border-rule bg-vellum p-8">
      <p className="font-display text-xl">Consultando as fontes…</p>
      <p className="mt-2 text-sm text-ink-soft">Isso pode levar alguns segundos.</p>
      <div aria-hidden="true" className="mt-6 space-y-3 motion-safe:animate-pulse">
        <div className="h-4 w-3/4 rounded bg-rule" />
        <div className="h-4 w-1/2 rounded bg-rule" />
        <div className="h-4 w-2/3 rounded bg-rule" />
      </div>
    </div>
  );
}

export function EmptyState({ titulo, mensagem }: { titulo: string; mensagem: string }) {
  return (
    <section className="rounded-md border border-dashed border-gilt-600/60 bg-vellum p-8 text-center sm:p-10">
      <p aria-hidden="true" className="font-display text-3xl text-gilt-600">❦</p>
      <h2 className="mt-3 font-display text-2xl">{titulo}</h2>
      <p className="mx-auto mt-3 max-w-xl text-ink-soft">{mensagem}</p>
    </section>
  );
}

export function ErrorState({ mensagem, tentarNovamente }: { mensagem: string; tentarNovamente: () => void }) {
  return (
    <section role="alert" className="rounded-md border border-red-300 bg-[#fdf3ef] p-8">
      <h2 className="font-display text-2xl text-red-900">Não foi possível concluir a consulta</h2>
      <p className="mt-3 text-red-800">{mensagem}</p>
      <button onClick={tentarNovamente} className="mt-5 rounded-md bg-library-800 px-5 py-3 font-semibold text-parchment hover:bg-library-900 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-library-700">
        Tentar novamente
      </button>
    </section>
  );
}
