// Ingestão autônoma do acervo: descobre PDFs em fontes abertas,
// valida, arquiva no backend ativo e registra metadados.
// Uso: node scripts/ingerir/lote.mjs [--max-files=25]
// Estado: checkpoint em Temp (retoma sozinho). Teto: 350GB no Drive, 20MB/arquivo.
import fs from "node:fs";
import crypto from "node:crypto";
import dns from "node:dns/promises";
import net from "node:net";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const ROOT = new URL("../..", import.meta.url).pathname.replace(/\/$/, "");
const RAIZ = ROOT.startsWith("/") && process.platform === "win32" ? ROOT.slice(1) : ROOT;
const { createClient } = require(`${RAIZ}/node_modules/@supabase/supabase-js`);
const TMP = "C:/Users/jalla/AppData/Local/Temp/opencode";
const CHECKPOINT = `${TMP}/ingest-checkpoint.json`;
const args = Object.fromEntries(process.argv.slice(2).map((a) => a.replace(/^--/, "").split("=")));
const MAX_FILES = Number(args["max-files"] || 25);
const MAX_BYTES_ARQUIVO = 20 * 1024 * 1024;
const TETO_DRIVE_BYTES = 350 * 1024 * 1024 * 1024;

function lerEnv() {
  const env = {};
  for (const linha of fs.readFileSync(`${RAIZ}/.env.local`, "utf8").split("\n")) {
    const m = /^([A-Z_]+)=(.*)$/.exec(linha.trim());
    if (m) env[m[1]] = m[2];
  }
  return env;
}

const dormir = (ms) => new Promise((r) => setTimeout(r, ms));

// Guarda anti-SSRF mínima para hosts descobertos (só alcança https público).
const bloqueados = new net.BlockList();
for (const [ip, bits] of [["0.0.0.0", 8], ["10.0.0.0", 8], ["100.64.0.0", 10], ["127.0.0.0", 8], ["169.254.0.0", 16], ["172.16.0.0", 12], ["192.168.0.0", 16], ["224.0.0.0", 4], ["240.0.0.0", 4]]) {
  bloqueados.addSubnet(ip, bits, "ipv4");
}
bloqueados.addAddress("::1", "ipv6");
bloqueados.addSubnet("fc00::", 7, "ipv6");
bloqueados.addSubnet("fe80::", 10, "ipv6");

async function urlSegura(raw) {
  let u;
  try {
    u = new URL(raw);
  } catch {
    return null;
  }
  if (u.protocol !== "https:" || u.username || u.password || (u.port && u.port !== "443")) return null;
  if (["localhost"].includes(u.hostname.toLowerCase())) return null;
  try {
    const ips = await dns.lookup(u.hostname, { all: true });
    for (const { address, family } of ips) {
      if (bloqueados.check(address, family === 6 ? "ipv6" : "ipv4")) return null;
    }
    return u.toString();
  } catch {
    return null;
  }
}

async function baixarPdf(url, timeoutMs = 45000) {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const r = await fetch(url, { signal: controller.signal, headers: { "User-Agent": "biblioteca-digital/0.1" } });
    if (!r.ok) return { erro: `HTTP ${r.status}` };
    const ct = (r.headers.get("content-type") || "").toLowerCase();
    const ehPdf = ct.includes("application/pdf") || ct.includes("application/x-pdf") || ct.includes("application/octet-stream");
    if (!ehPdf) return { erro: `mime ${ct.slice(0, 40)}` };
    const buf = Buffer.from(await r.arrayBuffer());
    if (buf.byteLength < 5 || !buf.subarray(0, 5).equals(Buffer.from("%PDF-"))) return { erro: "sem-magic" };
    if (buf.byteLength > MAX_BYTES_ARQUIVO) return { erro: "grande-demais" };
    return { bytes: buf };
  } catch (e) {
    return { erro: String(e).slice(0, 60) };
  } finally {
    clearTimeout(t);
  }
}

async function tokenGoogle(env) {
  const r = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      client_id: env.GOOGLE_OAUTH_CLIENT_ID,
      client_secret: env.GOOGLE_OAUTH_CLIENT_SECRET,
      refresh_token: env.GOOGLE_OAUTH_REFRESH_TOKEN,
    }),
  });
  if (!r.ok) throw new Error(`token Google HTTP ${r.status}`);
  return (await r.json()).access_token;
}

async function usoDrive(env, token) {
  const r = await fetch("https://www.googleapis.com/drive/v3/about?fields=storageQuota", {
    headers: { Authorization: `Bearer ${token}`, "X-Goog-User-Project": env.GOOGLE_CLOUD_PROJECT },
  });
  if (!r.ok) return null;
  const q = ((await r.json()).storageQuota || {});
  return { uso: Number(q.usage || 0), limite: Number(q.limit || 0) };
}

async function subirDrive(env, token, nome, bytes) {
  const f = `lote-${Date.now()}`;
  const meta = JSON.stringify({ name: nome, parents: [env.GOOGLE_DRIVE_FOLDER_ID], mimeType: "application/pdf" });
  const corpo = Buffer.concat([
    Buffer.from(`--${f}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${meta}\r\n`),
    Buffer.from(`--${f}\r\nContent-Type: application/pdf\r\n\r\n`),
    bytes,
    Buffer.from(`\r\n--${f}--\r\n`),
  ]);
  const H = { Authorization: `Bearer ${token}`, "X-Goog-User-Project": env.GOOGLE_CLOUD_PROJECT };
  const q = `name = '${nome.replace(/'/g, "\\'")}' and '${env.GOOGLE_DRIVE_FOLDER_ID}' in parents and trashed = false`;
  const b = await fetch(`https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&fields=files(id)`, { headers: H });
  const achado = b.ok ? (await b.json()).files?.[0]?.id : null;
  if (achado) return `drive:${achado}`;
  const u = await fetch("https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id", {
    method: "POST",
    headers: { ...H, "Content-Type": `multipart/related; boundary=${f}`, "Content-Length": String(corpo.byteLength) },
    body: new Uint8Array(corpo),
  });
  if (!u.ok) throw new Error(`upload HTTP ${u.status}`);
  return `drive:${(await u.json()).id}`;
}

// --- Descoberta ---
async function listarArxiv(cat, inicio, n) {
  const url = `https://export.arxiv.org/api/query?search_query=cat:${cat}&start=${inicio}&max_results=${n}&sortBy=submittedDate&sortOrder=descending`;
  const xml = await (await fetch(url, { headers: { "User-Agent": "biblioteca-digital/0.1" } })).text();
  const itens = [];
  for (const bloco of xml.split("<entry>").slice(1)) {
    const id = /<id>\s*https?:\/\/arxiv\.org\/abs\/([^<\s]+)/.exec(bloco)?.[1];
    const titulo = /<title>([\s\S]*?)<\/title>/.exec(bloco)?.[1]?.replace(/\s+/g, " ").trim();
    const autores = [...bloco.matchAll(/<name>(.*?)<\/name>/g)].map((m) => m[1].trim()).slice(0, 8);
    const resumo = /<summary>([\s\S]*?)<\/summary>/.exec(bloco)?.[1]?.replace(/\s+/g, " ").trim().slice(0, 500);
    const pdf = /<link[^>]*title="pdf"[^>]*href="([^"]+)"/.exec(bloco)?.[1] || (id ? `https://arxiv.org/pdf/${id}` : null);
    if (id && titulo) itens.push({ id: `gutenberg_arxiv_${id.replace(/[^A-Za-z0-9._-]/g, "_").slice(0, 60)}`, titulo, autores, descricao: resumo || null, url: pdf, fonte: "arxiv" });
  }
  return itens;
}

async function listarDoaj(termo, pagina) {
  const url = `https://doaj.org/api/search/articles/${encodeURIComponent(termo)}?page=${pagina}&pageSize=10`;
  const j = await (await fetch(url, { headers: { "User-Agent": "biblioteca-digital/0.1" } })).json();
  const itens = [];
  for (const r of j.results || []) {
    const b = r.bibjson || {};
    const pdf = (b.link || []).find((l) => (l.content_type || "").toUpperCase() === "PDF")?.url;
    if (!pdf || !b.title) continue;
    itens.push({
      id: `gutenberg_doaj_${r.id}`,
      titulo: String(b.title).replace(/\s+/g, " ").trim().slice(0, 300),
      autores: (b.author || []).map((a) => a.name).filter(Boolean).slice(0, 8),
      descricao: null,
      url: pdf,
      fonte: "doaj",
    });
  }
  return itens;
}

async function listarGutenberg(pagina) {
  const url = `https://gutendex.com/books?page=${pagina}&sort=download_count`;
  const j = await (await fetch(url)).json();
  const itens = [];
  for (const l of j.results || []) {
    const pdf = l.formats?.["application/pdf"];
    if (!pdf || !l.title) continue;
    itens.push({
      id: `gutenberg_gb_${l.id}`,
      titulo: String(l.title).replace(/\s+/g, " ").trim().slice(0, 300),
      autores: (l.authors || []).map((a) => a.name).filter(Boolean).slice(0, 8),
      descricao: (l.summaries || [])[0]?.slice(0, 500) || null,
      url: pdf,
      fonte: "gutenberg",
    });
  }
  return itens;
}

function carregarCheckpoint() {
  try {
    return JSON.parse(fs.readFileSync(CHECKPOINT, "utf8"));
  } catch {
    return { arxiv: {}, doaj: {}, gutenbergPage: 1, arquivos: 0, bytes: 0 };
  }
}

async function main() {
  const env = lerEnv();
  const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
  const cp = carregarCheckpoint();
  const token = await tokenGoogle(env);
  const uso = await usoDrive(env, token);
  console.log("DRIVE uso/limite:", uso);
  if (uso && uso.uso > TETO_DRIVE_BYTES) {
    console.log("TETO ATINGIDO, encerrando.");
    return;
  }

  const resumo = { novos: 0, duplicados: 0, falhas: 0, pulados: 0 };
  const candidatos = [];
  const cats = ["cs.AI", "cs.LG", "quant-ph", "cs.CL", "stat.ML"];
  for (const cat of cats) {
    const inicio = cp.arxiv[cat] || 0;
    try {
      candidatos.push(...(await listarArxiv(cat, inicio, 8)).map((c) => ({ ...c, cursor: { escopo: "arxiv", chave: cat } })));
    } catch (e) {
      console.log("arxiv falhou:", cat, String(e).slice(0, 80));
    }
    await dormir(1500);
  }
  const termos = ["quantum", "cancer", "climate", "education", "health", "energy"];
  for (const t of termos) {
    const pagina = cp.doaj[t] || 1;
    try {
      candidatos.push(...(await listarDoaj(t, pagina)).map((c) => ({ ...c, cursor: { escopo: "doaj", chave: t } })));
    } catch (e) {
      console.log("doaj falhou:", t, String(e).slice(0, 80));
    }
    await dormir(1500);
  }
  try {
    candidatos.push(...(await listarGutenberg(cp.gutenbergPage)).map((c) => ({ ...c, cursor: { escopo: "gutenberg", chave: "page" } })));
  } catch (e) {
    console.log("gutenberg falhou:", String(e).slice(0, 80));
  }

  for (const item of candidatos) {
    if (resumo.novos >= MAX_FILES) break;
    const segura = await urlSegura(item.url);
    if (!segura) {
      resumo.pulados++;
      continue;
    }
    const dl = await baixarPdf(segura);
    if (!dl.bytes) {
      resumo.falhas++;
      console.log("falha:", item.id, dl.erro);
      continue;
    }
    const sha = crypto.createHash("sha256").update(dl.bytes).digest("hex");
    const ja = await admin.from("documentos").select("id").eq("sha256", sha).limit(1).maybeSingle();
    if (ja.data) {
      resumo.duplicados++;
      continue;
    }
    let ref;
    try {
      ref = await subirDrive(env, token, `${sha}.pdf`, dl.bytes);
    } catch (e) {
      resumo.falhas++;
      console.log("upload falhou:", item.id, String(e).slice(0, 80));
      continue;
    }
    const { error } = await admin.from("documentos").upsert(
      {
        id: item.id.slice(0, 120),
        fonte: item.fonte,
        titulo: item.titulo,
        autores: item.autores,
        descricao: item.descricao,
        url_origem: segura,
        url_pagina: null,
        storage_path: ref,
        sha256: sha,
        tamanho_bytes: dl.bytes.byteLength,
        acessos: 0,
      },
      { onConflict: "id" },
    );
    if (error) {
      resumo.falhas++;
      console.log("insert falhou:", item.id, error.message.slice(0, 80));
      continue;
    }
    resumo.novos++;
    cp.arquivos++;
    cp.bytes += dl.bytes.byteLength;
    if (item.cursor.escopo === "arxiv") cp.arxiv[item.cursor.chave] = (cp.arxiv[item.cursor.chave] || 0) + 8;
    if (item.cursor.escopo === "doaj") cp.doaj[item.cursor.chave] = (cp.doaj[item.cursor.chave] || 1) + 1;
    if (item.cursor.escopo === "gutenberg") cp.gutenbergPage = cp.gutenbergPage + 1;
    fs.writeFileSync(CHECKPOINT, JSON.stringify(cp));
    console.log(`ok ${resumo.novos}/${MAX_FILES}:`, item.id.slice(0, 50));
    await dormir(1500);
  }
  console.log("RESUMO:", JSON.stringify(resumo), "checkpoint:", JSON.stringify({ arxiv: cp.arxiv, gutenbergPage: cp.gutenbergPage }));
}

main().catch((e) => {
  console.error("FATAL:", String(e).slice(0, 200));
  process.exit(1);
});
