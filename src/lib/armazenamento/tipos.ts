// Backend de armazenamento plugável: Supabase Storage ou Google Drive.
// O formato de `storage_path` em `documentos` identifica o driver:
//   "pdfs/<hash>.pdf" (legado Supabase) ou "drive:<fileId>".

export type ArquivoBaixado = {
  bytes: ArrayBuffer;
  contentType: string;
};

export interface BackendArmazenamento {
  readonly nome: "supabase" | "drive";
  // Guarda o arquivo e devolve a referência para `documentos.storage_path`
  // (caminho no Supabase; `drive:<fileId>` no Drive).
  guardar(path: string, bytes: ArrayBuffer, contentType: string): Promise<string>;
  existe(path: string): Promise<boolean>;
  baixar(path: string): Promise<ArquivoBaixado | null>;
  // URL pública direta, quando o driver oferece (Supabase). Sem ela, servir via /bytes.
  urlPublica?(path: string): string | null;
}

export function ehDrivePath(path: string): boolean {
  return path.startsWith("drive:");
}

export function idDoDrivePath(path: string): string | null {
  return ehDrivePath(path) ? path.slice("drive:".length) || null : null;
}

export function nomeParaHash(hashSha256: string): string {
  return `${hashSha256}.pdf`;
}
