import { z } from "zod";

export const fontesBusca = ["openalex", "arxiv", "doaj", "semantic-scholar", "web"] as const;
export const ordensBusca = ["relevancia", "recentes", "citados"] as const;
export const tiposDocumento = ["article", "preprint"] as const;

const ANO = /^\d{4}$/;

function paraListaFontes(valor: unknown): unknown {
  if (valor === undefined || valor === null) return undefined;
  const brutos = Array.isArray(valor) ? valor : String(valor).split(",");
  return brutos.map((item) => String(item).trim().toLowerCase());
}

function paraBooleano(valor: unknown): unknown {
  if (valor === undefined || valor === null) return undefined;
  return valor === "true" || valor === "1";
}

export const buscaQuerySchema = z
  .object({
    q: z
      .string()
      .trim()
      .min(2, "O termo de busca deve ter ao menos 2 caracteres.")
      .max(200, "O termo de busca pode ter no máximo 200 caracteres."),
    limite: z.coerce
      .number()
      .int("O limite deve ser um número inteiro.")
      .min(1, "O limite mínimo é 1.")
      .max(50, "O limite máximo é 50.")
      .optional(),
    pagina: z.coerce
      .number()
      .int("A página deve ser um número inteiro.")
      .min(1, "A página mínima é 1.")
      .max(20, "A página máxima é 20.")
      .optional(),
    anoDe: z.string().regex(ANO, "Ano inicial inválido (AAAA).").optional(),
    anoAte: z.string().regex(ANO, "Ano final inválido (AAAA).").optional(),
    fonte: z.preprocess(paraListaFontes, z.array(z.enum(fontesBusca)).optional()),
    tipo: z.enum(tiposDocumento).optional(),
    soPdf: z.preprocess(paraBooleano, z.boolean().optional()),
    ordem: z.enum(ordensBusca).optional(),
  })
  .refine(
    (dados) => !dados.anoDe || !dados.anoAte || dados.anoDe <= dados.anoAte,
    "O ano inicial não pode ser maior que o ano final.",
  );

export type BuscaQuery = z.infer<typeof buscaQuerySchema>;
