import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

export function supabaseConfigurado(): boolean {
  return URL !== "" && ANON !== "" && process.env.SUPABASE_SERVICE_ROLE_KEY !== undefined && process.env.SUPABASE_SERVICE_ROLE_KEY !== "";
}

export function supabaseLeituraConfigurado(): boolean {
  return URL !== "" && ANON !== "";
}

export async function criarClienteServidor() {
  const cookieStore = await cookies();
  return createServerClient(URL, ANON, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (cookiesToSet) => {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Chamado de um Server Component: a sessão é atualizada pelo proxy.
        }
      },
    },
  });
}
