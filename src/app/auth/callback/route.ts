import { NextResponse, type NextRequest } from "next/server";
import { criarClienteServidor } from "@/lib/supabase/servidor";

export const dynamic = "force-dynamic";

// Troca o código do magic link por uma sessão e volta para a origem.
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const proximo = url.searchParams.get("next") ?? "/estante";
  if (!code) {
    return NextResponse.redirect(new URL("/entrar?erro=1", request.url));
  }
  const supabase = await criarClienteServidor();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(new URL("/entrar?erro=1", request.url));
  }
  return NextResponse.redirect(new URL(proximo, request.url));
}
