import type { Documento, Fonte } from "@/types";

export type SearchProviderId = Extract<Fonte, "openalex" | "arxiv" | "doaj" | "semantic-scholar" | "web" | "gutenberg">;

export interface SearchProvider {
  readonly fonte: SearchProviderId;
  buscar(termo: string, limite: number, signal?: AbortSignal, opcoes?: OpcoesBusca): Promise<Documento[]>;
  buscarPorId(externalId: string, signal?: AbortSignal): Promise<Documento | null>;
}

export type OpcoesBusca = {
  // Deslocamento (0-based) para paginação; cada fonte traduz para seu dialeto.
  inicio?: number;
};