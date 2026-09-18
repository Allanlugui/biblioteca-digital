# Biblioteca Digital

Busca agregada de documentos científicos (OpenAlex, arXiv, DOAJ) com
download direto de PDFs e leitor integrado no navegador.

Stack: Next.js 16 (App Router) + React 19 + TypeScript + Tailwind CSS v4 +
Zod + PDF.js (`pdfjs-dist`).

## Desenvolvimento

Pré-requisitos: Node.js 20+ e npm.

```bash
npm install
npm run dev
```

A aplicação sobe em `http://localhost:3000`.

## Scripts

| Script            | O que faz                                  |
| ----------------- | ------------------------------------------ |
| `npm run dev`     | Servidor de desenvolvimento (Turbopack)    |
| `npm run build`   | Build de produção                          |
| `npm run start`   | Serve o build de produção                  |
| `npm run lint`    | ESLint                                     |
| `npm run typecheck` | Gera tipos de rota (`next typegen`) + `tsc --noEmit` |
| `npm test`        | Testes unitários (Vitest)                  |

## Variáveis de ambiente

Copie `.env.example` para `.env.local` e ajuste quando necessário. Todas
possuem fallback seguro — nenhum segredo é obrigatório para rodar localmente.

| Variável                     | Padrão | Descrição                                        |
| ---------------------------- | ------ | ------------------------------------------------ |
| `RATE_LIMIT_MAX_REQUESTS`    | `30`   | Requisições por janela, por IP e por rota        |
| `RATE_LIMIT_WINDOW_MS`       | `60000`| Janela do rate limiting (ms)                     |
| `PROXY_MAX_SIZE_BYTES`       | `52428800` | Tamanho máximo de PDF no proxy/download (50 MB) |
| `PROXY_TIMEOUT_MS`           | `30000`| Timeout de origem no proxy (ms)                  |
| `PROXY_ALLOWED_HOST_SUFFIXES`| `` (vazio) | Whitelist de domínios do proxy; vazio = qualquer domínio público https |
| `SEARCH_TIMEOUT_MS`          | `15000`| Timeout por provider de busca (ms)               |
| `SEARCH_CACHE_TTL_MS`        | `300000` | TTL do cache de busca (5 min)                  |
| `OPENALEX_MAILTO`            | `` (vazio) | E-mail para o pool educado do OpenAlex (opcional) |

## API

| Rota                     | Descrição                                              |
| ------------------------ | ------------------------------------------------------ |
| `GET /api/busca?q=&limite=` | Agregação OpenAlex + arXiv + DOAJ (contrato `ApiResponse<ResultadoBusca>`) |
| `GET /api/documento/[id]` | Metadados (`id` no formato `fonte_externalId`)        |
| `GET /api/download/[id]` | Stream do PDF (`attachment`, MIME + tamanho + magic bytes validados) |
| `GET /api/proxy?url=`    | Proxy para o leitor (`inline`, com guard anti-SSRF: só https/443, IPs privados bloqueados, DNS verificado e conexão fixada no IP verificado) |

## Deploy (Vercel)

Zero configuração adicional: conecte o repositório na Vercel (framework
detectado automaticamente como Next.js). Defina as variáveis de ambiente
acima no painel do projeto quando quiser valores diferentes do padrão.

Limitações conhecidas em produção (ver `memory/PROBLEMAS.md`):

- Rate limiting e cache de busca são **em memória por instância** — para
  múltiplas instâncias, usar store distribuída (ex.: Upstash Redis) via
  `setRateLimitStore()`.
- O worker do PDF.js (`public/pdf.worker.min.mjs`) deve ser recopiado ao
  atualizar o pacote `pdfjs-dist`.
