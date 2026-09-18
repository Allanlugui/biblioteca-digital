import { createClient } from "@supabase/supabase-js";

// Cliente privilegiado: SOMENTE no servidor (Route Handlers). Bypassa o RLS,
// por isso cada uso precisa validar a entrada e restringir a operação.
export function criarClienteAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  if (!url || !serviceRole) return null;
  return createClient(url, serviceRole, { auth: { persistSession: false } });
}
