import { z } from "zod";

export const documentoRespostaSchema = z.object({
  id: z.string(),
  titulo: z.string(),
  autores: z.array(z.string()),
  fonte: z.enum(["openalex", "arxiv", "doaj", "google-books", "semantic-scholar"]),
  urlPdf: z.string().nullable(),
  urlPagina: z.string().nullable(),
  descricao: z.string().nullable(),
  dataPublicacao: z.string().nullable(),
  tamanhoBytes: z.number().nullable(),
});

export const buscaRespostaSchema = z.object({
  consulta: z.string(),
  total: z.number().int().nonnegative(),
  documentos: z.array(documentoRespostaSchema),
});
