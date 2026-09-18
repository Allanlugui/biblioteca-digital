import { z } from "zod";

export const documentoIdSchema = z
  .string()
  .trim()
  .min(1, "O identificador é obrigatório.")
  .max(128, "Identificador inválido.")
  .regex(/^[A-Za-z0-9._-]+$/, "Identificador inválido.");