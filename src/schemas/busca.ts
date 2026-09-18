import { z } from "zod";

export const buscaQuerySchema = z.object({
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
});

export type BuscaQuery = z.infer<typeof buscaQuerySchema>;