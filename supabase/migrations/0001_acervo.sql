-- Fase 9 — Acervo universal + painel do usuário.
-- Rode no SQL Editor do Supabase (ou via supabase CLI).
-- Princípio: default deny; usuário só toca no que é seu (auth.uid() = user_id);
-- escrita global e Storage só com service_role (bypassa RLS).

-- 1. Documentos: cache global alimentado pelas buscas. Leitura pública, escrita só servidor.
create table if not exists documentos (
  id text primary key,
  fonte text not null,
  titulo text not null,
  autores jsonb not null default '[]'::jsonb,
  descricao text,
  data_publicacao text,
  url_origem text not null,
  url_pagina text,
  storage_path text,
  sha256 text unique,
  tamanho_bytes bigint,
  acessos integer not null default 1,
  ultimo_acesso timestamptz not null default now(),
  created_at timestamptz not null default now()
);
alter table documentos enable row level security;
drop policy if exists "leitura publica de documentos" on documentos;
create policy "leitura publica de documentos" on documentos for select using (true);

-- 2. Buscas agregadas: contaglobal por termo, sem PII. Leitura pública, escrita só servidor.
create table if not exists buscas_agregadas (
  termo text primary key,
  total integer not null default 1,
  atualizado_em timestamptz not null default now()
);
alter table buscas_agregadas enable row level security;
drop policy if exists "leitura publica de buscas agregadas" on buscas_agregadas;
create policy "leitura publica de buscas agregadas" on buscas_agregadas for select using (true);

-- 3. Buscas por usuário: privadas, dono total.
create table if not exists buscas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  consulta text not null,
  total integer not null default 0,
  created_at timestamptz not null default now()
);
alter table buscas enable row level security;
drop policy if exists "dono gerencia proprias buscas" on buscas;
create policy "dono gerencia proprias buscas" on buscas
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- 4. Estante: documentos salvos pelo usuário. Privada, dono total.
create table if not exists estante (
  user_id uuid not null references auth.users (id) on delete cascade,
  documento_id text not null references documentos (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, documento_id)
);
alter table estante enable row level security;
drop policy if exists "dono gerencia propria estante" on estante;
create policy "dono gerencia propria estante" on estante
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- 5. Progresso de leitura: página exata por usuário e documento. Privado, dono total.
create table if not exists progresso_leitura (
  user_id uuid not null references auth.users (id) on delete cascade,
  documento_id text not null references documentos (id) on delete cascade,
  pagina integer not null default 1 check (pagina >= 1),
  total_paginas integer check (total_paginas is null or total_paginas >= 1),
  atualizado_em timestamptz not null default now(),
  primary key (user_id, documento_id)
);
alter table progresso_leitura enable row level security;
drop policy if exists "dono gerencia proprio progresso" on progresso_leitura;
create policy "dono gerencia proprio progresso" on progresso_leitura
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- 6. Perfis: criados automaticamente no cadastro. Dono lê/atualiza o seu.
create table if not exists perfis (
  user_id uuid primary key references auth.users (id) on delete cascade,
  email text,
  created_at timestamptz not null default now()
);
alter table perfis enable row level security;
drop policy if exists "dono le proprio perfil" on perfis;
create policy "dono le proprio perfil" on perfis for select using (auth.uid() = user_id);
drop policy if exists "dono atualiza proprio perfil" on perfis;
create policy "dono atualiza proprio perfil" on perfis
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create or replace function criar_perfil_novo_usuario()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into perfis (user_id, email) values (new.id, new.email) on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists ao_criar_usuario_criar_perfil on auth.users;
create trigger ao_criar_usuario_criar_perfil
  after insert on auth.users for each row execute function criar_perfil_novo_usuario();

-- 7. Storage: pasta universal de PDFs. Leitura pública (conteúdo aberto já validado),
-- escrita só com service_role. Caminho por hash: pdfs/<sha256>.pdf (sem dados de usuário).
insert into storage.buckets (id, name, public)
values ('pdfs', 'pdfs', true)
on conflict (id) do update set public = true;

drop policy if exists "leitura publica de pdfs" on storage.objects;
create policy "leitura publica de pdfs" on storage.objects
  for select using (bucket_id = 'pdfs');
