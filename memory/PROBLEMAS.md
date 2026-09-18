# Problemas e Limitações (biblioteca-digital) 

## 16/09/2026 — Fase 0

### P1. `create-next-app` recusa executar com arquivos existentes no destino — RESOLVIDO
- **Sintoma:** CLI aborta com "directory contains files that could conflict" por causa de `memory/`.
- **Causa:** o CLI valida o diretório destino e não permite arquivos não mapeados.
- **Resolução:** scaffold gerado em diretório temporário e movido para a raiz. `memory/` preservada.
- **Prevenção:** em futuras atualizações de scaffold, repetir o processo temp→raiz.

### P2. `npm install` falhou por erro de rede (ECONNRESET) — RESOLVIDO
- **Sintoma:** `npm error code ECONNRESET` na primeira execução do `npm install` (com avisos de cleanup `EBUSY` — lock temporário de arquivos).
- **Causa:** falha de conectividade de rede durante o download.
- **Resolução:** nova execução com `--fetch-retries=5 --fetch-retry-mintimeout=2000 --fetch-retry-maxtimeout=30000` → 365 pacotes instalados, 0 vulnerabilidades.
- **Status:** RESOLVIDO. Reincidências devem usar os mesmos retries.

### P3. `tsc --noEmit` falha antes do primeiro `next typegen` — RESOLVIDO (com observação)
- **Sintoma:** `error TS2304: Cannot find name 'LayoutProps'` em `src/app/layout.tsx`.
- **Causa:** tipos de typed routes do Next.js 16 são **gerados** em `.next/` (via `next typegen`, dev ou build); antes da primeira geração, o typecheck isolado não encontra `LayoutProps`.
- **Resolução:** executar `npx next typegen` antes de `tsc --noEmit` na primeira vez.
- **Observação:** o fluxo de validação do projeto deve considerar `typegen` como passo prévio ao typecheck, ou usar `next build` (que já gera os tipos).

### P4. Aviso de deprecation do ESLint 9.39.5 — PENDENTE (observação)
- **Sintoma:** `npm warn deprecated eslint@9.39.5` durante o install.
- **Contexto:** o template atual do `create-next-app` ainda referencia `eslint@^9`; a versão 9.39.5 está marcada como fora de suporte.
- **Decisão de agora:** manter como está (scaffold gerado), sem substituição prematura. Reavaliar quando houver upgrade do template/`eslint-config-next`.

## 17/09/2026 — Fase 1

### P5. `BlockList` com `::ffff:0:0/96` bloqueia TODOS os IPv4 — RESOLVIDO
- **Sintoma:** após adicionar `addSubnet("::ffff:0:0", 96, "ipv6")`, `check("8.8.8.8", "ipv4")` retornava `true` para IPs públicos.
- **Causa:** o `BlockList` do Node trata endereços IPv4 como mapeados (`::ffff:x.y.z.w`) na verificação, então aquela faixa captura qualquer IPv4.
- **Resolução:** faixa removida; verificado por teste que o Node já mapeia `::ffff:127.0.0.1`→IPv4 automaticamente contra as faixas IPv4 adicionadas. Guard final validado: IP público passa, privados são bloqueados em ambas as formas.
- **Prevenção:** não reintroduzir `::ffff:0:0/96` na lista.

### P6. Processo `next-server` sobrevive à parada do wrapper npm — RESOLVIDO
- **Sintoma:** após `Stop-Process` no PID do `npm run dev`, a porta 3100 continuou respondendo.
- **Causa:** o processo morto era só o wrapper `npm.cmd`; o servidor real (`node start-server.js`, PID 27064) é filho independente.
- **Resolução:** localizar o dono da porta (`Get-NetTCPConnection -LocalPort 3100`), confirmar o `CommandLine` e encerrar o PID correto.
- **Observação PowerShell:** `$pid` é variável automática somente-leitura — usar outro nome (ex.: `$devPid`) para guardar PIDs.
- **Prevenção:** em validações futuras, sempre confirmar liberação da porta antes de encerrar a sessão de testes.

### P7. Rate limiting em memória não serve para produção distribuída — PENDENTE (limitação assumida)
- **Contexto:** `checkRateLimit` usa `Map` local por instância; reinícios zeram contadores; múltiplas instâncias (Vercel) não coordenam; chave é apenas IP (público compartilhado atrás de NAT/CGNAT).
- **Ação futura:** store distribuída (ex.: Upstash Redis) e, quando houver autenticação, chave por usuário além de IP. Revisar na Fase 5/Hardening de produção.

### P8. Guard anti-SSRF não cobre DNS rebinding (TOCTOU) — PENDENTE (limitação assumida)
- **Contexto:** o hostname é resolvido no guard, mas o `fetch` resolve novamente; um DNS malicioso poderia trocar o endereço entre as duas resoluções.
- **Ação futura:** pinar o IP resolvido na conexão (custom `lookup`/agent) antes de produção, além da whitelist de domínios quando aplicável (`PROXY_ALLOWED_HOST_SUFFIXES`).

## 17/09/2026 — Fase 2

### P9. arXiv lento na 1ª chamada (timeout 15s) — RESOLVIDO (resiliência confirmada)
- **Sintoma:** primeira `busca` retornou só OpenAlex+DOAJ com `[busca] provider arxiv falhou: Tempo de espera pela fonte excedido`; chamadas seguintes incluíram o arXiv normalmente.
- **Causa:** latência alta da API do arXiv na chamada fria (export.arxiv.org pode levar vários segundos).
- **Resolução:** nenhuma mudança necessária — o isolamento por provider funcionou como projetado; timeout segue configurável via `SEARCH_TIMEOUT_MS`.
- **Observação:** em produção, monitorar taxa de timeout por fonte; considerar retry único com backoff para arXiv se recorrente.

### P10. Busca multi-termo no arXiv vira OR — ACEITO (limitação documentada)
- **Sintoma:** `search_query=all:quantum computing` é interpretado como `all:quantum OR all:computing` (observado no título canônico do feed).
- **Contexto:** sintaxe própria do arXiv; `sortBy=relevance` + nosso ranking (termos no título) mitigam.
- **Ação futura:** se precisão for problema, compor query com `AND`/`ti:` por campo; reavaliar com feedback de uso real.

### P11. Ids antigos do arXiv contêm `/` — RESOLVIDO (sanitização reversível)
- **Sintoma:** ids pré-2007 (`hep-ex/0307015v1`) são incompatíveis com path param e com `documentoIdSchema`.
- **Resolução:** `/`→`_` na geração do id e reversão em `buscarPorId` (seguro: charset do arXiv não contém `_` natural). Validado por código; nenhum caso real exercitado ainda (resultados atuais usam formato novo). Ver decisão D17.

## 17/09/2026 — Fase 3

### P12. `PageProps`/`RouteContext` exigem `next typegen` atualizado — RESOLVIDO
- **Sintoma:** `Type '"/busca"' does not satisfy the constraint '"/"'` ao usar `PageProps` em páginas novas.
- **Causa:** tipos de rota são gerados por `next dev/build/typegen`; páginas criadas após o último typegen não tinham tipos.
- **Resolução:** rodar `next typegen` e script `typecheck` alterado para `next typegen && tsc --noEmit` (remove a pegadinha da P3 permanentemente).

### P13. E2E: falsas falhas por seletores/ordem do teste (não da aplicação) — RESOLVIDO (diagnóstico)
- **Sintoma:** 3 falhas persistentes no primeiro E2E (empty state, download, alerta 404) que não se reproduziam em verificações diretas.
- **Causa:** (a) `minLength=2` do form bloqueia submit de `q` curto — o teste nunca chegava à URL; (b) texto com acento (`título`, `publicação`) nos seletores `getByText`; (c) locator `[role="alert"]` ambíguo (colidia com `__next-route-announcer__` do Next).
- **Resolução:** corrigidos os seletores/fluxo do teste (navegar direto para `/busca?q=q`, textos acentuados, `main section[role=alert]`). E2E final 11/11 OK.
- **Lição:** separar falha do teste de falha da aplicação antes de alterar código de produção.

### P14. Download de PDFs de editoras com gate (IOP/HTML) — PENDENTE (melhoria futura)
- **Sintoma:** documento OpenAlex com `urlPdf` em editora que responde HTML (IOP) → API retorna 502 `INVALID_MEDIA_TYPE`; UI exibe erro correto.
- **Contexto:** alguns `pdf_url` do OpenAlex apontam para landing pages que só servem PDF com cookies/headers de navegador.
- **Ação futura (Fase 5):** verificar magic bytes `%PDF-` na origem do provider antes de expor `urlPdf`, ou degradar para `urlPagina` quando a origem não for PDF; avaliar também User-Agent alternativo.

### P15. Iteração de E2E prejudicada por here-strings do PowerShell — RESOLVIDO (processo)
- **Sintoma:** scripts de teste corrompidos/vazios ao editar via `Set-Content` com here-string e aspas aninhadas; backup vazio substituiu o original.
- **Causa:** escaping do PowerShell 5.1 com aspas duplas/acentos em strings grandes; variável digitada errado (`$sado`) escreveu arquivo vazio.
- **Resolução:** reescrever o script completo em uma passada e aplicar patches por script Node em arquivo (`node patch.js`), nunca inline no shell.
- **Prevenção:** para patches de código/scripts, preferir ferramentas de arquivo (Write/Edit) ou script patcher em arquivo; nunca editar via here-string com aspas aninhadas.

## 17/09/2026 — Fase 4

### P16. `destroy()` fica na loading task, não no `PDFDocumentProxy` (v6) — RESOLVIDO
- **Sintoma:** `tsc` falhou: `Property destroy is missing in type PDFDocumentProxy`.
- **Causa:** presunção da API antiga; no `pdfjs-dist` v6 o `destroy()` pertence ao `PDFDocumentLoadingTask` retornado por `getDocument()`.
- **Resolução:** guardar a task (não o doc) para cleanup no unmount; confirmado nos tipos `types/src/display/api.d.ts`. Ver decisão D33.

### P17. ESLint lintando o worker minificado em `public/` — RESOLVIDO
- **Sintoma:** `npm run lint` explodiu com ~1578 problemas (erros/warnings) dentro de `public/pdf.worker.min.mjs`.
- **Causa:** asset de terceiro copiado para `public/` entrou no escopo do `eslint-config-next`.
- **Resolução:** `globalIgnores` com `public/**/*.mjs` em `eslint.config.mjs`; lint volta a 0 problemas. Ver decisão D32.

## 17/09/2026 — Fase 5

### P18. Lookup customizado do Node exige array com `all: true` — RESOLVIDO
- **Sintoma:** `fetchPinned` falhava com `ERR_INVALID_IP_ADDRESS: Invalid IP address: undefined`; proxy retornava 502 em PDFs reais.
- **Causa:** o Node chama lookups customizados com `{ all: true }`, modo em que o callback deve receber array de endereços — hipótese inicial (endereço único) estava errada.
- **Resolução:** `lookupPinned` detecta `options.all` e retorna array nesse modo; validado com teste isolado (STATUS 200) e E2E (PDF 2.2MB + magic). Ver decisão D37.

### P19. Testes do stream revelaram 2 bugs reais — RESOLVIDO
- **Sintoma:** `aceita magic dividido entre chunks` e `rejeita stream curto` travavam (timeout); após correção do deadlock, bytes do cabeçalho eram perdidos.
- **Causa:** (1) `return` no `pull` sem enqueue/error/close deixava o `read()` pendente para sempre; (2) bytes consumidos para o buffer do magic nunca eram re-enfileirados.
- **Resolução:** loop interno no `pull` + buffer de chunks pendentes re-enfileirados após validação. 31/31 verde.
- **Lição:** o investimento em testes unitários pagou-se imediatamente.

### P20. Vitest exige `vite` como peer — RESOLVIDO
- **Sintoma:** `npm run test` falhava com `Cannot find package vite`.
- **Causa:** `npm install -D vitest` não instalou o peer automaticamente.
- **Resolução:** `npm install -D vite`; ambas como devDependencies (0 vulnerabilidades no audit).

## 18/09/2026 — Deploy Vercel

### P21. `npm install` na Vercel falhou (ERESOLVE: vitest × `@types/node`) — RESOLVIDO
- **Sintoma:** build na Vercel (`iad1`) falhou no `npm install`: `vitest@5.0.1` pede `peerOptional @types/node@"^22.0.0 || >=24.0.0"`, mas o projeto tinha `@types/node@20.19.43`. Localmente a árvore também estava inválida (`npm ls` acusava `invalid`), mas o install local passava por causa do lockfile existente.
- **Causa:** `@types/node@^20` incompatível com o peer do `vitest@5.0.1`; qualquer install fresco (Vercel) quebra.
- **Resolução:** `@types/node` `^20` → `^24` (runtime local é Node 24; satisfaz os peers de `vitest` e `vite`). `npm install` regenerou o lock (404 pacotes, 0 vulnerabilidades); typecheck, lint, 31 testes e build revalidados.
- **Prevenção:** rodar `npm ls` após mexer em devDependencies para detectar árvore inválida antes do push.

### P22. Leitor falhou com 400 para PDF da USP em `http` — RESOLVIDO (código)
- **Sintoma:** em produção, `PdfViewer` exibiu `Unexpected server response (400)` para `urlPdf=http://www.teses.usp.br/...` (OpenAlex `best_oa_location.pdf_url` em http).
- **Causa:** o guard anti-SSRF só aceita https; OpenAlex e DOAJ repassavam `urlPdf` em http (`somenteHttp`), então `/api/proxy` devolvia 400 e `/api/download` falharia no `fetchPinned` (502). O arXiv já normalizava com `paraHttps`.
- **Resolução:** `urlPdf` de OpenAlex e DOAJ passa por `paraHttps` (https); `urlPagina` continua como link exibível; assinatura de `paraHttps` alargada para `string | null | undefined` (campos `.nullish()` do Zod); novo `http.test.ts` com 5 testes.
- **NÃO VALIDADO:** fetch real desse PDF da USP (rede local não alcança o host — curl timeout); confirmar no deploy Vercel.

## 18/09/2026 — Fase 8

### P23. PDF da PUCRS (OJS) retorna 502: URL é página HTML, não o arquivo — MITIGADO
- **Sintoma:** leitor exibiu 502 para `revistaseletronicas.pucrs.br/ojs/.../article/view/22354/13650` (via OpenAlex).
- **Causa:** a URL informa uma página de artigo OJS (HTML), não o PDF direto (`/download/...`); `fetchPdf` rejeita o MIME corretamente.
- **Ação:** sem reescrita automática de URL (frágil e específica de site); o leitor agora exibe mensagem amigável orientando a abrir o PDF na origem, onde o botão "Abrir PDF na origem" já existe.
- **Pendente:** avaliar ocorrência em produção; se OJS for recorrente, considerar fallback `/view/` → `/download/`.

### P24. Semantic Scholar retorna 429 sem chave em IPs compartilhados — LIMITAÇÃO DOCUMENTADA
- **Sintoma:** `curl` direto à API S2 devolveu 429 (cota de 100 req/5min por IP estourada).
- **Mitigação:** falha isolada por provider (busca segue com as demais fontes); env opcional `SEMANTIC_SCHOLAR_API_KEY` (gratuita) eleva a cota; documentado no README e `.env.example`.

## 18/09/2026 — Fase 9

### P25. Supabase inalcançável travava o ingest por ~60s — RESOLVIDO
- **Sintoma:** com envs placeholder, `/api/arquivo` demorou 59s e devolveu 500; o leitor não abria.
- **Causa:** só a primeira consulta tinha timeout; `fetchPdf` baixava o arquivo e as chamadas seguintes (dedup, upload, upsert) penduravam sem prazo.
- **Resolução:** helper `comTimeout` em todas as idas ao Acervo (10s leitura/escrita, 25s upload) + `registrarBusca` com teto de 4s; qualquer falha vira 503 e o cliente usa o proxy direto.
- **Lição:** integração externa no caminho da leitura precisa de prazo em cada passo, não só no primeiro.

### P26. `/api/arquivo` dependia da fonte mesmo com PDF arquivado — RESOLVIDO
- **Sintoma:** com o Tierkreis já no Storage, a rota devolveu 404 porque o arXiv falhou na hora (timeout frio).
- **Causa:** `buscarDocumentoPorId` rodava antes de checar o acervo; fonte fora = 404 mesmo com arquivo guardado.
- **Resolução:** a rota primeiro serve do acervo; só consulta a fonte quando a linha não existe ou não tem `url_origem`. Validado: 200 em 3.8s servindo do Storage.

### P27. Busca web real pendente de chave do Google — AGUARDANDO USUÁRIO
- **Contexto:** provider implementado e testado com mocks; cota gratuita de 100 consultas/dia.
- **Ação do usuário:** criar chave + CX (passo a passo no README) e definir `GOOGLE_SEARCH_API_KEY`/`GOOGLE_SEARCH_CX` no `.env.local` e na Vercel.

## 18/09/2026 — Bloco K

### P28. Ingest carrega o PDF inteiro em memória (limite 50MB) — LIMITAÇÃO DECLARADA
- **Contexto:** upload ao Storage exige bytes (hash + upload); stream validado já impõe o teto.
- **Mitigação:** `PROXY_MAX_SIZE_BYTES` configurável; arquivos acima do teto recusados com 413 antes do buffer.

## 18/09/2026 — Diagnóstico magic link (HTTP 500 no Supabase)

### P29. POST /auth/v1/otp retorna 500 — causa provável no provedor de e-mail
- **Evidência:** o 500 vem da API do próprio Supabase (`supabase.co/auth/v1/otp`), antes de qualquer rota nossa; código auditado e correto (`entrar/page.tsx:20`, callback `/auth/callback` confere); parâmetros inválidos gerariam 400/422, não 500.
- **Ação:** verificar SMTP/logs no dashboard Auth (passo a passo entregue); sem acesso aos logs internos — limitação declarada.
- **Status:** AGUARDANDO verificação no painel.

### P30. Diagnóstico definitivo 500 no OTP — trigger própria virou hipótese principal
- **Teste reversível executado:** `admin.createUser` + delete (sem e-mail): usuário criado, perfil auto-criado pela trigger, cascata limpa. **Trigger DESCARTADA (H3/H4).**
- **Edge responde bem:** signup inválido devolve 400 correto — camada edge íntegra.
- **Restam:** signup desabilitado, captcha/hooks, ou SMTP com rollback (H1/H5). Sem acesso aos Auth Logs internos.
- **Nada residual:** teste apagado, tabelas intactas.
- **CAUSA RAIZ CONFIRMADA (H1):** Auth Log do usuário mostra `535 5.7.8 Username and Password not accepted` (Gmail SMTP) — credenciais SMTP customizadas erradas. Gmail exige senha de app (com 2FA), não a senha normal.
- **Correção (painel, pelo usuário):** Auth → Email → SMTP: corrigir usuário/senha-de-app ou desativar o SMTP customizado para voltar ao remetente padrão. Código e banco intactos.

### P31. Remetente padrão limitado a ~2 e-mails/hora — usar SMTP próprio
- **Contexto:** resolvido o 500, o gargalo passou a ser a cota do mailer embutido.
- **Solução:** configurar SMTP próprio em Auth → Email → SMTP. Recomendado Resend (grátis generoso, feito para transacional); alternativa Gmail com senha de app (limite ~500/dia).
