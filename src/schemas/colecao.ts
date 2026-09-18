import { z } from "zod";
import { documentoIdSchema } from "./documento";

export const colecaoIdSchema = z.string().uuid("Identificador de coleção inválido.");

export const colecaoPostSchema = z.object({
  nome: z.string().trim().min(1, "Dê um nome à coleção.").max(80, "Nome com no máximo 80 caracteres."),
});

export const colecaoItemPostSchema = z.object({
  documento: documentoIdSchema,
});
