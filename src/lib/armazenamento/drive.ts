import { config } from "@/lib/config";
import { lerCredencial, obterAccessToken, type CredencialServico } from "./google-auth";
import type { ArquivoBaixado, BackendArmazenamento } from "./tipos";

const ESCOPO = "https://www.googleapis.com/auth/drive.file";

function configDrive(): { credencial: CredencialServico; pastaId: string } | null {
  const credencial = lerCredencial(config.googleServiceAccountJson);
  const pastaId = config.googleDriveFolderId;
  if (!credencial || !pastaId) return null;
  return { credencial, pastaId };
}

export function driveDisponivel(): boolean {
  return configDrive() !== null;
}

async function cabecalhos(credencial: CredencialServico): Promise<Record<string, string>> {
  const token = await obterAccessToken(credencial, ESCOPO);
  return { Authorization: `Bearer ${token}` };
}

// Procura o arquivo pelo nome exato dentro da pasta (dedup antes de subir).
async function buscarPorNome(credencial: CredencialServico, pastaId: string, nome: string): Promise<string | null> {
  const q = `name = '${nome.replace(/'/g, "\\'")}' and '${pastaId}' in parents and trashed = false`;
  const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&fields=files(id)&pageSize=1`;
  const resposta = await fetch(url, { headers: await cabecalhos(credencial) });
  if (!resposta.ok) return null;
  const corpo = (await resposta.json()) as { files?: { id: string }[] };
  return corpo.files?.[0]?.id ?? null;
}

export function backendDrive(): BackendArmazenamento {  return {
    nome: "drive",

    async guardar(path: string, bytes: ArrayBuffer, contentType: string): Promise<string> {
      const cfg = configDrive();
      if (!cfg) throw new Error("Google Drive não configurado.");
      const existente = await buscarPorNome(cfg.credencial, cfg.pastaId, path);
      if (existente) return `drive:${existente}`;
      const fronteira = `lote-${Date.now()}`;
      const meta = JSON.stringify({ name: path, parents: [cfg.pastaId], mimeType: contentType });
      const payload = Buffer.concat([
        Buffer.from(`--${fronteira}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${meta}\r\n`),
        Buffer.from(`--${fronteira}\r\nContent-Type: ${contentType}\r\n\r\n`),
        Buffer.from(bytes),
        Buffer.from(`\r\n--${fronteira}--\r\n`),
      ]);
      const resposta = await fetch("https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id", {
        method: "POST",
        headers: {
          ...(await cabecalhos(cfg.credencial)),
          "Content-Type": `multipart/related; boundary=${fronteira}`,
          "Content-Length": String(payload.byteLength),
        },
        body: new Uint8Array(payload),
      });
      if (!resposta.ok) {
        throw new Error(`Falha ao arquivar no Drive (HTTP ${resposta.status}).`);
      }
      const corpo = (await resposta.json()) as { id?: string };
      if (!corpo.id) throw new Error("Drive não devolveu o identificador do arquivo.");
      return `drive:${corpo.id}`;
    },

    async existe(path: string): Promise<boolean> {
      const cfg = configDrive();
      if (!cfg) return false;
      const id = path.startsWith("drive:") ? path.slice("drive:".length) : await buscarPorNome(cfg.credencial, cfg.pastaId, path);
      if (!id) return false;
      const resposta = await fetch(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(id)}?fields=id,trashed`, {
        headers: await cabecalhos(cfg.credencial),
      });
      if (!resposta.ok) return false;
      const corpo = (await resposta.json()) as { trashed?: boolean };
      return corpo.trashed !== true;
    },

    async baixar(path: string): Promise<ArquivoBaixado | null> {
      const cfg = configDrive();
      if (!cfg) return null;
      const id = path.startsWith("drive:") ? path.slice("drive:".length) : await buscarPorNome(cfg.credencial, cfg.pastaId, path);
      if (!id) return null;
      const resposta = await fetch(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(id)}?alt=media`, {
        headers: await cabecalhos(cfg.credencial),
      });
      if (!resposta.ok) return null;
      const bytes = await resposta.arrayBuffer();
      return { bytes, contentType: resposta.headers.get("content-type") ?? "application/pdf" };
    },
  };
}
