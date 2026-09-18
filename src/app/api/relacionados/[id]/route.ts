import type { NextRequest } from "next/server";
import { API_ERROR_CODES, fail, formatZodErrors, ok } from "@/lib/api";
import { checkRateLimit, getClientIp, rateLimitHeaders } from "@/lib/rate-limit";
import { documentoIdSchema } from "@/schemas";
import { buscarRelacionados } from "@/services/relacionados";

export const dynamic = "force-dynamic";

// GET /api/relacionados/[id] → até 6 trabalhos semelhantes (ou 404).
export async function GET(_request: NextRequest, context: RouteContext<"/api/relacionados/[id]">) {
  const ip = getClientIp(_request);
  const rateLimit = checkRateLimit(`${ip}|/api/relacionados`);
  const headers = rateLimitHeaders(rateLimit);
  if (!rateLimit.allowed) {
    return fail(
      API_ERROR_CODES.RATE_LIMIT_EXCEEDED,
      "Muitas requisições. Tente novamente em instantes.",
      429,
      undefined,
      headers,
    );
  }
  const { id } = await context.params;
  const parsed = documentoIdSchema.safeParse(id);
  if (!parsed.success) {
    return fail(API_ERROR_CODES.VALIDATION_ERROR, "Identificador inválido.", 400, formatZodErrors(parsed.error), headers);
  }
  const relacionados = await buscarRelacionados(parsed.data).catch(() => null);
  if (relacionados === null) {
    return fail(API_ERROR_CODES.NOT_FOUND, "Documento não encontrado.", 404, undefined, headers);
  }
  return ok(relacionados, headers);
}
