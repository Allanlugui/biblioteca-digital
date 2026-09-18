# Biblioteca Digital

Busca agregada de documentos científicos (OpenAlex, arXiv, DOAJ, Semantic Scholar)
mais os PDFs de toda a web, com download direto e leitor integrado no navegador.

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
| `SEMANTIC_SCHOLAR_API_KEY`   | `` (vazio) | Chave gratuita do Semantic Scholar (opcional; sem ela, 100 req/5min por IP) |

## API

| Rota                     | Descrição                                              |
| ------------------------ | ------------------------------------------------------ |
| `GET /api/busca?q=&limite=` | Agregação OpenAlex + arXiv + DOAJ + Semantic Scholar + Web (contrato `ApiResponse<ResultadoBusca>`) |
| `GET /api/documento/[id]` | Metadados (`id` no formato `fonte_externalId`)        |
| `GET /api/download/[id]` | Stream do PDF (`attachment`, MIME + tamanho + magic bytes validados) |
| `GET /api/proxy?url=`    | Proxy para o leitor (`inline`, com guard anti-SSRF: só https/443, IPs privados bloqueados, DNS verificado e conexão fixada no IP verificado) |
| `GET /api/arquivo/[id]`  | PDF no acervo universal (Supabase Storage; arquiva da origem validada quando ainda não existe) |
| `GET/POST /api/estante` + `DELETE /api/estante/[id]` | Estante do usuário logado |
| `GET/PUT /api/progresso` | Página exata da leitura por usuário e documento |
| `GET /api/buscas`        | Histórico de buscas do usuário logado |

## Conta e acervo (Supabase, opcional)

Navegar, buscar e ler é livre. Quem cria conta (login sem senha por link de
e-mail em `/entrar`) ganha: estante de salvos, histórico de buscas e retomada
da leitura exatamente de onde parou (página guardada por documento).

Todo livro aberto é arquivado numa pasta universal (`Storage`, caminho por
hash SHA-256, sem dados de usuário): a próxima leitura serve do acervo, sem
bater na origem. Documentos são globais; dados de usuário são isolados por
RLS (`auth.uid() = user_id`, escrita global só com service-role no servidor).

Para ativar: crie o projeto em `supabase.com`, rode
`supabase/migrations/0001_acervo.sql` no SQL Editor e preencha `.env.local`
(ver `.env.example`). Sem chaves, o app segue funcionando (leitor via proxy
direto, sem estante).

## Deploy (Vercel)

Zero configuração adicional: conecte o repositório na Vercel (framework
detectado automaticamente como Next.js). Defina as variáveis de ambiente
acima no painel do projeto quando quiser valores diferentes do padrão.
Para o painel do usuário, adicione também `NEXT_PUBLIC_SUPABASE_URL`,
`NEXT_PUBLIC_SUPABASE_ANON_KEY` e `SUPABASE_SERVICE_ROLE_KEY`.

## Busca universal na web (Google, opcional)

As 4 fontes acadêmicas funcionam sem chave. Para varrer PDFs de toda a web,
ative o Google Programmable Search (100 consultas/dia grátis):

1. Em `console.cloud.google.com`: ative a Custom Search API e crie uma chave (`GOOGLE_SEARCH_API_KEY`).
2. Em `programmablesearchengine.google.com`: crie um mecanismo com "Search the entire web" e copie o ID (`GOOGLE_SEARCH_CX`).
3. Defina as duas envs (local + Vercel). Sem elas, a fonte Web fica ausente e o resto segue normal.

Limitações conhecidas em produção (ver `memory/PROBLEMAS.md`):

- Rate limiting e cache de busca são **em memória por instância** — para
  múltiplas instâncias, usar store distribuída (ex.: Upstash Redis) via
  `setRateLimitStore()`.
- O worker do PDF.js (`public/pdf.worker.min.mjs`) deve ser recopiado ao
  atualizar o pacote `pdfjs-dist`.
