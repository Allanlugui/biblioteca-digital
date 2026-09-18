import type { Metadata } from "next";
import Link from "next/link";
import { DocumentoClient } from "@/components/documento-client";
import { buscaQuerySchema } from "@/schemas/busca";

export const metadata: Metadata = { title: "Documento | Biblioteca Digital" };

export default async function DocumentoPage({ params, searchParams }: PageProps<"/documento/[id]">) {
  const { id } = await params;
  const query = (await searchParams).de;
  const origem = typeof query === "string" ? buscaQuerySchema.safeParse({ q: query }).data?.q : undefined;
  const voltar = origem ? `/busca?q=${encodeURIComponent(origem)}` : "/busca";
  return (
    <main id="conteudo" className="mx-auto w-full max-w-4xl flex-1 px-6 py-10 sm:py-14">
      <Link prefetch={false} href={voltar} className="inline-flex items-center gap-2 text-sm font-semibold text-library-800 underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-library-700">
        <span aria-hidden="true">←</span> {origem ? "Voltar aos resultados" : "Voltar para a busca"}
      </Link>
      <DocumentoClient key={id} id={id} />
    </main>
  );
}
