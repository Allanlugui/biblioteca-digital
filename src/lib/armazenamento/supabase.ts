import { criarClienteAdmin } from "@/lib/supabase/admin";
import type { ArquivoBaixado, BackendArmazenamento } from "./tipos";

const BUCKET = "pdfs";

function adminOuErro() {
  const admin = criarClienteAdmin();
  if (!admin) throw new Error("Supabase não configurado.");
  return admin;
}

export function backendSupabase(): BackendArmazenamento {
  return {
    nome: "supabase",

    async guardar(path: string, bytes: ArrayBuffer, contentType: string): Promise<string> {
      const { error } = await adminOuErro().storage.from(BUCKET).upload(path, bytes, {
        contentType,
        upsert: true,
      });
      if (error) throw new Error("Falha ao arquivar no Supabase.");
      return path;
    },

    async existe(path: string): Promise<boolean> {
      try {
        const { data, error } = await adminOuErro()
          .storage.from(BUCKET)
          .createSignedUrl(path, 60);
        return !error && Boolean(data?.signedUrl);
      } catch {
        return false;
      }
    },

    async baixar(path: string): Promise<ArquivoBaixado | null> {
      try {
        const { data, error } = await adminOuErro().storage.from(BUCKET).download(path);
        if (error || !data) return null;
        return { bytes: await data.arrayBuffer(), contentType: data.type || "application/pdf" };
      } catch {
        return null;
      }
    },

    urlPublica(path: string): string | null {
      try {
        return adminOuErro().storage.from(BUCKET).getPublicUrl(path).data.publicUrl || null;
      } catch {
        return null;
      }
    },
  };
}

export { BUCKET };
