import type { NextRequest } from "next/server";
import { API_ERROR_CODES, fail, formatZodErrors } from "@/lib/api";
import { fetchPdfResiliente, PdfError } from "@/lib/pdf";
import { checkRateLimit, getClientIp, rateLimitHeaders } from "@/lib/rate-limit";
import { documentoIdSchema } from "@/schemas";
import { buscarDocumentoPorId } from "@/services/documentos";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest, context: RouteContext<"/api/download/[id]">) {
  const ip = getClientIp(request);
  const rateLimit = checkRateLimit(`${ip}|/api/download`);
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
    return fail(
      API_ERROR_CODES.VALIDATION_ERROR,
      "Identificador inválido.",
      400,
      formatZodErrors(parsed.error),
      headers,
    );
  }

  const documento = await buscarDocumentoPorId(parsed.data);
  if (!documento?.urlPdf) {
    return fail(
      API_ERROR_CODES.NOT_FOUND,
      "Documento não encontrado.",
      404,
      undefined,
      headers,
    );
  }

  let pdf;
  try {
    pdf = await fetchPdfResiliente(documento.urlPdf);
  } catch (error) {
    if (error instanceof PdfError) {
      const mapped = error.toFail();
      return fail(mapped.code, mapped.message, mapped.status, undefined, headers);
    }
    return fail(
      API_ERROR_CODES.INTERNAL_ERROR,
      "Falha interna ao baixar o documento.",
      500,
      undefined,
      headers,
    );
  }

  const responseHeaders: Record<string, string> = {
    "Content-Type": "application/pdf",
    "Content-Disposition": `attachment; filename="${pdf.filename}"`,
    "X-Content-Type-Options": "nosniff",
    "Cache-Control": "private, max-age=60",
    ...headers,
  };
  if (pdf.contentLength !== null) {
    responseHeaders["Content-Length"] = String(pdf.contentLength);
  }

  return new Response(pdf.body, { status: 200, headers: responseHeaders });
}