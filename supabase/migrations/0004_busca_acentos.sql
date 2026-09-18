-- Bloco: busca do acervo insensível a acentos (ex.: "bras cubas" acha "Brás Cubas").
create extension if not exists unaccent;
create extension if not exists pg_trgm;

create or replace function texto_busca(s text)
returns text language sql immutable as $$
  select lower(public.unaccent(coalesce(s, '')))
$$;

alter table documentos add column if not exists busca_texto text
  generated always as (texto_busca(titulo || ' ' || coalesce(descricao, ''))) stored;

create index if not exists idx_documentos_busca on documentos using gin (busca_texto gin_trgm_ops);
