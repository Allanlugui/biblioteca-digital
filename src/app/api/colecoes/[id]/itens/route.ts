import type { NextRequest } from "next/server";
import { API_ERROR_CODES, fail, formatZodErrors, ok } from "@/lib/api";
import { criarClienteServidor } from "@/lib/supabase/servidor";
import { usuarioDaSessao } from "@/lib/supabase/sessao";
import { colecaoIdSchema, colecaoItemPostSchema } from "@/schemas";
import { garantirDocumento } from "@/services/acervo";
import { donoDaColecao } from "../route";

export const dynamic = "force-dynamic";

// GET /api/colecoes/{id}/itens?documento={doc} → { guardado: boolean }.
export async function GET(request: NextRequest, context: RouteContext<"/api/colecoes/[id]/itens">) {
  const user = await usuarioDaSessao();
  if (!user) {
    return fail(API_ERROR_CODES.UNAUTHENTICATED, "Entre para ver coleções.", 401);
  }
  const { id } = await context.params;
  if (!colecaoIdSchema.safeParse(id).success) {
    return fail(API_ERROR_CODES.VALIDATION_ERROR, "Identificador inválido.", 400);
  }
  const documento = new URL(request.url).searchParams.get("documento");
  if (!documento) {
    return fail(API_ERROR_CODES.VALIDATION_ERROR, "Informe o documento.", 400);
  }
  if (!(await donoDaColecao(id, user.id))) {
    return fail(API_ERROR_CODES.NOT_FOUND, "Coleção não encontrada.", 404);
  }
  const supabase = await criarClienteServidor();
  const { data } = await supabase
    .from("colecao_itens")
    .select("documento_id")
    .eq("colecao_id", id)
    .eq("documento_id", documento)
    .maybeSingle();
  return ok({ guardado: data !== null });
}

// POST /api/colecoes/{id}/itens { documento } → guarda o documento (idempotente).
export async function POST(request: NextRequest, context: RouteContext<"/api/colecoes/[id]/itens">) {
  const user = await usuarioDaSessao();
  if (!user) {
    return fail(API_ERROR_CODES.UNAUTHENTICATED, "Entre para guardar documentos.", 401);
  }
  const { id } = await context.params;
  if (!colecaoIdSchema.safeParse(id).success) {
    return fail(API_ERROR_CODES.VALIDATION_ERROR, "Identificador inválido.", 400);
  }
  let corpo: unknown;
  try {
    corpo = await request.json();
  } catch {
    return fail(API_ERROR_CODES.VALIDATION_ERROR, "Corpo inválido.", 400);
  }
  const parsed = colecaoItemPostSchema.safeParse(corpo);
  if (!parsed.success) {
    return fail(API_ERROR_CODES.VALIDATION_ERROR, "Documento inválido.", 400, formatZodErrors(parsed.error));
  }
  if (!(await donoDaColecao(id, user.id))) {
    return fail(API_ERROR_CODES.NOT_FOUND, "Coleção não encontrada.", 404);
  }
  if (!(await garantirDocumento(parsed.data.documento))) {
    return fail(API_ERROR_CODES.NOT_FOUND, "Documento não encontrado.", 404);
  }
  const supabase = await criarClienteServidor();
  const { error } = await supabase
    .from("colecao_itens")
    .upsert({ colecao_id: id, documento_id: parsed.data.documento }, { onConflict: "colecao_id,documento_id" });
  if (error) {
    return fail(API_ERROR_CODES.INTERNAL_ERROR, "Não foi possível guardar.", 500);
  }
  return ok({ guardado: true });
}

// DELETE /api/colecoes/{id}/itens?documento={doc} → retira (idempotente).
export async function DELETE(request: NextRequest, context: RouteContext<"/api/colecoes/[id]/itens">) {
  const user = await usuarioDaSessao();
  if (!user) {
    return fail(API_ERROR_CODES.UNAUTHENTICATED, "Entre para gerenciar coleções.", 401);
  }
  const { id } = await context.params;
  if (!colecaoIdSchema.safeParse(id).success) {
    return fail(API_ERROR_CODES.VALIDATION_ERROR, "Identificador inválido.", 400);
  }
  const documento = new URL(request.url).searchParams.get("documento");
  if (!documento) {
    return fail(API_ERROR_CODES.VALIDATION_ERROR, "Informe o documento.", 400);
  }
  if (!(await donoDaColecao(id, user.id))) {
    return fail(API_ERROR_CODES.NOT_FOUND, "Coleção não encontrada.", 404);
  }
  const supabase = await criarClienteServidor();
  const { error } = await supabase
    .from("colecao_itens")
    .delete()
    .eq("colecao_id", id)
    .eq("documento_id", documento);
  if (error) {
    return fail(API_ERROR_CODES.INTERNAL_ERROR, "Não foi possível retirar.", 500);
  }
  return ok({ guardado: false });
}
