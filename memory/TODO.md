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