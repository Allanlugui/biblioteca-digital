import type { NextRequest } from "next/server";
import { API_ERROR_CODES, fail, formatZodErrors } from "@/lib/api";
import { fetchPdfResiliente, PdfError } from "@/lib/pdf";
import { checkRateLimit, getClientIp, rateLimitHeaders } from "@/lib/rate-limit";
import { assertPublicHttpsUrl, UrlGuardError } from "@/lib/url-guard";
import { proxyQuerySchema } from "@/schemas";

export const dynamic = "force-dynamic";

const PARAMS_PERMITIDOS = ["url"];

export async function GET(request: NextRequest) {
  const ip = getClientIp(request);
  const rateLimit = checkRateLimit(`${ip}|/api/proxy`);
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
      "Parâmetros não suportados no proxy.",
      400,
      undefined,
      headers,
    );
  }

  const parsed = proxyQuerySchema.safeParse({ url: url.searchParams.get("url") });
  if (!parsed.success) {
    return fail(
      API_ERROR_CODES.VALIDATION_ERROR,
      "A URL informada é inválida.",
      400,
      formatZodErrors(parsed.error),
      headers,
    );
  }

  let target;
  try {
    target = await assertPublicHttpsUrl(parsed.data.url);
  } catch (error) {
    if (error instanceof UrlGuardError) {
      const statusByCode: Record<string, number> = {
        INVALID_URL: 400,
        DESTINATION_BLOCKED: 403,
        RESOLUTION_FAILED: 502,
      };
      return fail(
        error.code,
        error.message,
        statusByCode[error.code] ?? 400,
        undefined,
        headers,
      );
    }
    return fail(
      API_ERROR_CODES.INTERNAL_ERROR,
      "Falha interna ao verificar o destino.",
      500,
      undefined,
      headers,
    );
  }

  let pdf;
  try {
    pdf = await fetchPdfResiliente(target.url.toString());
  } catch (error) {
    if (error instanceof PdfError) {
      const mapped = error.toFail();
      return fail(mapped.code, mapped.message, mapped.status, undefined, headers);
    }
    return fail(
      API_ERROR_CODES.INTERNAL_ERROR,
      "Falha interna no proxy.",
      500,
      undefined,
      headers,
    );
  }

  const responseHeaders: Record<string, string> = {
    "Content-Type": pdf.contentType,
    "Content-Disposition": `inline; filename="${pdf.filename}"`,
    "X-Content-Type-Options": "nosniff",
    "Cache-Control": "private, max-age=60",
    ...headers,
  };
  if (pdf.contentLength !== null) {
    responseHeaders["Content-Length"] = String(pdf.contentLength);
  }

  return new Response(pdf.body, { status: 200, headers: responseHeaders });
}