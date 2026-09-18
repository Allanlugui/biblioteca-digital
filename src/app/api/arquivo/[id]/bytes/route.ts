import type { NextRequest } from "next/server";
import { API_ERROR_CODES, fail, formatZodErrors } from "@/lib/api";
import { selecionarBackend } from "@/lib/armazenamento/indice";
import { checkRateLimit, getClientIp, rateLimitHeaders } from "@/lib/rate-limit";
import { criarClienteAdmin } from "@/lib/supabase/admin";
import { documentoIdSchema } from "@/schemas";

export const dynamic = "force-dynamic";

// GET /api/arquivo/[id]/bytes → o PDF guardado (Drive ou Supabase),
// com o mesmo guard de tamanho do proxy. Usado quando não há URL pública.
export async function GET(request: NextRequest, context: RouteContext<"/api/arquivo/[id]/bytes">) {
  const ip = getClientIp(request);
  const rateLimit = checkRateLimit(`${ip}|/api/arquivo`);
  const headers = rateLimitHeaders(rateLimit);
  if (!rateLimit.allowed) {
    return fail(API_ERROR_CODES.RATE_LIMIT_EXCEEDED, "Muitas requisições. Tente novamente em instantes.", 429, undefined, headers);
  }

  const { id } = await context.params;
  const parsed = documentoIdSchema.safeParse(id);
  if (!parsed.success) {
    return fail(API_ERROR_CODES.VALIDATION_ERROR, "Identificador inválido.", 400, formatZodErrors(parsed.error), headers);
  }

  const admin = criarClienteAdmin();
  if (!admin) {
    return fail(API_ERROR_CODES.ACERVO_INDISPONIVEL, "Acervo indisponível no momento.", 503, undefined, headers);
  }
  const linha = await admin.from("documentos").select("storage_path, tamanho_bytes").eq("id", parsed.data).maybeSingle();
  const path = !linha.error ? (linha.data?.storage_path as string | undefined) : undefined;
  if (!path) {
    return fail(API_ERROR_CODES.NOT_FOUND, "Arquivo ainda não arquivado.", 404, undefined, headers);
  }

  const arquivo = await selecionarBackend().baixar(path).catch(() => null);
  if (!arquivo) {
    return fail(API_ERROR_CODES.ACERVO_INDISPONIVEL, "Acervo indisponível no momento.", 503, undefined, headers);
  }
  return new Response(arquivo.bytes, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Length": String(arquivo.bytes.byteLength),
      "Content-Disposition": "inline",
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "private, max-age=60",
      ...headers,
    },
  });
}
