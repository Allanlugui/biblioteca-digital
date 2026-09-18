import { supabaseLeituraConfigurado, criarClienteServidor } from "./servidor";

// Devolve o usuário da sessão ou null (sem sessão, sem config ou erro).
export async function usuarioDaSessao() {
  if (!supabaseLeituraConfigurado()) return null;
  try {
    const supabase = await criarClienteServidor();
    const { data } = await supabase.auth.getUser();
    return data.user;
  } catch {
    return null;
  }
}
