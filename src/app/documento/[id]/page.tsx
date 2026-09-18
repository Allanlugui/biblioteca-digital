import type { Metadata } from "next";
import Link from "next/link";
import { DocumentoClient } from "@/components/documento-client";

export const metadata: Metadata = { title: "Documento | Biblioteca Digital" };

export default async function DocumentoPage({ params }: PageProps<"/documento/[id]">) {
  const { id } = await params;
  return (
    <main id="conteudo" className="mx-auto w-full max-w-4xl flex-1 px-6 py-12">
      <Link prefetch={false} href="/busca" className="text-sm font-semibold text-teal-700 underline-offset-4 hover:underline dark:text-teal-400">
        ← Voltar para a busca
      </Link>
      <DocumentoClient key={id} id={id} />
    </main>
  );
}
