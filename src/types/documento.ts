export type Fonte =
  | "openalex"
  | "arxiv"
  | "doaj"
  | "google-books"
  | "semantic-scholar";

export type Documento = {
  id: string;
  titulo: string;
  autores: string[];
  fonte: Fonte;
  urlPdf: string | null;
  urlPagina: string | null;
  descricao: string | null;
  dataPublicacao: string | null;
  tamanhoBytes: number | null;
};