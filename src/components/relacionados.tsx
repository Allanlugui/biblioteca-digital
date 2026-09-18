"use client";

import Link from "next/link";
import { z } from "zod";
import { documentoRespostaSchema } from "@/schemas/respostas";
import { formatarData, nomesFontes } from "@/lib/apresentacao";
import { useApi } from "./use-api";

const listaSchema = z.array(documentoRespostaSchema);

export function Relacionados({ id }: { id: string }) {
  const { estado } = useApi(`/api/relacionados/${encodeURIComponent(id)}`, listaSchema);

  if (estado.status === "loading") {
    return (
      <section aria-label="Trabalhos relacionados" className="mt-8 border-t border-rule pt-6">
        <h2 className="font-display text-2xl">Trabalhos relacionados</h2>
        <div role="status" aria-hidden="true" className="mt-4 grid gap-4 motion-safe:animate-pulse md:grid-cols-2">
          <div className="h-24 rounded-md bg-rule" />
          <div className="h-24 rounded-md bg-rule" />
        </div>
      </section>
    );
  }
  if (estado.status === "error" || estado.data.length === 0) return null;

  return (
    <section aria-label="Trabalhos relacionados" className="mt-8 border-t border-rule pt-6">
      <h2 className="font-display text-2xl">Trabalhos relacionados</h2>
      <ul className="mt-4 grid gap-4 md:grid-cols-2">
        {estado.data.map((doc) => (
          <li key={doc.id} className="rounded-md border border-rule bg-parchment p-4">
            <span className="rounded-sm bg-library-900 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-parchment">{nomesFontes[doc.fonte]}</span>
            <Link prefetch={false} href={`/documento/${encodeURIComponent(doc.id)}`} className="mt-2 block font-display text-lg leading-snug hover:text-library-700 hover:underline focus-visible:outline-2 focus-visible:outline-library-700">
              {doc.titulo}
            </Link>
            <p className="mt-1 text-xs text-ink-soft">
              {doc.autores.slice(0, 3).join(", ") || "Autoria não informada"} · {formatarData(doc.dataPublicacao)}
              {typeof doc.citacoes === "number" ? ` · ${doc.citacoes} citações` : ""}
              {doc.urlPdf ? " · PDF" : ""}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}
