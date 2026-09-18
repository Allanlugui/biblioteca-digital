import type { NextRequest } from "next/server";
import { API_ERROR_CODES, fail, formatZodErrors, ok } from "@/lib/api";
import { criarClienteServidor } from "@/lib/supabase/servidor";
import { usuarioDaSessao } from "@/lib/supabase/sessao";
import { documentoIdSchema } from "@/schemas";

export const dynamic = "force-dynamic";

// DELETE /api/estante/{id} → remove da estante (idempotente).
export async function DELETE(_request: NextRequest, context: RouteContext<"/api/estante/[id]">) {
  const user = await usuarioDaSessao();
  if (!user) {
    return fail(API_ERROR_CODES.UNAUTHENTICATED, "Entre para gerenciar sua estante.", 401);
  }
  const { id } = await context.params;
  const parsed = documentoIdSchema.safeParse(id);
  if (!parsed.success) {
    return fail(API_ERROR_CODES.VALIDATION_ERROR, "Identificador inválido.", 400, formatZodErrors(parsed.error));
  }
  const supabase = await criarClienteServidor();
  const { error } = await supabase.from("estante").delete().eq("user_id", user.id).eq("documento_id", parsed.data);
  if (error) {
    return fail(API_ERROR_CODES.INTERNAL_ERROR, "Não foi possível remover.", 500);
  }
  return ok({ salvo: false });
}
