export function LoadingState() {
  return <div role="status" className="rounded-2xl border border-zinc-200 p-8 dark:border-zinc-800"><p className="font-medium">Consultando as fontes…</p><p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">Isso pode levar alguns segundos.</p><div aria-hidden="true" className="mt-6 space-y-3 motion-safe:animate-pulse"><div className="h-4 w-3/4 rounded bg-zinc-200 dark:bg-zinc-800" /><div className="h-4 w-1/2 rounded bg-zinc-200 dark:bg-zinc-800" /></div></div>;
}

export function EmptyState({ titulo, mensagem }: { titulo: string; mensagem: string }) {
  return <section className="rounded-2xl border border-dashed border-zinc-300 p-8 dark:border-zinc-700"><h2 className="text-xl font-semibold">{titulo}</h2><p className="mt-3 text-zinc-600 dark:text-zinc-400">{mensagem}</p></section>;
}

export function ErrorState({ mensagem, tentarNovamente }: { mensagem: string; tentarNovamente: () => void }) {
  return <section role="alert" className="rounded-2xl border border-red-300 p-8 dark:border-red-900"><h2 className="text-xl font-semibold">Não foi possível concluir a consulta</h2><p className="mt-3">{mensagem}</p><button onClick={tentarNovamente} className="mt-5 rounded-lg bg-teal-700 px-5 py-3 font-semibold text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-teal-600">Tentar novamente</button></section>;
}
