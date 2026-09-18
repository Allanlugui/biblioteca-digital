# Tarefas Pendentes (biblioteca-digital) 
- [x] Definir objetivo principal e escopo do projeto (Biblioteca Digital: busca web de PDFs, download direto, leitor integrado) 

## Fase 0 — Fundação (CONCLUÍDA)
- [x] Criar scaffolding Next.js + TypeScript + Tailwind (App Router)
- [x] Configurar estrutura de pastas: `app/`, `components/`, `services/`, `schemas/`, `types/`, `lib/`
- [x] Definir contrato de API e tipos base (`Documento`, `ResultadoBusca`, `ApiResponse`)

## Fase 1 — Backend (API) (CONCLUÍDA)
- [x] Endpoint `GET /api/busca?q=` com validação Zod e rate limiting
- [x] Endpoint `GET /api/documento/[id]` para metadados
- [x] Endpoint `GET /api/download/[id]` como proxy de download (stream, validação MIME `application/pdf`, limite de tamanho)
- [x] Endpoint `GET /api/proxy?url=` para o leitor (avaliar segurança/restrição de domínios)

## Fase 2 — Módulo de Scraping/Busca (CONCLUÍDA)
- [x] Pesquisa externa e validação das fontes (OpenAlex, arXiv, DOAJ) — Google Books e Semantic Scholar não validados, fora do escopo aprovado
- [x] Decidir mecanismo de busca web de PDFs: APIs oficiais (sem crawler próprio)
- [x] Implementar port pattern `services/search/` (um provider por fonte)
- [x] Agregação: consulta paralela + deduplicação + rankeamento simples
- [x] Cache curto de resultados

## Fase 3 — Frontend (CONCLUÍDA)
- [x] Página inicial com `SearchBar`
- [x] Página `/busca` com listagem de `ResultCard` (loading, empty e erro)
- [x] Página `/documento/[id]` com metadados e botão de download direto

## Fase 4 — Leitor Integrado (CONCLUÍDA)
- [x] Validar e integrar PDF.js (`react-pdf` ou integração direta)
- [x] `PdfViewer` na página de documento (via proxy quando necessário)

## Fase 5 — Qualidade e Despliegue (CONCLUÍDA)
- [x] Lint + typecheck + build configurados
- [x] Testes das regras críticas (validação, proxy, deduplicação)
- [x] Variáveis ambientais documentadas em `.env.example`
- [x] Preparar deploy (Vercel) e validar variáveis de ambiente
- [x] Atualizar `memory/DECISOES.md`, `memory/PROBLEMAS.md` e `memory/STATUS.md`

## Fase 6 — Redesign UI (CONCLUÍDA)
- [x] Identidade "sala de leitura" (Fraunces, papel, verde-biblioteca, dourado)
- [x] Home com hero, exemplos clicáveis, fontes e passos
- [x] Fichas catalográficas na busca e no documento

## Fase 7 — Leitor-livro + pt-BR (CONCLUÍDA)
- [x] Leitor paginado com deslizamento, slider, teclado e swipe
- [x] Auditoria pt-BR + página 404 temática

## Fase 8 — Volta da busca + Semantic Scholar (CONCLUÍDA)
- [x] "Voltar aos resultados" preserva a consulta via URL
- [x] Mensagens amigáveis para 400/502 no leitor
- [x] Provider Semantic Scholar + `SEMANTIC_SCHOLAR_API_KEY` opcional

## Fase 9 — Supabase: acervo universal + painel (CONCLUÍDA no código)
- [x] Migration SQL (documentos, buscas, estante, progresso, perfis, RLS, Storage)
- [x] Auth magic link + sessão via proxy + header
- [x] Ingest automático `/api/arquivo/[id]` com fallback ao proxy
- [x] Painel `/estante` (continuar lendo, salvos, buscas) + salvar na ficha
- [x] Progresso híbrido servidor + navegador
- [x] Rodar migration no SQL Editor do Supabase (usuário)
- [x] Preencher `.env.local` + envs da Vercel com as chaves reais (usuário)
- [x] Ingest real validado (documento + agregada + arquivo no bucket)
- [ ] Validar fluxo logado de ponta a ponta (magic link no e-mail do usuário)

## Bloco A — Fundação (CONCLUÍDO no código)
- [x] Documento estendido + normalizador único + testes
- [x] Campos reais por provider (validados com busca real)
- [x] Migration 0002 + inserts atualizados
- [ ] Rodar `supabase/migrations/0002_documento_enriquecido.sql` no SQL Editor (usuário, OBRIGATÓRIO — sem ela, estante/progresso falham)

## Bloco B — Busca avançada (CONCLUÍDO e validado)
- [x] Filtros (período, fontes, tipo, só PDF), ordenação (3 modos), paginação
- [x] Aviso de fontes indisponíveis + volta com filtros preservados
- [x] Cards com DOI, citações e assuntos

## Bloco C — Deduplicação (CONCLUÍDO e validado)
- [x] Camadas DOI → arXivId → URL → obra conservadora
- [x] Merge com `disponivelEm` + selo "Disponível em N fontes"

## Bloco D — Ficha do documento (CONCLUÍDO e validado)
- [x] Seções Informações, Resumo, Arquivos e Origem
- [x] DOI, citações, tipo, idioma, assuntos (só quando disponíveis)

## Bloco E — Leitor PDF (CONCLUÍDO e validado)
- [x] Zoom 50–250%, busca no texto, tela cheia
- [x] Limitação: sem highlight das ocorrências no canvas

## Bloco F — Minha Biblioteca (CONCLUÍDO no código)
- [x] Coleções: migration, APIs, painel, página, guardar na ficha
- [x] Favoritos = salvos da estante; histórico = buscas recentes
- [ ] Rodar `supabase/migrations/0002_documento_enriquecido.sql` e `0003_colecoes.sql` (usuário)
- [ ] Testar fluxo logado das coleções em produção

## Bloco G — Citações (CONCLUÍDO e validado)
- [x] ABNT, APA, MLA, Chicago, BibTeX, RIS + copiar/baixar

## Bloco H — Descoberta (CONCLUÍDO e validado)
- [x] Trabalhos relacionados por similaridade + seção na ficha

## Bloco I — UX/UI (CONCLUÍDO e validado)
- [x] Header mobile compacto, overflow-x zerado, screenshots 390px
- [x] Dark mode avaliado e descartado (identidade clara)

## Bloco J — PWA + SEO (CONCLUÍDO e validado)
- [x] Manifest, ícone, SW mínimo, robots, sitemap, OG, JSON-LD

## Bloco K — Segurança + performance (CONCLUÍDO e validado)
- [x] Auditoria (secrets, XSS, logs, CORS) sem críticos
- [x] Headers globais + pdf.js sob demanda confirmado

## Bloco L — Busca inteligente (CONCLUÍDO e validado)
- [x] Período em linguagem natural + nota com desfazer

## Bloco M — Auditoria final (CONCLUÍDO)
- [x] lint, typecheck, 75 testes, build, E2E ponta a ponta, a11y, mobile, segurança

## Pendências do usuário (fora do código)
- [ ] Migrations 0002 + 0003 no SQL Editor
- [ ] Envs Supabase (+ Google/S2 quando quiser) na Vercel
- [ ] Verificar SMTP e Redirect URLs no dashboard Supabase Auth (diagnóstico P29)
- [x] SMTP Resend configurado e funcionando
- [ ] Teste do usuário: criar conta, login, recuperação e magic link em produção

## Fase 10 — Busca universal na web (CONCLUÍDA no código)
- [x] Provider Web (Google CSE, só PDFs, ids estáveis via acervo)
- [x] Registro condicional + 5 fontes no rodapé/home/README
- [ ] Criar chave + CX do Google e configurar envs (usuário)
- [ ] Validar busca web real em produção