# Status do Projeto: biblioteca-digital 
- **Data de Criação:** 16/09/2026 17:06:37,33 
- **Data de Atualização:** 18/09/2026
- **Estado Atual:** BLOCO A CONCLUÍDO NO CÓDIGO — Documento enriquecido + normalizador (51 testes, build OK, campos reais validados). Falta: rodar migration 0002 no Supabase (obrigatória antes do uso).
- **Pendente futuro:** busca web 100% universal exige API com chave (Berc brave/Google) — decisão do usuário; confirmar S2 real em produção (P24).
- **Ultimo Progresso:** Commit `8287057` (feat: biblioteca digital — busca agregada, download e leitor PDF): typecheck, lint, 31 testes e build revalidados antes do commit; `.gitignore` corrigido (`.env.example` comittável, `.obsidian/` ignorado); 4 `.gitkeep` obsoletos removidos.

---

## 1. Objetivo Principal

Construir uma **Biblioteca Digital** com:

1. **Busca web de PDFs:** o usuário pesquisa por termo/título/autor e o sistema consulta múltiplas fontes externas, agregando resultados com link direto para o arquivo PDF.
2. **Download direto:** possibilidade de baixar o PDF encontrado a partir da aplicação.
3. **Leitor integrado:** visualização do PDF no próprio navegador, sem sair da aplicação.

---

## 2. Arquitetura Inicial

```
Frontend (Next.js)
      │  fetch /api/...
      ▼
Backend (Route Handlers)
      │  chama providers
      ▼
Módulo de Scraping/Busca (services/search)
      │  fontes externas (APIs abertas / busca web)
      ▼
PDF (link direto) → download/proxy → leitor integrado
```

### 2.1 Frontend

* **Stack:** Next.js (App Router) + TypeScript + Tailwind CSS + HTML semântico.
* **Páginas candidatas:**
  * `/` — página inicial com barra de busca.
  * `/busca` — listagem de resultados agregados (cards).
  * `/documento/[id]` — detalhes do documento + leitor integrado.
* **Componentes candidatos:** `SearchBar`, `ResultCard`, `PdfViewer`, `DownloadButton`, `SkeletonList`, `EmptyState`, `ErrorState`, `PageHeader`.
* **Leitor integrado:** PDF.js no navegador (via `react-pdf` ou integração direta). `ESCOLHA DA BIBLIOTECA AINDA NÃO VALIDADA`.
* Cliente de API em `lib/` + tipos em `types/`. Estado local suficiente para a primeira versão (sem store global).

### 2.2 Backend

* **Stack:** Node.js + Next.js Route Handlers (API REST).
* **Endpoints candidatos:**
  * `GET /api/busca?q=...` — agregação e retorno dos resultados.
  * `GET /api/documento/[id]` — metadados do documento.
  * `GET /api/download/[id]` — proxy de download em stream do PDF.
  * `GET /api/proxy?url=...` — proxy para o leitor (contornar CORS ao buscar PDF remoto). `NECESSITA VALIDAÇÃO DE SEGURANÇA`.
* **Camadas:** `services/` (integrações), `schemas/` (validação Zod), `types/`, `lib/` (utils).
* **Princípios:** validação de entrada no backend (Zod), rate limiting, contrato de API previsível (`ApiResponse<T>` / `ApiError`), segredos apenas no backend, nunca confiar em dados enviados pelo cliente.

### 2.3 Módulo de Scraping/Busca

* **Camada:** `services/search/` com um **provider por fonte** e interfaces comuns (port pattern), permitindo adicionar/remover fontes sem alterar a regra central.
* **Fontes candidatas (a validar antes da implementação):** APIs abertas e documentadas como OpenAlex, arXiv, DOAJ, Google Books, Semantic Scholar. `LISTA NÃO VALIDADA — requerida pesquisa externa na fase de implementação`.
* **Busca web de PDFs:** avaliar API oficial de busca (ex.: Google Custom Search JSON API) vs. crawler próprio (com respeito a `robots.txt`, rate limit e termos de uso). `DECISÃO PENDENTE`.
* **Fluxo:** normalização do termo → consulta paralela aos providers → deduplicação → extração de metadados e do link direto do PDF → rankeamento simples → resposta formatada.
* **Download:** proxy no backend faz stream do arquivo, valida MIME `application/pdf` e aplica limite de tamanho — nunca confiar só na extensão da URL.
* **Cache:** curto período de cache de resultados para evitar requisições repetidas a fontes externas.

---

## 3. Stack Tecnológica (definida)

| Camada | Stack |
|---|---|
| Frontend | React, Next.js, TypeScript, Tailwind CSS |
| Backend | Node.js, Next.js Route Handlers, API REST |
| Validação | Zod (a confirmar na instalação) |
| Scraping | Node/TypeScript no backend (Python permitido para scripts auxiliares) |
| Infra (futuro) | Vercel, Git/GitHub |

---

## 4. Fase 0 — Fundação Concluída (16/09/2026)

### 4.1 Scaffolding (VALIDADO)

* **Stack instalada (versões reais):**
  * Next.js `16.3.5` (App Router, Turbopack no dev/build)
  * React `19.2.8`
  * TypeScript `^5`
  * Tailwind CSS `^4` (`@tailwindcss/postcss`)
  * ESLint `^9` (`eslint-config-next` 16.3.5)
* **Scaffold gerado via `create-next-app` em diretório temporário e movido para a raiz**, pois o CLI recusa executar quando o destino contém arquivos (`memory/`). A pasta `memory/` foi preservada integralmente.
* **Pasta `memory/` intacta** — nenhum conteúdo alterado/apagado durante a movimentação (verificado antes e depois).
* **Dependências:** `npm install` concluído (365 pacotes, 0 vulnerabilidades).
* **Validação executada com sucesso:**
  * `npm run lint` → sem erros
  * `next typegen` + `tsc --noEmit` → OK
  * `npm run build` → OK (rota `/` estática)

### 4.2 Estrutura de Pastas

```
src/
├── app/
│   └── api/          (Route Handlers — Fase 1)
├── components/       (vazio, .gitkeep)
├── lib/              (vazio, .gitkeep)
├── schemas/          (vazio, .gitkeep — validação Zod na Fase 1)
├── services/
│   └── search/       (vazio, .gitkeep — providers na Fase 2)
└── types/            (contrato de API e domínio)
```

### 4.3 Contrato de API e Tipos Base (definidos)

* `src/types/api.ts` — `ApiResponse<T>` (padrão `{ data, error: null }`) e `ApiError` (`{ data: null, error: { code, message, details? } }`).
* `src/types/documento.ts` — `Documento` (id, titulo, autores, fonte, urlPdf, urlPagina, descricao, dataPublicacao, tamanhoBytes) e `Fonte` (union: openalex | arxiv | doaj | google-books | semantic-scholar).
* `src/types/busca.ts` — `ResultadoBusca` (consulta, total, documentos).
* `src/types/index.ts` — re-exports.
* `src/app/layout.tsx` — `lang="pt-BR"`, metadata "Biblioteca Digital" (título/descrição).

### 4.4 Observações

* **Typed routes do Next 16:** tipos como `LayoutProps` são gerados em `.next/` por `next typegen` (dev/build). `tsc --noEmit` isolado falha antes do primeiro `next typegen`/`build`.
* **Git:** repositório **não inicializado** (`create-next-app` rodou com `--disable-git`). Decidir se `git init` será feito.

---

| Camada | Stack |
|---|---|
| Frontend | React, Next.js, TypeScript, Tailwind CSS |
| Backend | Node.js, Next.js Route Handlers, API REST |
| Validação | Zod `4.6.5` (instalada) |
| Scraping | Node/TypeScript no backend (Python permitido para scripts auxiliares) |
| Infra (futuro) | Vercel, Git/GitHub |

---

## 5. Fase 1 — Backend (API) Concluída (17/09/2026)

### 5.1 Rotas (VALIDADAS funcionalmente via dev server)

* `GET /api/busca?q=...&limite=...` — validação Zod (`q` 2–200 caracteres; `limite` inteiro 1–50, padrão 20), parâmetros extras rejeitados (400), rate limiting, contrato `ApiResponse<ResultadoBusca>`. Sem providers ainda → retorna `{ consulta, total: 0, documentos: [] }`.
* `GET /api/documento/[id]` — `id` validado por regex `^[A-Za-z0-9._-]+$` (máx. 128). Sem fonte de dados ainda → `404 NOT_FOUND` para ids válidos.
* `GET /api/download/[id]` — valida id, resolve documento (404 se ausente), faz stream do PDF com validação MIME, limite de tamanho e `Content-Disposition: attachment`.
* `GET /api/proxy?url=...` — guard anti-SSRF (apenas https/443, sem credenciais, bloqueio de IPs privados/reservados via `node:net` `BlockList` + resolução DNS verificada, whitelist opcional de domínios), stream do PDF com `Content-Disposition: inline` para o leitor integrado.

### 5.2 Libs criadas

* `src/lib/config.ts` — leitura de env com fallback (`RATE_LIMIT_MAX_REQUESTS=30`, `RATE_LIMIT_WINDOW_MS=60000`, `PROXY_MAX_SIZE_BYTES=50MB`, `PROXY_TIMEOUT_MS=30s`, `PROXY_ALLOWED_HOST_SUFFIXES=`).
* `src/lib/api.ts` — helpers `ok`/`fail` (contrato `ApiResponse`/`ApiError`), códigos de erro, `formatZodErrors`.
* `src/lib/rate-limit.ts` — fixed window em memória por IP+rota, com headers `X-RateLimit-Limit/Remaining` e `Retry-After` no 429.
* `src/lib/url-guard.ts` — `assertPublicHttpsUrl` (ver decisão D9).
* `src/lib/pdf.ts` — `fetchPdf` com timeout, verificação de `content-type`, verificação prévia de `content-length` e corte de stream ao exceder o limite (`PdfError` → mapeamento de status HTTP).

### 5.3 Schemas e serviços

* `src/schemas/` — `buscaQuerySchema`, `documentoIdSchema`, `proxyQuerySchema` (Zod).
* `src/services/search/agregador.ts` — `executarBusca` retorna resultado vazio (stub documentado; providers na Fase 2).
* `src/services/documentos.ts` — `buscarDocumentoPorId` retorna `null` (stub documentado; fonte de dados na Fase 2).
* `.env.example` — variáveis de servidor documentadas (sem valores reais).

### 5.4 Validação executada

* `npm run lint` → sem erros (após configurar `argsIgnorePattern: ^_` para stubs da Fase 2).
* `next typegen` + `tsc --noEmit` → OK.
* `npm run build` → OK (rotas `/api/*` listadas como dinâmicas `ƒ`).
* **Testes funcionais via `next dev` (porta 3100) + curl — todos OK:**
  * `busca?q=quantum` → 200 `{ consulta, total: 0, documentos: [] }`.
  * `busca` sem `q`, `q=a`, `limite=999`, param extra → 400 `VALIDATION_ERROR`.
  * `documento/abc-123` → 404; id com caracteres inválidos → 400; `download/abc-123` → 404.
  * `proxy?url=http://localhost` → 400; `https://127.0.0.1/x.pdf` → 403.
  * `proxy` com `https://example.com` (HTML) → 502 `INVALID_MEDIA_TYPE`.
  * **`proxy` com PDF real do arXiv (1706.03762v5) → 200, `application/pdf`, 2.2MB baixados com magic `%PDF-`.**
  * **Rate limit: 30× 200 seguidos de 5× 429 com `Retry-After: 59` e corpo `RATE_LIMIT_EXCEEDED`.**

### 5.5 Limitações conhecidas (Fase 1)

* Rate limiting é **em memória por instância** — em produção com múltiplas instâncias será necessário store distribuída (ex.: Upstash Redis) e chave por usuário autenticado quando houver login.
* Guard anti-SSRF não cobre **DNS rebinding** (TOCTOU entre resolução e fetch) — aceitável para desenvolvimento; endurecer antes de produção.
* Documento/download retornam 404 até a Fase 2 fornecer fonte de dados e ids reais.

---

## 6. Fase 2 — Módulo de Scraping/Busca Concluída (17/09/2026)

### 6.1 Fontes validadas (docs oficiais + requisições reais)

* **OpenAlex** — `GET /works?search=&per-page=&select=` (JSON) e `GET /works/{id}`. PDF via `best_oa_location.pdf_url`; fallback de página via `landing_page_url`/doi. Sem chave (pool anônimo); `mailto` opcional via `OPENALEX_MAILTO`.
* **arXiv** — `GET /api/query?search_query=all:&start=&max_results=&sortBy=relevance` (Atom XML) e `?id_list=` por id. PDF via link `title="pdf"`; Atom parseado com `fast-xml-parser@5.11.1` (nova dependência, 0 vulnerabilidades).
* **DOAJ** — `GET /api/search/articles/{query}?page=&pageSize=` (JSON) e `/id:{id}` por id. PDF via `link` com `content_type === "PDF"`; query com escape Lucene. Registros só-HTML retornam `urlPdf: null` (honesto).

### 6.2 Arquivos criados

* `src/services/search/types.ts` — interface `SearchProvider` (`fonte`, `buscar`, `buscarPorId`).
* `src/services/search/http.ts` — `fetchTexto` (timeout 15s configurável, User-Agent próprio), `ProviderError`, `somenteHttp`/`paraHttps`.
* `src/services/search/openalex.ts`, `arxiv.ts`, `doaj.ts` — um provider por fonte, respostas externas validadas com Zod, entradas inválidas descartadas.
* `src/services/search/agregador.ts` — `Promise.allSettled` (falha isolada por provider + `console.warn`), dedup por título normalizado (sem acentos/pontuação) e por URL de PDF, ranking simples (PDF +2, termo no título +1), cache em memória 5min (máx. 200 entradas).
* `src/services/documentos.ts` — parse de id `fonte_externalId` → delega ao provider (`openalex_W…`, `arxiv_…`, `doaj_…`).
* `src/lib/config.ts` + `.env.example` — `SEARCH_TIMEOUT_MS`, `SEARCH_CACHE_TTL_MS`, `OPENALEX_MAILTO`.

### 6.3 Validação executada

* `tsc --noEmit` ✅ | `npm run lint` ✅ | `npm run build` ✅.
* **Funcional via dev server (fontes reais):**
  * `busca?q=quantum&limite=6` → 200, 6 docs (OpenAlex + DOAJ, com PDFs).
  * `busca?q=quantum&limite=20` → 20 docs (9 OpenAlex + 11 arXiv).
  * `documento/arxiv_2211.02350v1` → metadados completos + PDF `https://arxiv.org/pdf/2211.02350v1`.
  * `documento/openalex_W2781738013` → título + PDF da editora.
  * `documento/doaj_000234f8…` → título + página (pdf null, registro só-HTML).
  * `documento/arxiv_0000.00000` → 404 `NOT_FOUND`.
  * **`download/arxiv_2211.02350v1` → 200 `application/pdf` (~490KB, magic `%PDF-`) — download ponta a ponta validado.**

### 6.4 Limitações conhecidas (Fase 2)

* Busca multi-termo no arXiv vira OR (`all:quantum OR all:computing`); ranking por relevância mitiga.
* Datas DOAJ com dia desconhecido usam formato parcial `YYYY-MM`/`YYYY`.
* Providers sem resposta (ex.: timeout do arXiv na 1ª chamada fria) são isolados; a busca retorna as demais fontes.

---

## 7. Próximos Passos

1. **Fase 5 — Qualidade e Deploy:** testes permanentes das regras críticas, hardening de produção (P7/P8), verificação de magic bytes na origem (P14), deploy Vercel.

Detalhamento das tarefas em `memory/TODO.md`.

---

## 8. Fase 3 — Frontend Concluída (17/09/2026)

### 8.1 Páginas (VALIDADAS via E2E Playwright 11/11)

* **`/`** — hero com `SearchBar` (form GET nativo → `/busca`), seção explicativa; Server Component estático.
* **`/busca`** — valida `q`/`limite` com `buscaQuerySchema` no servidor; busca válida → `SearchResults` (client, fetch `/api/busca`); inválida → `EmptyState` orientando o formato. Loading, erro (com "Tentar novamente") e empty state cobertos.
* **`/documento/[id]`** — Server Component com `PageProps<"/documento/[id]">` (params assíncronos) + `DocumentoClient`; mostra metadados (título, autoria, data formatada pt-BR, descrição), badge da fonte, `DownloadButton` (blob + `<a download>`), links seguros "Abrir PDF na origem" e "Página da publicação".

### 8.2 Componentes reutilizáveis criados

* `search-bar.tsx` (Server, sem JS de cliente), `result-card.tsx`, `query-states.tsx` (`LoadingState`, `EmptyState`, `ErrorState` com botão de retry), `download-button.tsx` (client, blob download com tratamento de erro/429), `use-api.ts` (hook genérico com AbortController, validação Zod do envelope e retry), `documento-client.tsx`, `search-results.tsx`.
* `src/lib/apresentacao.ts` — `nomesFontes`, `formatarData` (datas `YYYY`/`YYYY-MM`/`YYYY-MM-DD` conforme D23), `linkExternoSeguro` (só http/https sem credenciais).
* `src/schemas/respostas.ts` — `documentoRespostaSchema`/`buscaRespostaSchema` (Zod) usados no cliente para validar o envelope da API.
* `layout.tsx` — skip link "Pular para o conteúdo" (primeiro elemento focável por teclado), `id="conteudo"` nas páginas.

### 8.3 Validação executada

* `npm run typecheck` (agora `next typegen && tsc --noEmit`) ✅ | `npm run lint` ✅ | `npm run build` ✅ (rotas `ƒ /busca` e `ƒ /documento/[id]` dinâmicas).
* **E2E real via Playwright (Chromium, dev server): 11/11 OK** — home h1/skip link/skip por Tab; busca "quantum computing" → 20 cards; empty state para `q=q` (2 ocorrências); documento arXiv com título; download real `magic=%PDF-`; alerta acessível no 404.
* Diagnóstico provou funcionamento real: `EMPTY` DOM mostrava o estado vazio; download via botão OK (`%PDF-`); falhas anteriores eram dos seletores do teste (bloqueio `minLength=2` no submit de "q", texto sem acento, locator ambíguo `[role=alert]` que casava também com o route announcer do Next).

### 8.4 Limitações conhecidas (Fase 3)

* Download de PDFs de editoras com HTML (ex.: IOP via OpenAlex) retorna 502 `INVALID_MEDIA_TYPE` da API — comportamento correto; a UI exibe o erro. Filtrar `urlPdf` não-PDF na origem é melhoria futura (Fase 5).
* Busca navega via GET nativo (sem client-side router push); suficiente para o escopo.
* Testes E2E residem em diretório temporário (Playwright instalado fora do projeto, sem alterar `package.json`) — automatização permanente fica para a Fase 5.
---

## 9. Fase 4 — Leitor Integrado Concluída (17/09/2026)

### 9.1 Implementação (VALIDADA via E2E Playwright 6/6)

* **`pdfjs-dist@6.3.289` direto** (sem `react-pdf`); worker `pdf.worker.min.mjs` servido como asset estático em `public/` (`GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs"`).
* **`src/components/pdf-viewer.tsx`** (client): busca o PDF via `/api/proxy?url=` (passa pelo guard anti-SSRF + validação MIME), renderiza até 20 páginas em `<canvas>` (escala 1.5), com cleanup (cancel de renders + `destroy()` da loading task no unmount) e erro acessível (`role="alert"`).
* **Integração em `documento-client.tsx`:** botão "Ler no navegador" (só quando `urlPdf` existe); `PdfViewer` via `next/dynamic` com `ssr: false` + fallback de loading — PDF.js nunca entra no bundle inicial nem no SSR.
* **Leitor oculto quando não há PDF direto** (ex.: DOAJ só-HTML) — validado em teste.

### 9.2 Validação executada

* `npm run typecheck` ✅ | `npm run lint` ✅ | `npm run build` ✅ (após corrigir `destroy()` na loading task — ver P16 — e ignorar `public/**/*.mjs` no ESLint — ver P17).
* **E2E real (Chromium, dev server): 6/6 OK** — botão presente; seção montada ao clicar; **10 canvas renderizados (918x1188)**; zero erros de página; leitor oculto sem PDF.
* **Screenshot confirma renderização visual real** da 1ª página do paper Tierkreis (título, autores, abstract) — não é canvas em branco.

### 9.3 Limitações conhecidas (Fase 4)

* Teto de 20 páginas na pré-visualização (decisão de performance; download completo via botão).
* Sem controles de zoom/paginação ainda — leitura é por scroll contínuo. Melhoria futura.
* Worker minificado versionado junto do `pdfjs-dist` em `public/` — atualizar o arquivo ao trocar a versão da lib.

---

## 10. Fase 5 — Qualidade e Deploy Concluída (17/09/2026)

### 10.1 Testes permanentes (Vitest — 31/31 OK)

* `npm test` (`vitest run`, config `vitest.config.mts` com alias `@/`): 6 arquivos, 31 testes.
* Cobertura das regras críticas: envelope `ok`/`fail` + `formatZodErrors`; rate limiting (limite, isolamento por rota, expiração de janela, headers); schemas Zod (busca/documento/proxy, casos válidos e inválidos); dedup/ranking/normalização do agregador; guard anti-SSRF (protocolo, credenciais, porta, hostnames/IPs bloqueados, IP público permitido); stream de PDF (magic válido, magic dividido, HTML rejeitado, stream curto, oversize).
* Os testes do stream revelaram e forçaram a correção de 2 bugs reais (deadlock do `pull` e perda de bytes do cabeçalho) — ver P18.

### 10.2 Hardening de segurança

* **P7 (mitigado):** `RateLimitStore` plugável (`MemoryRateLimitStore` padrão + `setRateLimitStore()` para futura store Redis); testes determinísticos com store fresca por teste. Residual: store distribuída real ainda pendente para multi-instância.
* **P8 (mitigado):** `src/lib/pinned-fetch.ts` — conexão TLS via `node:https` com `lookup` customizado que retorna SOMENTE o IP verificado pelo guard; redirects (máx. 5) revalidados pelo guard a cada hop; SNI/Host preservados pelo hostname. `fetchPdf` migrado para esse caminho. Residual: sem pinning, TOCTOU eliminado na conexão; documentado.
* **P14 (resolvido):** `streamPdfValidado` verifica magic bytes `%PDF-` nos 5 primeiros bytes do stream (com buffer entre chunks), além do MIME e do tamanho. Pré-checagem nos providers foi avaliada e rejeitada (custo de N requisições por busca); a validação no ponto de entrega (proxy/download/leitor) mitiga 100% do risco ao usuário. Ver D35.

### 10.3 Artefatos de deploy

* `README.md` reescrito (projeto real: scripts, envs, API, deploy Vercel, limitações de produção).
* `next.config.ts`: `poweredByHeader: false`.
* Deploy Vercel: zero config adicional (framework autodetectado); envs opcionais com fallback seguro.

### 10.4 Validação total executada

* `npm run typecheck` ✅ | `npm run lint` ✅ | `npm run build` ✅ | `npm test` 31/31 ✅.
* **Funcional (proxy no novo stack):** PDF arXiv → 200 + magic; HTML → 502; `127.0.0.1`/`10.0.0.1` → 403; busca/documento/download OK.
* **E2E completo (Chromium): 15/15 OK** — home, busca (20 cards), empty state, documento, download `%PDF-`, leitor (canvas 918x1188), leitor oculto sem PDF, 404, zero erros de página + screenshot do leitor com página real.

---

## 11. Commit inicial (18/09/2026)

* Repo git inicializado (`master`, commit `8287057`), 69 arquivos, working tree limpo.
* Revalidado antes do commit: `typecheck` ✅ | `lint` ✅ | `test` 31/31 ✅ | `build` ✅ (tabela de rotas idêntica à documentada).
* Correções aplicadas: `.gitignore` com `!.env.example` (o pattern `.env*` o excluía) e `.obsidian/` ignorado; 4 `.gitkeep` obsoletos removidos.
* Pendente: `git remote add origin <url>` + `git push -u origin master`, depois importar na Vercel pelo painel.
* 18/09/2026 — push executado: remoto `origin` = `github.com/Allanlugui/biblioteca-digital`, branch `master` com upstream configurado. Próximo: import na Vercel.

---

## 12. Bloco 0 — Auditoria (prompt mestre, sem alterar código)

### O que existe e funciona (validado)
* Busca agregada: OpenAlex, arXiv, DOAJ, Semantic Scholar (+ Web com chave) com isolamento por provider, cache 5min, dedup por título/URL, ranking simples.
* Ficha do documento, download direto, proxy com guard anti-SSRF, leitor-livro paginado, ingest no Supabase Storage por hash.
* Auth magic link + estante + histórico + progresso (servidor e localStorage), RLS default deny.
* 46 testes Vitest, typecheck, lint, build verdes; E2E reais executados por fase.

### Lacunas mapeadas (ordem dos blocos)
* A: `Documento` sem doi/citações/referências/assuntos/idioma/tipo; sem camada de normalização única.
* B: busca só `q`+`limite`; sem filtros (data, fonte, tipo, PDF), ordenação ou paginação.
* C: dedup sem DOI/identificadores fortes, sem "disponível em N fontes".
* D: ficha sem resumo/DOI/citações/assuntos (depende do Bloco A).
* E: leitor sem zoom, busca no texto, tela cheia.
* F: sem coleções; histórico/estante exigem login (decisão: manter auth, sem modo local além do progresso anônimo atual).
* G/H: sem citações nem relacionados. J: sem PWA, sitemap, robots, OG.
* K: rate-limit em memória; Storage gratuito 1GB; S2 429 sem chave.

### Riscos e preservação
* Não reescrever: serviços, guard, contratos e RLS ficam; evoluir por acréscimo.
* Web/S2 degradam com graça sem chave — preservar esse comportamento.
* `memory/` e `.env.local` (gitignored) intocados.
