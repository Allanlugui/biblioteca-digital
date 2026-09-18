import { z } from "zod";

export const documentoRespostaSchema = z.object({
  id: z.string(),
  titulo: z.string(),
  autores: z.array(z.string()),
  fonte: z.enum(["openalex", "arxiv", "doaj", "google-books", "semantic-scholar", "web"]),
  urlPdf: z.string().nullable(),
  urlPagina: z.string().nullable(),
  descricao: z.string().nullable(),
  dataPublicacao: z.string().nullable(),
  tamanhoBytes: z.number().nullable(),
  doi: z.string().nullable(),
  citacoes: z.number().nullable(),
  assuntos: z.array(z.string()),
  idioma: z.string().nullable(),
  tipo: z.string().nullable(),
});

export const buscaRespostaSchema = z.object({
  consulta: z.string(),
  total: z.number().int().nonnegative(),
  documentos: z.array(documentoRespostaSchema),
  pagina: z.number().int().min(1),
  porPagina: z.number().int().min(1),
  temMais: z.boolean(),
  fontesConsultadas: z.array(z.string()),
  fontesIndisponiveis: z.array(z.string()),
});
