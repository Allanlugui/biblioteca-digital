# Decisões Arquiteturais (biblioteca-digital) 

## 16/09/2026 — Fase 0 (Scaffolding)

### D1. Geração do scaffold fora do repositório
- **Decisão:** gerar o projeto via `create-next-app` em diretório temporário (`C:\Users\jalla\AppData\Local\Temp\opencode`) e mover o conteúdo para a raiz do projeto.
- **Contexto:** o CLI do `create-next-app` recusa-se a executar quando o diretório destino contém arquivos (no caso, `memory/`).
- **Motivo:** preservação absoluta da pasta `memory/` (Regra de Ouro) e criação do scaffold sem interação manual.
- **Alternativas consideradas:** executar no root (bloqueado pelo próprio CLI); excluir `memory/` (rejeitado — violaria a Regra de Ouro).
- **Impacto:** `memory/` permaneceu intacta (verificado antes e depois da movimentação).

### D2. Layout com `src/` (src-dir) e Turbopack
- **Decisão:** usar `--src-dir` (estrutura `src/app`, `src/components`, etc.) e Turbopack como bundler dev/build.
- **Motivo:** alinhamento com a estrutura de pastas definida na arquitetura inicial; Turbopack é o bundler padrão atual do Next.js 16.
- **Impacto:** código passa a residir sob `src/`; import alias `@/* → ./src/*`.

### D3. Versionamento real da stack
- **Decisão:** registrar as versões efetivamente instaladas (Next.js 16.3.5, React 19.2.8, Tailwind v4, TS ^5, ESLint 9) como referência.
- **Motivo:** regra de versionamento dos padrões globais; evita suposição de versões em sessões futuras.
- **Impacto:** nenhum em runtime; documentação fiel ao estado real da instalação.

### D4. Contrato de API: `ApiResponse<T>` / `ApiError`
- **Decisão:** adotar os formatos `{ data: T; error: null }` e `{ data: null; error: { code; message; details? } }`, com union de fontes validada por tipo `Fonte`.
- **Motivo:** padrões de contrato de API dos padrões globais (`padroes-codigo.md` §10); respostas previsíveis e erros estruturados.
- **Alternativas consideradas:** envelope com `success` bool — descartado por redundância com a presença de `error`.
- **Impacto:** define o formato de todas as respostas HTTP das fases seguintes.

### D5. Tipos de domínio em `types/` (ainda sem Zod)
- **Decisão:** definir os tipos base (`Documento`, `ResultadoBusca`, `Fonte`) em `src/types/` nesta fase; o Zod será adicionado na Fase 1 apenas onde houver validação runtime real.
- **Motivo:** não adicionar dependência sem necessidade (princípio de menor complexidade); tipagem estática não substitui validação runtime, que chega com os endpoints.
- **Impacto:** `src/schemas/` permanece vazia até a Fase 1.

### D6. Git ainda não inicializado
- **Decisão:** scaffolding criado com `--disable-git`; repositório Git **não** inicializado até nova decisão.
- **Motivo:** evitar commit automático de scaffold sem autorização explícita; preserva o working tree original.
- **Impacto:** pendente decisão de `git init`/primeiro commit.

## 17/09/2026 — Fase 1 (Backend/API)

### D7. Helpers de resposta `ok`/`fail` com envelope de contrato
- **Decisão:** centralizar respostas HTTP em `src/lib/api.ts` (`ok`, `fail`, `formatZodErrors`) usando `Response.json` nativo com o envelope `{ data, error }` definido nos tipos.
- **Motivo:** garantir formato previsível em todas as rotas e mapear erros Zod para `details.issues` estruturados.
- **Impacto:** qualquer nova rota deve usar os helpers; mudança de formato é feita em um único lugar.

### D8. Rate limiting em memória (fixed window) por IP+rota
- **Decisão:** `src/lib/rate-limit.ts` com janela fixa, chave `{ip}|{rota}` e headers `X-RateLimit-Limit/Remaining` + `Retry-After` no 429. Padrão 30 req/60s por rota, configurável por env.
- **Contexto:** sem framework de middleware dedicado para não adicionar dependência (menor complexidade); escopo por rota evita que rajadas legítimas do proxy bloqueiem a busca.
- **Limitação assumida:** reset de contadores ao reiniciar e sem coordenação entre instâncias → documentado como pendência de produção (P7, Fase 5/Hardening).
- **Impacto:** logs de validação funcional: 30×200 seguidos de 429 com `Retry-After`.

### D9. Guard anti-SSRF com `BlockList` do Node + verificação de DNS
- **Decisão:** `src/lib/url-guard.ts` (`assertPublicHttpsUrl`): somente `https`, sem credenciais, somente porta 443, bloqueio de hostnames `.local/.internal/.localhost/...`, bloqueio de IPs literais privados/reservados e **verificação de todos os endereços resolvidos via `lookup`**; whitelist opcional via `PROXY_ALLOWED_HOST_SUFFIXES`.
- **Contexto:** o `/api/proxy` busca URLs arbitrárias enviadas pelo cliente — SSRF é o risco principal.
- **Descoberta técnica:** `BlockList.addSubnet('::ffff:0:0', 96, 'ipv6')` faz `check(ipv4)` retornar `true` para **todos** os IPv4 (o Node trata IPv4 como mapeado). Removida essa faixa — o Node já mapeia `::ffff:x.y.z.w` automaticamente para as faixas IPv4 (ver problema P5).
- **Motivo de não usar lib externa:** `node:net` `BlockList` é nativa, testada e sem dependências (regra de dependências).
- **Impacto:** `proxy` retorna 400 (`INVALID_URL`), 403 (`DESTINATION_BLOCKED`) ou 502 (`RESOLUTION_FAILED`) antes de qualquer fetch.

### D10. Proxy de PDF por streaming com limites
- **Decisão:** `src/lib/pdf.ts` (`fetchPdf`): timeout configurável, exigência de `content-type` de PDF, rejeição prévia por `content-length` acima do limite e corte de stream via `ReadableStream` contadora ao exceder o máximo (padrão 50MB). Erros internos mapeados para HTTP (`PdfError.toFail`: 502 upstream/MIME, 413 tamanho, 504 timeout).
- **Tipos MIME aceitos:** `application/pdf`, `application/x-pdf`, `application/octet-stream` — este último incluído porque muitos hosts reais servem PDFs assim; a validação continua estrita quanto a conteúdo não-PDF (ex.: HTML rejeitado).
- **Respostas:** `download` → `attachment` (download direto); `proxy` → `inline` (leitor integrado) com `X-Content-Type-Options: nosniff`.
- **Impacto:** validado com PDF real do arXiv (2.2MB, magic `%PDF-`).

### D11. Rotas dinâmicas explícitas
- **Decisão:** `export const dynamic = "force-dynamic"` em todas as rotas `/api/*` (convenção da doc oficial desta versão do Next).
- **Motivo:** rotas usam `request.url`/headers (runtime) — garantir renderização sob demanda e evitar pré-render acidental no build.
- **Impacto:** build lista as 4 rotas como dinâmicas (`ƒ`).

### D12. Rejeição de query params desconhecidos
- **Decisão:** `busca` e `proxy` retornam 400 `VALIDATION_ERROR` quando recebem parâmetros fora de `["q","limite"]` / `["url"]`.
- **Motivo:** segurança por padrão e contrato previsível (não confiar em entrada do cliente).
- **Impacto:** clientes devem enviar apenas os parâmetros documentados.

### D13. Stub de serviços sem inventar dados
- **Decisão:** `executarBusca` retorna `{ total: 0, documentos: [] }`; `buscarDocumentoPorId` retorna `null` (→ 404 nas rotas) até a Fase 2.
- **Motivo:** regra "não inventar implementações" — endpoints honestos mantendo o contrato.
- **Impacto:** `documento`/`download` ficam 404 até a fonte de dados existir; `busca` retorna vazio.

### D14. Configuração do ESLint para stubs (`^_`)
- **Decisão:** `eslint.config.mjs` com `@typescript-eslint/no-unused-vars` `argsIgnorePattern/varsIgnorePattern: ^_` (mantém nível error).
- **Motivo:** permitir parâmetros nomeados ainda não utilizados dos stubs da Fase 2 (`_id`, `_limite`) sem poluir o lint com warnings.
- **Impacto:** `npm run lint` limpo.

## 17/09/2026 — Fase 2 (Scraping/Providers)

### D15. APIs oficiais, sem crawler próprio
- **Decisão:** mecanismo de busca = APIs oficiais documentadas (OpenAlex, arXiv, DOAJ); nenhum crawler/scraper próprio.
- **Contexto:** STATUS previa avaliar API oficial vs. crawler (respeito a `robots.txt`, rate limit, termos de uso).
- **Motivo:** menor complexidade operacional, sem risco de bloqueio por scraping, cobertura suficiente para literatura aberta; crawler traria manutenção e risco jurídico sem benefício proporcional.
- **Impacto:** "busca web de PDFs" = agregação das 3 APIs; Google Books/Semantic Scholar seguem candidatos não validados, fora do escopo.

### D16. Port pattern `SearchProvider`
- **Decisão:** interface em `services/search/types.ts` (`fonte`, `buscar(termo, limite, signal?)`, `buscarPorId(externalId, signal?)`); um arquivo por fonte; agregador orquestra sem conhecer detalhes de cada API.
- **Motivo:** adicionar/remover fontes sem alterar a regra central (previsto na arquitetura inicial).
- **Impacto:** nova fonte = novo arquivo + registro em 2 listas (`agregador.ts`, `documentos.ts`).

### D17. Ids opacos `fonte_externalId`
- **Decisão:** id do documento = `{fonte}_{externalId}` (ex.: `arxiv_2211.02350v1`); `/` de ids antigos do arXiv vira `_` na ida e volta na volta (`reverterIdExterno`), seguro porque ids do arXiv nunca contêm `_` naturalmente.
- **Motivo:** compatibilidade com `documentoIdSchema` (`^[A-Za-z0-9._-]+$`, sem `:` nem `/` que quebrariam o path param) sem inventar store persistente — `buscarDocumentoPorId` refaz a consulta à fonte.
- **Impacto:** `documento/[id]` e `download/[id]` funcionam sem banco; ids estáveis enquanto a fonte mantiver o registro.

### D18. Dedup por título normalizado + URL de PDF; ranking simples
- **Decisão:** normalização (minúsculas, sem diacríticos/pontuação); mesma chave de título ou mesmo PDF = duplicata (mantém o primeiro); score = PDF +2 e +1 por termo da consulta no título, desempate estável.
- **Motivo:** implementa o "rankeamento simples" da arquitetura sem overengineering.
- **Impacto:** resultados com PDF direto sobem; DOAJ só-HTML tende a ranquear abaixo.

### D19. Cache curto em memória
- **Decisão:** `Map` chave `consulta|limite`, TTL 5min (`SEARCH_CACHE_TTL_MS`), teto de 200 entradas com evicção da mais antiga.
- **Motivo:** evitar requisições repetidas às fontes externas (previsto na arquitetura).
- **Limitação assumida:** por instância, sem coordenação (mesma classe de P7).

### D20. `fast-xml-parser` para o Atom do arXiv
- **Decisão:** adicionar `fast-xml-parser@5.11.1` (pequena, sem dependências, mantida) em vez de regex manual sobre XML.
- **Motivo:** avaliação de dependência (regra 18): sem solução equivalente no projeto; parsing manual de Atom seria frágil.
- **Impacto:** `npm install` +373 pacotes auditados, 0 vulnerabilidades.

### D21. Validação runtime das respostas externas com Zod
- **Decisão:** cada provider valida o payload (JSON/XML parseado) com schema Zod mínimo e descarta entradas inválidas em vez de quebrar a agregação.
- **Motivo:** padrões globais §4 — nunca confiar em dados de terceiros; uma fonte com formato inesperado não pode derrubar as demais.
- **Impacto:** `ProviderError("…formato inesperado")` isolado pelo `allSettled`.

### D22. `urlPdf` apenas com link direto informado pela fonte
- **Decisão:** OpenAlex `best_oa_location.pdf_url`; arXiv link `title="pdf"`; DOAJ link `content_type === "PDF"`; caso contrário `null` (nunca montar URL de PDF por convenção).
- **Motivo:** regra "não inventar" — URL de PDF presumida quebraria download/leitor silenciosamente.
- **Impacto:** documentos sem PDF aparecem com link de página; download/leitor indisponíveis nesses casos.

### D23. Datas parciais `YYYY-MM`/`YYYY` quando o dia é desconhecido
- **Decisão:** DOAJ informa só ano/mês → persistir o que existe (`2024-11`), sem inventar dia `01`.
- **Motivo:** honestidade dos dados; ISO 8601 admite precisão reduzida.
- **Impacto:** frontend deve formatar datas parciais na Fase 3.

### D24. Falha isolada por provider
- **Decisão:** agregador com `Promise.allSettled`; provider que falha (timeout/HTTP/formato) gera `console.warn` com fonte+mensagem e a busca retorna as demais fontes.
- **Motivo:** fallbacks — integração externa não pode quebrar a aplicação (padrões §46).
- **Impacto:** observado na validação (timeout frio do arXiv não impediu resultados OpenAlex/DOAJ).

## 17/09/2026 — Fase 3 (Frontend)

### D25. Páginas `/busca` e `/documento/[id]` dinâmicas; `/` estática
- **Decisão:** home estática (prerender); `/busca` usa `PageProps` com `searchParams` e `/documento/[id]` usa `params` assíncronos via helpers globais gerados (`PageProps`, exigência do Next 16 + `next typegen`).
- **Motivo:** o template deste Next gera tipos de rota; `PageProps<'rota'>` dá type-safety sem import manual.
- **Impacto:** `package.json` ganhou script `typecheck: next typegen && tsc --noEmit` (typegen obrigatório antes do tsc — ver P3).

### D26. Busca via form GET nativo, sem JS de cliente na `SearchBar`
- **Decisão:** `<form action="/busca" method="get">` com Server Component.
- **Motivo:** menor JS enviado; funciona sem hidratação; validação HTML nativa (`minLength`, `maxLength`, `required`) como primeira camada.
- **Impacto:** submit com `q` curto é bloqueado pelo navegador; estado vazio da `/busca` cobre URLs diretas (`/busca?q=q`).

### D27. Fetch da API no cliente com validação Zod do envelope
- **Decisão:** hook `useApi(endpoint, schema)` valida `{ data, error: null }` com `buscaRespostaSchema`/`documentoRespostaSchema` antes de renderizar.
- **Motivo:** nunca confiar na resposta sem validar (padrões §4); erros de contrato viram erro de UI tratável, não tela branca.
- **Impacto:** `src/schemas/respostas.ts` espelha os tipos de `src/types` para validação runtime.

### D28. Download via blob no cliente
- **Decisão:** `DownloadButton` faz `fetch` do `/api/download/{id}`, valida `content-type: application/pdf`, converte em blob e dispara `<a download>` com `URL.createObjectURL`.
- **Motivo:** permite feedback real de erro (404/429/502) na UI — coisa que um `<a href>` direto não oferece; evita navegação do usuário para fora.
- **Impacto:** erros aparecem como alerta acessível `role="alert"`; revoke do blob após 1s.

### D29. Links externos sempre sanitizados
- **Decisão:** `linkExternoSeguro()` aceita só URLs http/https sem credenciais; senhas/usuário na URL ou outros schemes são descartados.
- **Motivo:** segurança por padrão ao renderizar dados de fontes externas (ex.: `javascript:` numa `urlPagina` maliciosa).
- **Impacto:** links inseguros simplesmente não aparecem na UI.

### D30. Playwright instalado fora do projeto para E2E
- **Decisão:** testes E2E executados com Playwright instalado em diretório temporário (`Temp\opencode`), sem adicionar dependência ao projeto.
- **Motivo:** validar de verdade a interface sem inflacionar `package.json` (regra de dependências); automação permanente será decidida na Fase 5.
- **Impacto:** screenshots e script de teste não residem no repositório; resultados registrados em STATUS.md.

## 17/09/2026 — Fase 4 (Leitor Integrado)

### D31. `pdfjs-dist` direto, sem `react-pdf`
- **Decisão:** integração direta com a lib oficial (`pdfjs-dist@6.3.289`); `react-pdf@11` avaliado e descartado.
- **Motivo:** `react-pdf` é uma camada extra sobre o mesmo `pdfjs-dist` (dependências transitivas: `clsx`, `dequal`, `es-toolkit`, etc.) sem benefício para o caso de uso (renderização simples por canvas); integração direta dá controle total do worker e do ciclo de vida.
- **Impacto:** +1 dependência direta auditada (0 vulnerabilidades); `react-pdf` nunca entrou no projeto.

### D32. Worker local em `public/`
- **Decisão:** copiar `pdf.worker.min.mjs` do pacote para `public/` e apontar `GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs"` (em vez de CDN).
- **Motivo:** segurança por padrão (sem dependência de terceiro em runtime), funcionamento offline da infra e versionamento atrelado ao pacote instalado.
- **Impacto:** ao atualizar `pdfjs-dist`, recopiar o worker; `public/**/*.mjs` ignorado no ESLint (ver P17).

### D33. Leitor sob demanda com `ssr: false`
- **Decisão:** botão "Ler no navegador" monta `PdfViewer` via `next/dynamic` (`ssr: false`); renderização limitada a 20 páginas em canvas com escala 1.5.
- **Motivo:** PDF.js + worker são pesados — não devem entrar no bundle inicial nem no SSR; usuário só paga o custo quando decide ler; teto de páginas limita memória/CPU.
- **Impacto:** primeiro clique carrega o chunk do viewer + worker; scroll contínuo sem paginação (melhoria futura).

### D34. Leitura sempre via `/api/proxy`
- **Decisão:** o viewer nunca busca a URL da fonte diretamente; usa `/api/proxy?url=` (guard anti-SSRF + validação MIME + limite de tamanho já validados).
- **Motivo:** contorna CORS do navegador e mantém a política de segurança centralizada; PDF.js recebe bytes já validados como PDF.
- **Impacto:** leitor indisponível quando `urlPdf` é nulo (comportamento correto e testado).

## 17/09/2026 — Fase 5 (Qualidade/Deploy)

### D35. Magic bytes no ponto de entrega, não nos providers
- **Decisão:** validar `%PDF-` dentro de `fetchPdf` (proxy/download/leitor); NÃO pré-verificar cada `urlPdf` nos providers.
- **Contexto:** P14 pedia verificação na origem do provider.
- **Motivo:** pré-checagem exigiria 1 requisição por candidato (até 150/busca) — latência e carga inaceitáveis; a validação no stream de entrega bloqueia 100% do conteúdo não-PDF antes de chegar ao usuário, que é onde o risco se materializa.
- **Impacto:** `urlPdf` continua "como informado pela fonte"; consumo sempre passa pela validação.

### D36. `RateLimitStore` plugável em vez de Redis imediato
- **Decisão:** interface `RateLimitStore` + `MemoryRateLimitStore` + `setRateLimitStore()`; sem conta/serviço externo nesta fase.
- **Motivo:** provisionar Upstash Redis exige decisão/conta do usuário (fora do escopo aprovável pelo agente); a abstração deixa a troca futura trivial e já permite testes determinísticos.
- **Impacto:** P7 passa a "mitigado com residual documentado"; README orienta a troca.

### D37. Fetch com IP fixado via `node:https` (sem pacote `undici`)
- **Decisão:** `pinned-fetch.ts` com `https.request` + `lookup` customizado; `undici` avaliado e descartado (não existe como pacote standalone neste setup — Next 16 não o expõe).
- **Motivo:** eliminar TOCTOU de DNS rebinding sem nova dependência, usando só Node stdlib; SNI/Host continuam pelo hostname (TLS íntegro).
- **Impacto:** proxy/download usam o novo caminho; providers (hosts fixos confiáveis) mantêm `fetch` global.

### D38. Vitest como runner permanente (+ `vite` peer)
- **Decisão:** `vitest` + `vite` (peer obrigatório) como devDependencies; `npm test` = `vitest run`; config `.mts` (evita warning de ESM/CJS).
- **Motivo:** avaliação de dependência: sem runner no projeto; Vitest é o padrão leve para TS/Vite-compatível, zero config relevante.
- **Impacto:** 31 testes em 6 arquivos, <1s de execução.

### D39. README de projeto + `poweredByHeader: false`
- **Decisão:** README do template substituído por documentação real (scripts, envs, API, deploy, limitações); header `X-Powered-By` removido.
- **Motivo:** artefatos mínimos de prontidão para produção; deploy Vercel segue zero-config.
- **Impacto:** nenhum em runtime além do header removido.

## 18/09/2026 — Commit inicial

### D40. `git init` + primeiro commit com `memory/` versionada
- **Decisão:** inicializar o repo local (branch `master`, commit `8287057`, 69 arquivos) incluindo `memory/` (STATUS/TODO/DECISOES/PROBLEMAS, sem segredos — verificado por busca); `.obsidian/` excluído via `.gitignore`.
- **Contexto:** D6 adiava o `git init`; `.env*` no `.gitignore` excluía `.env.example` (corrigido com `!.env.example`); 4 `.gitkeep` obsoletos removidos (pastas já têm conteúdo).
- **Motivo:** pronto-para-commit exigia working tree válido para GitHub/Vercel; `memory/` é doc operacional referenciada pelo README.
- **Impacto:** push pendente de `git remote add origin <url>`; deploy Vercel via import do painel (zero-config).

### D41. `@types/node@^24` para satisfazer peer do vitest
- **Decisão:** `@types/node` `^20` → `^24` (devDependency, só tipos — sem efeito em runtime).
- **Contexto:** P21 — `npm install` fresco na Vercel falhava (ERESOLVE) porque `vitest@5.0.1` exige `@types/node` `^22 || >=24`.
- **Motivo:** correção na causa (árvore de dependências válida) em vez de mascarar com `legacy-peer-deps`; runtime local já é Node 24.
- **Impacto:** lock regenerado; revalidado typecheck/lint/testes/build.

### D42. `urlPdf` sempre em https nos providers
- **Decisão:** OpenAlex e DOAJ aplicam `paraHttps` no `urlPdf` (arXiv já aplicava); `urlPagina` segue exibível em http.
- **Contexto:** P22 — fontes informam PDF em `http`, mas proxy/download exigem https.
- **Motivo:** corrigir na origem (um ponto por provider) em vez de relaxar o guard; upgrade para https é seguro e o `fetchPdf` continua validando MIME + magic bytes.
- **Impacto:** leitor e download passam a funcionar para PDFs http quando o host serve https.

## 18/09/2026 — Fase 6 (Redesign UI)

### D43. Identidade visual "sala de leitura": Fraunces + papel + verde-biblioteca
- **Decisão:** paleta única clara e quente (pergaminho `#f5f0e3`, velino, tinta marrom, verde `#123528`, dourado), serifada Fraunces para títulos + Inter para texto, header/footer verde-escuro com filete dourado; **sem** modo escuro automático (era a origem do visual "preto" reclamado).
- **Motivo:** aspecto de biblioteca clássica que transmite autoridade; um tema único evita inconsistências de contraste.
- **Impacto:** só apresentação — 12 arquivos em `app/` + `components/`; API, serviços e contratos intactos; validado com screenshots reais (home + busca com 20 docs, zero erros de página).

## 18/09/2026 — Fase 7 (Leitor-livro + pt-BR total)

### D44. Leitor paginado com deslizamento direcional
- **Decisão:** `PdfViewer` virou livro: uma página por vez em palco com perspectiva, animação de deslizamento conforme a direção (280ms, respeita `prefers-reduced-motion`), cache de canvas + pré-render de vizinhas, barra com anterior/próxima, indicador `Página X de N` com `aria-live`, slider de salto, setas do teclado e swipe no touch. Limite de 20 páginas mantido.
- **Motivo:** leitura por scroll contínuo não tinha aspecto de livro; folhear página a página com transição dá a sensação pedida.
- **Impacto:** contrato `PdfViewer({urlPdf})` preservado; validado com E2E real (Tierkreis, "Página 2 de 10", screenshot, zero erros).

### D45. Auditoria pt-BR + página 404 temática
- **Decisão:** varredura de strings visíveis em inglês — só havia código interno (nomes de componentes) e a 404 padrão do Next em inglês; criado `not-found.tsx` ("Esta página saiu da estante").
- **Impacto:** todo texto visível em pt-BR; `lang="pt-BR"` já existia.

## 18/09/2026 — Fase 8 (Volta da busca + erros amigáveis + Semantic Scholar)

### D46. "Voltar aos resultados" preserva a consulta via URL
- **Decisão:** `ResultCard` liga para `/documento/{id}?de={consulta}`; a página do documento valida `de` com `buscaQuerySchema` e o Voltar aponta para `/busca?q={de}` (ou `/busca` sem origem).
- **Motivo:** o Voltar antigo ia para `/busca` vazia e a pesquisa "sumia"; query na URL é compartilhável e sobrevive a reload.
- **Impacto:** validado em E2E real (volta com `q` preservado, 20 cards, zero erros).

### D47. Mensagens amigáveis para 400/502 no leitor
- **Decisão:** `mensagemAmigavel()` traduz o erro cru do PDF.js ("Unexpected server response (400/502)") para orientação em pt-BR apontando o botão de origem.
- **Impacto:** só apresentação do erro; sem mudança de comportamento HTTP.

### D48. Provider Semantic Scholar (4ª fonte)
- **Decisão:** `semanticscholar.ts` no padrão `SearchProvider` (Zod, `paraHttps` no PDF, ids `semantic-scholar_{paperId-hex40}`); registrado no agregador e em `documentos.ts`; env opcional `SEMANTIC_SCHOLAR_API_KEY` via header `x-api-key` (extensão retrocompatível de `fetchTexto`).
- **Contexto:** pedido de busca "universal"; S2 (~200M obras, inclui editoras fora das 3 fontes) é o maior passo sem chave obrigatória. Busca 100% da web exigiria API web com chave paga (Brave/Google) — fora do escopo sem decisão do usuário.
- **Impacto:** 3 testes novos com fetch mockado (39/39); integração real pendente de cota (P24); README e `.env.example` atualizados.

## 18/09/2026 — Fase 9 (Supabase: acervo universal + painel)

### D49. Postgres + Storage em vez de banco próprio
- **Decisão:** Supabase (`@supabase/supabase-js` + `@supabase/ssr`); sessão via `src/proxy.ts` (middleware depreciado no Next 16); magic link sem senha.
- **Motivo:** auth, banco e arquivos num só serviço gerenciado, sem operar infra; login opcional preserva leitura anônima.
- **Impacto:** 3 envs novas; sem chaves o app degrada com graça (proxy direto, sem estante).

### D50. Acervo universal por hash + ingest sob demanda
- **Decisão:** `GET /api/arquivo/[id]` serve do Storage (`pdfs/<sha256>.pdf`) ou arquiva da origem validada (guard + MIME + magic); dedup entre fontes pelo hash; contadores de acesso; toda ida ao Acervo com timeout e fallback para o proxy.
- **Impacto:** leitura repetida não bate na origem; PDFs validados uma vez.

### D51. RLS default deny + service-role só no servidor
- **Decisão:** `documentos`/`buscas_agregadas` leitura pública e escrita só service-role; `buscas`/`estante`/`progresso_leitura`/`perfis` com `auth.uid() = user_id`; bucket `pdfs` leitura pública e escrita só service-role; `buscas` individual só de logados, agregado sem PII sempre.
- **Impacto:** isolamento total entre usuários; migration em `supabase/migrations/0001_acervo.sql`.

### D52. Progresso híbrido (servidor + navegador)
- **Decisão:** viewer avisa a página (debounce); ficha grava PUT (logado) e `localStorage` (sempre); retomada: servidor primeiro, navegador como fallback.
- **Impacto:** anônimo continua de onde parou neste navegador; logado, em qualquer dispositivo.
