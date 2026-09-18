import type { NextRequest } from "next/server";
import { API_ERROR_CODES, fail, formatZodErrors, ok } from "@/lib/api";
import { checkRateLimit, getClientIp, rateLimitHeaders } from "@/lib/rate-limit";
import { buscaQuerySchema } from "@/schemas";
import { executarBusca } from "@/services/search/agregador";
import { registrarBusca } from "@/services/historico";

export const dynamic = "force-dynamic";

const PARAMS_PERMITIDOS = ["q", "limite", "pagina", "anoDe", "anoAte", "fonte", "tipo", "soPdf", "ordem"];
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

  const fonte = url.searchParams.getAll("fonte");
  const parsed = buscaQuerySchema.safeParse({
    q: url.searchParams.get("q"),
    limite: url.searchParams.get("limite") ?? undefined,
    pagina: url.searchParams.get("pagina") ?? undefined,
    anoDe: url.searchParams.get("anoDe") ?? undefined,
    anoAte: url.searchParams.get("anoAte") ?? undefined,
    fonte: fonte.length > 0 ? fonte : (url.searchParams.get("fonte") ?? undefined),
    tipo: url.searchParams.get("tipo") ?? undefined,
    soPdf: url.searchParams.get("soPdf") ?? undefined,
    ordem: url.searchParams.get("ordem") ?? undefined,
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

  const porPagina = parsed.data.limite ?? LIMITE_PADRAO;
  const resultado = await executarBusca(parsed.data.q, porPagina, parsed.data.pagina ?? 1, {
    fontes: parsed.data.fonte,
    anoDe: parsed.data.anoDe ? Number.parseInt(parsed.data.anoDe, 10) : undefined,
    anoAte: parsed.data.anoAte ? Number.parseInt(parsed.data.anoAte, 10) : undefined,
    tipo: parsed.data.tipo,
    soPdf: parsed.data.soPdf,
    ordem: parsed.data.ordem,
  });
  await registrarBusca(resultado.consulta, resultado.total);
  return ok(resultado, headers);
}