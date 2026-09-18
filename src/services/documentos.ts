import type { Documento } from "@/types";
import { arxivProvider } from "./search/arxiv";
import { doajProvider } from "./search/doaj";
import { openalexProvider } from "./search/openalex";
import type { SearchProvider, SearchProviderId } from "./search/types";

const providers: Record<SearchProviderId, SearchProvider> = {
  openalex: openalexProvider,
  arxiv: arxivProvider,
  doaj: doajProvider,
};

const ID_DOCUMENTO = /^(openalex|arxiv|doaj)_(.+)$/;

export async function buscarDocumentoPorId(id: string): Promise<Documento | null> {
  const match = ID_DOCUMENTO.exec(id);
  if (!match) return null;
  const fonte = match[1] as SearchProviderId;
  const externalId = match[2];
  const provider = providers[fonte];
  if (!provider || !externalId) return null;
  try {
    return await provider.buscarPorId(externalId);
  } catch (error) {
    console.warn(
      `[documento] provider ${fonte} falhou para ${id}:`,
      error instanceof Error ? error.message : error,
    );
    return null;
  }
}