import type { NextRequest } from "next/server";
import { API_ERROR_CODES, fail, formatZodErrors, ok } from "@/lib/api";
import { criarClienteServidor } from "@/lib/supabase/servidor";
import { usuarioDaSessao } from "@/lib/supabase/sessao";
import { colecaoPostSchema } from "@/schemas";

export const dynamic = "force-dynamic";

// GET /api/colecoes → coleções do usuário com contagem de itens.
// POST /api/colecoes { nome } → cria coleção.
export async function GET(_request: NextRequest) {
  const user = await usuarioDaSessao();
  if (!user) {
    return fail(API_ERROR_CODES.UNAUTHENTICATED, "Entre para ver suas coleções.", 401);
  }
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase
    .from("colecoes")
    .select("id, nome, created_at, colecao_itens(documento_id)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });
  if (error) {
    return fail(API_ERROR_CODES.INTERNAL_ERROR, "Não foi possível carregar as coleções.", 500);
  }
  return ok(
    (data ?? []).map((c) => {
      const itens = Array.isArray(c.colecao_itens) ? c.colecao_itens : [];
      return { id: c.id, nome: c.nome, total: itens.length };
    }),
  );
}

export async function POST(request: NextRequest) {
  const user = await usuarioDaSessao();
  if (!user) {
    return fail(API_ERROR_CODES.UNAUTHENTICATED, "Entre para criar coleções.", 401);
  }
  let corpo: unknown;
  try {
    corpo = await request.json();
  } catch {
    return fail(API_ERROR_CODES.VALIDATION_ERROR, "Corpo inválido.", 400);
  }
  const parsed = colecaoPostSchema.safeParse(corpo);
  if (!parsed.success) {
    return fail(API_ERROR_CODES.VALIDATION_ERROR, "Nome inválido.", 400, formatZodErrors(parsed.error));
  }
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase
    .from("colecoes")
    .insert({ user_id: user.id, nome: parsed.data.nome })
    .select("id, nome")
    .single();
  if (error || !data) {
    return fail(API_ERROR_CODES.INTERNAL_ERROR, "Não foi possível criar a coleção.", 500);
  }
  return ok(data, undefined, 201);
}
