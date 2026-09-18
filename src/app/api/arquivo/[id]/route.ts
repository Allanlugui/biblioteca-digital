import { createHash } from "node:crypto";
import type { NextRequest } from "next/server";
import { API_ERROR_CODES, fail, ok, formatZodErrors } from "@/lib/api";
import { selecionarBackend } from "@/lib/armazenamento/indice";
import { backendSupabase } from "@/lib/armazenamento/supabase";
import { ehDrivePath, nomeParaHash } from "@/lib/armazenamento/tipos";
import { fetchPdfResiliente, PdfError } from "@/lib/pdf";
import { checkRateLimit, getClientIp, rateLimitHeaders } from "@/lib/rate-limit";
import { criarClienteAdmin } from "@/lib/supabase/admin";
import { assertPublicHttpsUrl, UrlGuardError } from "@/lib/url-guard";
import { documentoIdSchema } from "@/schemas";
import { buscarDocumentoPorId } from "@/services/documentos";

export const dynamic = "force-dynamic";

// Toda ida ao Acervo tem prazo: se ele não responde, o cliente usa o proxy direto.
async function comTimeout<T>(promessa: Promise<T> | PromiseLike<T>, ms: number): Promise<T | null> {
  return Promise.race([Promise.resolve(promessa), new Promise<null>((resolve) => setTimeout(() => resolve(null), ms))]);
}

function urlLeitura(backend: ReturnType<typeof selecionarBackend>, id: string, path: string): string {
  return backend.urlPublica?.(path) ?? `/api/arquivo/${encodeURIComponent(id)}/bytes`;
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
  const backend = selecionarBackend();

  // Já arquivado? Serve direto, sem depender da fonte externa.
  // Caminhos legados do Supabase servem pela URL pública em qualquer modo.
  if (arquivado?.storage_path) {
    const ref = arquivado.storage_path as string;
    if (!ehDrivePath(ref)) {
      await comTimeout(
        Promise.resolve(
          admin
            .from("documentos")
            .update({ acessos: (arquivado.acessos ?? 0) + 1, ultimo_acesso: new Date().toISOString() })
            .eq("id", parsed.data),
        ),
        10_000,
      );
      const publica = backendSupabase().urlPublica?.(ref);
      return ok({ url: publica ?? `/api/arquivo/${encodeURIComponent(parsed.data)}/bytes` }, headers);
    }
    const okExiste = await comTimeout(backend.existe(ref), 10_000);
    if (okExiste) {
      await comTimeout(
        Promise.resolve(
          admin
            .from("documentos")
            .update({ acessos: (arquivado.acessos ?? 0) + 1, ultimo_acesso: new Date().toISOString() })
            .eq("id", parsed.data),
        ),
        10_000,
      );
      return ok({ url: urlLeitura(backend, parsed.data, ref) }, headers);
    }
  }

  // Origem do arquivo: PDF direto ou, sem ele, a página da publicação
  // (a descoberta resolve por dentro). A fonte externa só é consultada
  // quando o acervo não tem nem uma coisa nem outra.
  let urlPdf: string | null = typeof arquivado?.url_origem === "string" && arquivado.url_origem ? arquivado.url_origem : null;
  let urlPagina: string | null = typeof arquivado?.url_pagina === "string" && arquivado.url_pagina ? arquivado.url_pagina : null;
  let documento: {
    fonte: string;
    titulo: string;
    autores: string[];
    descricao: string | null;
    dataPublicacao: string | null;
    urlPdf: string;
    urlPagina: string | null;
    doi: string | null;
    citacoes: number | null;
    assuntos: string[];
    idioma: string | null;
    tipo: string | null;
  } | null = null;
  if (!urlPdf) {
    try {
      const daFonte = await buscarDocumentoPorId(parsed.data);
      if (daFonte?.urlPdf || daFonte?.urlPagina) {
        documento = {
          fonte: daFonte.fonte,
          titulo: daFonte.titulo,
          autores: daFonte.autores,
          descricao: daFonte.descricao,
          dataPublicacao: daFonte.dataPublicacao,
          urlPdf: daFonte.urlPdf ?? "",
          urlPagina: daFonte.urlPagina,
          doi: daFonte.doi,
          citacoes: daFonte.citacoes,
          assuntos: daFonte.assuntos,
          idioma: daFonte.idioma,
          tipo: daFonte.tipo,
        };
        urlPdf = daFonte.urlPdf;
        urlPagina = urlPagina ?? daFonte.urlPagina;
      }
    } catch {
      // Fonte indisponível: 404 honesto abaixo.
    }
  }
  // Sem PDF direto, a página da publicação vira ponto de partida da descoberta.
  const origemCrua = urlPdf ?? urlPagina;
  if (!origemCrua) {
    return fail(API_ERROR_CODES.NOT_FOUND, "Documento não encontrado.", 404, undefined, headers);
  }
  // O guard exige https: promove http da página antes de validar.
  const origem = origemCrua.startsWith("http://") ? `https://${origemCrua.slice("http://".length)}` : origemCrua;

  let alvo: string;
  try {
    alvo = (await assertPublicHttpsUrl(origem)).url.toString();
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
    const pdf = await fetchPdfResiliente(alvo);
    bytes = await new Response(pdf.body).arrayBuffer();
  } catch (error) {
    if (error instanceof PdfError) {
      const mapped = error.toFail();
      return fail(mapped.code, mapped.message, mapped.status, undefined, headers);
    }
    return fail(API_ERROR_CODES.INTERNAL_ERROR, "Falha interna no arquivamento.", 500, undefined, headers);
  }

  const sha256 = createHash("sha256").update(Buffer.from(bytes)).digest("hex");
  const nome = nomeParaHash(sha256);

  // Dedup entre fontes: mesmo arquivo já arquivado sob outro id.
  // Só reutiliza quando o caminho é do backend ativo (migração de backend re-arquiva).
  const mesmoArquivo = await comTimeout(
    admin.from("documentos").select("storage_path").eq("sha256", sha256).maybeSingle(),
    10_000,
  );
  const achado: string | null = mesmoArquivo && !mesmoArquivo.error ? (mesmoArquivo.data?.storage_path ?? null) : null;
  const compativel =
    achado !== null &&
    (backend.nome === "drive" ? ehDrivePath(achado) : !ehDrivePath(achado));
  let storagePath: string | null = compativel ? achado : null;
  if (mesmoArquivo === null) {
    return fail(API_ERROR_CODES.ACERVO_INDISPONIVEL, "Acervo indisponível no momento.", 503, undefined, headers);
  }
  if (!storagePath) {
    try {
      storagePath = await comTimeout(backend.guardar(nome, bytes, "application/pdf"), 60_000);
    } catch {
      storagePath = null;
    }
    if (!storagePath) {
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
          url_origem: origem,
          url_pagina: documento?.urlPagina ?? arquivado?.url_pagina ?? null,
          doi: documento?.doi ?? arquivado?.doi ?? null,
          citacoes: documento?.citacoes ?? arquivado?.citacoes ?? null,
          assuntos: documento?.assuntos ?? arquivado?.assuntos ?? [],
          idioma: documento?.idioma ?? arquivado?.idioma ?? null,
          tipo: documento?.tipo ?? arquivado?.tipo ?? null,
          storage_path: storagePath ?? nome,
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

  return ok({ url: urlLeitura(backend, parsed.data, storagePath ?? nome) }, headers);
}
