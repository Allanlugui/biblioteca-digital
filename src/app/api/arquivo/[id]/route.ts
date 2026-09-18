import { createHash } from "node:crypto";
import type { NextRequest } from "next/server";
import { API_ERROR_CODES, fail, ok, formatZodErrors } from "@/lib/api";
import { fetchPdf, PdfError } from "@/lib/pdf";
import { checkRateLimit, getClientIp, rateLimitHeaders } from "@/lib/rate-limit";
import { criarClienteAdmin } from "@/lib/supabase/admin";
import { assertPublicHttpsUrl, UrlGuardError } from "@/lib/url-guard";
import { documentoIdSchema } from "@/schemas";
import { buscarDocumentoPorId } from "@/services/documentos";

export const dynamic = "force-dynamic";

const BUCKET = "pdfs";

function urlPublica(supabase: NonNullable<ReturnType<typeof criarClienteAdmin>>, path: string): string {
  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}

// Toda ida ao Acervo tem prazo: se ele não responde, o cliente usa o proxy direto.
async function comTimeout<T>(promessa: Promise<T> | PromiseLike<T>, ms: number): Promise<T | null> {
  return Promise.race([Promise.resolve(promessa), new Promise<null>((resolve) => setTimeout(() => resolve(null), ms))]);
}

// Garante o PDF no acervo universal: serve do Storage quando já existe,
// senão baixa da origem (validada), arquiva por hash e registra.
export async function GET(request: NextRequest, context: RouteContext<"/api/arquivo/[id]">) {
  const ip = getClientIp(request);
  const rateLimit = checkRateLimit(`${ip}|/api/arquivo`);
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

  const admin = criarClienteAdmin();
  if (!admin) {
    return fail(
      API_ERROR_CODES.INTERNAL_ERROR,
      "Acervo indisponível: Supabase não configurado.",
      503,
      undefined,
      headers,
    );
  }

  const linha = await comTimeout(
    admin.from("documentos").select("*").eq("id", parsed.data).maybeSingle(),
    10_000,
  );
  const arquivado = linha && !linha.error ? linha.data : null;

  // Já arquivado? Serve direto, sem depender da fonte externa.
  if (arquivado?.storage_path) {
    await comTimeout(
      Promise.resolve(
        admin
          .from("documentos")
          .update({ acessos: (arquivado.acessos ?? 0) + 1, ultimo_acesso: new Date().toISOString() })
          .eq("id", parsed.data),
      ),
      10_000,
    );
    return ok({ url: urlPublica(admin, arquivado.storage_path) }, headers);
  }

  // Origem do PDF: a linha do acervo (quando existe) ou a fonte externa.
  let urlPdf: string | null = typeof arquivado?.url_origem === "string" && arquivado.url_origem ? arquivado.url_origem : null;
  let documento: { fonte: string; titulo: string; autores: string[]; descricao: string | null; dataPublicacao: string | null; urlPdf: string; urlPagina: string | null } | null = null;
  if (!urlPdf) {
    try {
      const daFonte = await buscarDocumentoPorId(parsed.data);
      if (daFonte?.urlPdf) {
        documento = { fonte: daFonte.fonte, titulo: daFonte.titulo, autores: daFonte.autores, descricao: daFonte.descricao, dataPublicacao: daFonte.dataPublicacao, urlPdf: daFonte.urlPdf, urlPagina: daFonte.urlPagina };
        urlPdf = daFonte.urlPdf;
      }
    } catch {
      // Fonte indisponível: 404 honesto abaixo.
    }
  }
  if (!urlPdf) {
    return fail(API_ERROR_CODES.NOT_FOUND, "Documento não encontrado.", 404, undefined, headers);
  }

  let alvo: string;
  try {
    alvo = (await assertPublicHttpsUrl(urlPdf)).url.toString();
  } catch (error) {
    if (error instanceof UrlGuardError) {
      const statusByCode: Record<string, number> = {
        INVALID_URL: 400,
        DESTINATION_BLOCKED: 403,
        RESOLUTION_FAILED: 502,
      };
      return fail(error.code, error.message, statusByCode[error.code] ?? 400, undefined, headers);
    }
    return fail(API_ERROR_CODES.INTERNAL_ERROR, "Falha interna ao verificar o destino.", 500, undefined, headers);
  }

  let bytes: ArrayBuffer;
  try {
    const pdf = await fetchPdf(alvo);
    bytes = await new Response(pdf.body).arrayBuffer();
  } catch (error) {
    if (error instanceof PdfError) {
      const mapped = error.toFail();
      return fail(mapped.code, mapped.message, mapped.status, undefined, headers);
    }
    return fail(API_ERROR_CODES.INTERNAL_ERROR, "Falha interna no arquivamento.", 500, undefined, headers);
  }

  const sha256 = createHash("sha256").update(Buffer.from(bytes)).digest("hex");
  const path = `${sha256}.pdf`;

  // Dedup entre fontes: mesmo arquivo já arquivado sob outro id.
  const mesmoArquivo = await comTimeout(
    admin.from("documentos").select("storage_path").eq("sha256", sha256).maybeSingle(),
    10_000,
  );
  const storagePath: string | null = mesmoArquivo && !mesmoArquivo.error ? (mesmoArquivo.data?.storage_path ?? null) : null;
  if (mesmoArquivo === null) {
    return fail(API_ERROR_CODES.ACERVO_INDISPONIVEL, "Acervo indisponível no momento.", 503, undefined, headers);
  }
  if (!storagePath) {
    const upload = await comTimeout(
      admin.storage.from(BUCKET).upload(path, bytes, {
        contentType: "application/pdf",
        upsert: true,
      }),
      25_000,
    );
    if (!upload || upload.error) {
      return fail(API_ERROR_CODES.ACERVO_INDISPONIVEL, "Acervo indisponível no momento.", 503, undefined, headers);
    }
  }

  const gravado = await comTimeout(
    Promise.resolve(
      admin.from("documentos").upsert(
        {
          id: parsed.data,
          fonte: documento?.fonte ?? arquivado?.fonte ?? parsed.data.split("_")[0] ?? "openalex",
          titulo: documento?.titulo ?? arquivado?.titulo ?? parsed.data,
          autores: documento?.autores ?? arquivado?.autores ?? [],
          descricao: documento?.descricao ?? arquivado?.descricao ?? null,
          data_publicacao: documento?.dataPublicacao ?? arquivado?.data_publicacao ?? null,
          url_origem: urlPdf,
          url_pagina: documento?.urlPagina ?? arquivado?.url_pagina ?? null,
          storage_path: storagePath ?? path,
          sha256,
          tamanho_bytes: bytes.byteLength,
          acessos: 1,
          ultimo_acesso: new Date().toISOString(),
        },
        { onConflict: "id" },
      ),
    ),
    10_000,
  );
  if (!gravado || gravado.error) {
    return fail(API_ERROR_CODES.ACERVO_INDISPONIVEL, "Acervo indisponível no momento.", 503, undefined, headers);
  }

  return ok({ url: urlPublica(admin, storagePath ?? path) }, headers);
}
