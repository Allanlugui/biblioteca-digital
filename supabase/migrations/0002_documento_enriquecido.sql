-- Bloco A — metadados enriquecidos do Documento.
-- Colunas anuláveis/com default: nada quebra para linhas existentes.
alter table documentos add column if not exists doi text;
alter table documentos add column if not exists citacoes integer;
alter table documentos add column if not exists assuntos jsonb not null default '[]'::jsonb;
alter table documentos add column if not exists idioma text;
alter table documentos add column if not exists tipo text;
