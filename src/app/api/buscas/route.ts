import type { NextRequest } from "next/server";
import { API_ERROR_CODES, fail, ok } from "@/lib/api";
import { criarClienteServidor } from "@/lib/supabase/servidor";
import { usuarioDaSessao } from "@/lib/supabase/sessao";

export const dynamic = "force-dynamic";

// GET /api/buscas → últimas 20 buscas do usuário (privado).
export async function GET(_request: NextRequest) {
  const user = await usuarioDaSessao();
  if (!user) {
    return fail(API_ERROR_CODES.UNAUTHENTICATED, "Entre para ver seu histórico.", 401);
  }
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase
    .from("buscas")
    .select("consulta, total, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(20);
  if (error) {
    return fail(API_ERROR_CODES.INTERNAL_ERROR, "Não foi possível carregar o histórico.", 500);
  }
  return ok(data ?? []);
}
