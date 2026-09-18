import { z } from "zod";
import { documentoIdSchema } from "./documento";

export const estantePostSchema = z.object({
  id: documentoIdSchema,
});

export const progressoPutSchema = z.object({
  documento: documentoIdSchema,
  pagina: z.number().int().min(1).max(10000),
  total: z.number().int().min(1).max(10000).nullish(),
});

export const progressoGetSchema = z.object({
  documento: documentoIdSchema,
});
