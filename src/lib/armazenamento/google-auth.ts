import { createPrivateKey, createSign } from "node:crypto";

// Conta de serviço do Google sem dependências externas:
// assina o JWT (RS256) com stdlib e troca por access token com cache.
export type CredencialServico = {
  client_email: string;
  private_key: string;
};

export function lerCredencial(json: string | undefined): CredencialServico | null {
  if (!json) return null;
  try {
    const parsed: unknown = JSON.parse(json);
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      typeof (parsed as Record<string, unknown>).client_email === "string" &&
      typeof (parsed as Record<string, unknown>).private_key === "string"
    ) {
      return {
        client_email: (parsed as Record<string, string>).client_email,
        private_key: (parsed as Record<string, string>).private_key,
      };
    }
    return null;
  } catch {
    return null;
  }
}

function base64Url(bytes: Buffer): string {
  return bytes.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function assinarJwt(credencial: CredencialServico, escopo: string): string {
  const agora = Math.floor(Date.now() / 1000);
  const cabecalho = base64Url(Buffer.from(JSON.stringify({ alg: "RS256", typ: "JWT" })));
  const corpo = base64Url(
    Buffer.from(
      JSON.stringify({
        iss: credencial.client_email,
        scope: escopo,
        aud: "https://oauth2.googleapis.com/token",
        exp: agora + 3600,
        iat: agora,
      }),
    ),
  );
  const assinado = `${cabecalho}.${corpo}`;
  const chave = createPrivateKey(credencial.private_key.replace(/\\n/g, "\n"));
  const assinatura = createSign("RSA-SHA256").update(assinado).end().sign(chave);
  return `${assinado}.${base64Url(assinatura)}`;
}

let tokenCache: { token: string; expiraEm: number } | null = null;

export async function obterAccessToken(credencial: CredencialServico, escopo: string): Promise<string> {
  if (tokenCache && tokenCache.expiraEm > Date.now() + 60_000) return tokenCache.token;
  const resposta = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: assinarJwt(credencial, escopo),
    }),
  });
  if (!resposta.ok) {
    throw new Error(`Falha ao autenticar no Google (HTTP ${resposta.status}).`);
  }
  const corpo = (await resposta.json()) as { access_token?: string; expires_in?: number };
  if (!corpo.access_token) throw new Error("Resposta de autenticação sem token.");
  tokenCache = { token: corpo.access_token, expiraEm: Date.now() + (corpo.expires_in ?? 3600) * 1000 };
  return corpo.access_token;
}

export function limparCacheToken(): void {
  tokenCache = null;
}

export type CredencialOAuth = {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
};

export function lerCredencialOAuth(): CredencialOAuth | null {
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID?.trim() ?? "";
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET?.trim() ?? "";
  const refreshToken = process.env.GOOGLE_OAUTH_REFRESH_TOKEN?.trim() ?? "";
  if (!clientId || !clientSecret || !refreshToken) return null;
  return { clientId, clientSecret, refreshToken };
}

// OAuth do próprio usuário: uploads contam da cota dele (conta de serviço não tem cota).
export async function obterAccessTokenOAuth(credencial: CredencialOAuth): Promise<string> {
  if (tokenCache && tokenCache.expiraEm > Date.now() + 60_000) return tokenCache.token;
  const resposta = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      client_id: credencial.clientId,
      client_secret: credencial.clientSecret,
      refresh_token: credencial.refreshToken,
    }),
  });
  if (!resposta.ok) {
    throw new Error(`Falha ao renovar acesso ao Google (HTTP ${resposta.status}).`);
  }
  const corpo = (await resposta.json()) as { access_token?: string; expires_in?: number };
  if (!corpo.access_token) throw new Error("Resposta de autenticação sem token.");
  tokenCache = { token: corpo.access_token, expiraEm: Date.now() + (corpo.expires_in ?? 3600) * 1000 };
  return corpo.access_token;
}
