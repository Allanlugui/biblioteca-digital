import type { NextRequest } from "next/server";
import { ok } from "@/lib/api";
import { criarClienteServidor } from "@/lib/supabase/servidor";

export const dynamic = "force-dynamic";

// Informa o estado da sessão para o cliente (sem expor segredos).
export async function GET(_request: NextRequest) {
  const supabase = await criarClienteServidor();
  const { data } = await supabase.auth.getUser();
  if (!data.user) {
    return ok({ autenticado: false as const });
  }
  return ok({ autenticado: true as const, email: data.user.email ?? null });
}
