import { z } from "zod";

export const proxyQuerySchema = z.object({
  url: z.url({ message: "A URL informada é inválida." }).max(2048, "A URL informada é longa demais."),
});