export type Fonte =
  | "openalex"
  | "arxiv"
  | "doaj"
  | "google-books"
  | "semantic-scholar"
  | "web";

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
  // Metadados enriquecidos (Bloco A): só o que a fonte informa; ausentes viram null/[].
  doi: string | null;
  citacoes: number | null;
  assuntos: string[];
  idioma: string | null;
  tipo: string | null;
  // Bloco C: identificadores para dedup e agrupamento de fontes.
  arxivId: string | null;
  disponivelEm: { fonte: Fonte; id: string }[];
};