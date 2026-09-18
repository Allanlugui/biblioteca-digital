import type { Documento, Fonte } from "@/types";

export type SearchProviderId = Extract<Fonte, "openalex" | "arxiv" | "doaj" | "semantic-scholar">;

export interface SearchProvider {
  readonly fonte: SearchProviderId;
  buscar(termo: string, limite: number, signal?: AbortSignal): Promise<Documento[]>;
  buscarPorId(externalId: string, signal?: AbortSignal): Promise<Documento | null>;
}