import { criarClienteAdmin } from "@/lib/supabase/admin";
import { criarClienteServidor } from "@/lib/supabase/servidor";

export function normalizarTermo(consulta: string): string {
  return consulta.trim().toLowerCase().replace(/\s+/g, " ");
}

// Registra a busca no acervo: contador global (sem PII, sempre) e
// histórico individual (só quando há sessão). Nunca quebra nem atrasa a busca.
export async function registrarBusca(consulta: string, total: number): Promise<void> {
  await Promise.race([
    registrar(consulta, total),
    new Promise((resolve) => setTimeout(resolve, 4000)),
  ]).catch(() => undefined);
}

async function registrar(consulta: string, total: number): Promise<void> {
  try {
    const admin = criarClienteAdmin();
    if (!admin) return;
    const termo = normalizarTermo(consulta);
    if (!termo) return;

    const atual = await admin
      .from("buscas_agregadas")
      .select("total")
      .eq("termo", termo)
      .maybeSingle();
    await admin.from("buscas_agregadas").upsert(
      { termo, total: (atual.data?.total ?? 0) + 1, atualizado_em: new Date().toISOString() },
      { onConflict: "termo" },
    );

    try {
      const supabase = await criarClienteServidor();
      const { data } = await supabase.auth.getUser();
      if (data.user) {
        await admin.from("buscas").insert({ user_id: data.user.id, consulta: consulta.trim(), total });
      }
    } catch {
      // Sem sessão: a busca segue anônima, só o agregado é contado.
    }
  } catch {
    // Histórico é melhor esforço: nunca quebra a busca.
  }
}
