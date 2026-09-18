import type { NextRequest } from "next/server";
import { API_ERROR_CODES, fail, ok } from "@/lib/api";
import { criarClienteServidor } from "@/lib/supabase/servidor";
import { usuarioDaSessao } from "@/lib/supabase/sessao";
import { colecaoIdSchema } from "@/schemas";

export const dynamic = "force-dynamic";

export async function donoDaColecao(colecaoId: string, userId: string): Promise<boolean> {
  const supabase = await criarClienteServidor();
  const { data } = await supabase
    .from("colecoes")
    .select("id")
    .eq("id", colecaoId)
    .eq("user_id", userId)
    .maybeSingle();
  return data !== null;
}

// DELETE /api/colecoes/{id} → exclui a coleção (e seus itens, por cascata).
export async function DELETE(_request: NextRequest, context: RouteContext<"/api/colecoes/[id]">) {
  const user = await usuarioDaSessao();
  if (!user) {
    return fail(API_ERROR_CODES.UNAUTHENTICATED, "Entre para gerenciar coleções.", 401);
  }
  const { id } = await context.params;
  if (!colecaoIdSchema.safeParse(id).success) {
    return fail(API_ERROR_CODES.VALIDATION_ERROR, "Identificador inválido.", 400);
  }
  if (!(await donoDaColecao(id, user.id))) {
    return fail(API_ERROR_CODES.NOT_FOUND, "Coleção não encontrada.", 404);
  }
  const supabase = await criarClienteServidor();
  const { error } = await supabase.from("colecoes").delete().eq("id", id);
  if (error) {
    return fail(API_ERROR_CODES.INTERNAL_ERROR, "Não foi possível excluir.", 500);
  }
  return ok({ excluida: true });
}
