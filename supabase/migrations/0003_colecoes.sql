-- Bloco F — coleções do usuário (pastas temáticas da estante).
-- RLS: dono total; itens herdiam o dono pela coleção (EXISTS).

create table if not exists colecoes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  nome text not null check (char_length(nome) between 1 and 80),
  created_at timestamptz not null default now()
);
alter table colecoes enable row level security;
drop policy if exists "dono gerencia proprias colecoes" on colecoes;
create policy "dono gerencia proprias colecoes" on colecoes
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table if not exists colecao_itens (
  colecao_id uuid not null references colecoes (id) on delete cascade,
  documento_id text not null references documentos (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (colecao_id, documento_id)
);
alter table colecao_itens enable row level security;
drop policy if exists "dono gerencia itens das proprias colecoes" on colecao_itens;
create policy "dono gerencia itens das proprias colecoes" on colecao_itens
  for all
  using (exists (select 1 from colecoes where colecoes.id = colecao_itens.colecao_id and colecoes.user_id = auth.uid()))
  with check (exists (select 1 from colecoes where colecoes.id = colecao_itens.colecao_id and colecoes.user_id = auth.uid()));
