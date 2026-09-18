import type { NextRequest } from "next/server";
import { API_ERROR_CODES, fail, formatZodErrors, ok } from "@/lib/api";
import { checkRateLimit, getClientIp, rateLimitHeaders } from "@/lib/rate-limit";
import { buscaQuerySchema } from "@/schemas";
import { executarBusca } from "@/services/search/agregador";
import { registrarBusca } from "@/services/historico";

export const dynamic = "force-dynamic";

const PARAMS_PERMITIDOS = ["q", "limite"];
const LIMITE_PADRAO = 20;

export async function GET(request: NextRequest) {
  const ip = getClientIp(request);
  const rateLimit = checkRateLimit(`${ip}|/api/busca`);
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

  const url = new URL(request.url);
  const parametrosExtras = [...url.searchParams.keys()].filter(
    (parametro) => !PARAMS_PERMITIDOS.includes(parametro),
  );
  if (parametrosExtras.length > 0) {
    return fail(
      API_ERROR_CODES.VALIDATION_ERROR,
      "Parâmetros não suportados na busca.",
      400,
      undefined,
      headers,
    );
  }

  const parsed = buscaQuerySchema.safeParse({
    q: url.searchParams.get("q"),
    limite: url.searchParams.get("limite") ?? undefined,
  });
  if (!parsed.success) {
    return fail(
      API_ERROR_CODES.VALIDATION_ERROR,
      "Parâmetros de busca inválidos.",
      400,
      formatZodErrors(parsed.error),
      headers,
    );
  }

  const resultado = await executarBusca(parsed.data.q, parsed.data.limite ?? LIMITE_PADRAO);
  await registrarBusca(resultado.consulta, resultado.total);
  return ok(resultado, headers);
}