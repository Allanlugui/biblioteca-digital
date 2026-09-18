import type { NextRequest } from "next/server";
import { API_ERROR_CODES, fail, formatZodErrors, ok } from "@/lib/api";
import { criarClienteServidor } from "@/lib/supabase/servidor";
import { usuarioDaSessao } from "@/lib/supabase/sessao";
import { estantePostSchema } from "@/schemas";
import { garantirDocumento } from "@/services/acervo";

export const dynamic = "force-dynamic";

// GET /api/estante → lista salvos (com metadados e progresso).
// GET /api/estante?documento={id} → { salvo: boolean }.
export async function GET(request: NextRequest) {
  const user = await usuarioDaSessao();
  if (!user) {
    return fail(API_ERROR_CODES.UNAUTHENTICATED, "Entre para ver sua estante.", 401);
  }
  const supabase = await criarClienteServidor();
  const documento = new URL(request.url).searchParams.get("documento");
  if (documento) {
    const { data } = await supabase
      .from("estante")
      .select("documento_id")
      .eq("user_id", user.id)
      .eq("documento_id", documento)
      .maybeSingle();
    return ok({ salvo: data !== null });
  }
  const { data, error } = await supabase
    .from("estante")
    .select("created_at, documentos(id, fonte, titulo, autores, data_publicacao, storage_path)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });
  if (error) {
    return fail(API_ERROR_CODES.INTERNAL_ERROR, "Não foi possível carregar a estante.", 500);
  }
  const ids = (data ?? [])
    .map((item) => {
      const docs = item.documentos;
      const doc = Array.isArray(docs) ? docs[0] : docs;
      return doc?.id;
    })
    .filter((id): id is string => Boolean(id));
  const progresso =
    ids.length > 0
      ? await supabase.from("progresso_leitura").select("documento_id, pagina, total_paginas").eq("user_id", user.id).in("documento_id", ids)
      : { data: [] as { documento_id: string; pagina: number; total_paginas: number | null }[] };
  const porDocumento = new Map((progresso.data ?? []).map((p) => [p.documento_id, p]));
  return ok(
    (data ?? []).map((item) => {
      const docs = item.documentos;
      const documento = Array.isArray(docs) ? (docs[0] ?? null) : (docs ?? null);
      return {
        salvoEm: item.created_at,
        documento,
        progresso: porDocumento.get(documento?.id ?? "") ?? null,
      };
    }),
  );
}

// POST /api/estante { id } → salva na estante (idempotente).
export async function POST(request: NextRequest) {
  const user = await usuarioDaSessao();
  if (!user) {
    return fail(API_ERROR_CODES.UNAUTHENTICATED, "Entre para salvar na estante.", 401);
  }
  let corpo: unknown;
  try {
    corpo = await request.json();
  } catch {
    return fail(API_ERROR_CODES.VALIDATION_ERROR, "Corpo inválido.", 400);
  }
  const parsed = estantePostSchema.safeParse(corpo);
  if (!parsed.success) {
    return fail(API_ERROR_CODES.VALIDATION_ERROR, "Identificador inválido.", 400, formatZodErrors(parsed.error));
  }
  if (!(await garantirDocumento(parsed.data.id))) {
    return fail(API_ERROR_CODES.NOT_FOUND, "Documento não encontrado.", 404);
  }
  const supabase = await criarClienteServidor();
  const { error } = await supabase
    .from("estante")
    .upsert({ user_id: user.id, documento_id: parsed.data.id }, { onConflict: "user_id,documento_id" });
  if (error) {
    return fail(API_ERROR_CODES.INTERNAL_ERROR, "Não foi possível salvar.", 500);
  }
  return ok({ salvo: true });
}
