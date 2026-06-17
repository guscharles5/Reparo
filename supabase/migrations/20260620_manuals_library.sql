-- Bibliothèque de notices techniques : stockage des notices + recherche sémantique
-- via pgvector. À exécuter dans le SQL editor de Supabase.

create extension if not exists vector;
create extension if not exists pgcrypto;

-- Une notice par modèle d'appareil (type / marque / référence).
create table if not exists manuals (
  id uuid primary key default gen_random_uuid(),
  type_appareil text not null,        -- ex: "Lave-linge"
  marque text not null,               -- ex: "Bosch"
  reference_modele text not null,     -- ex: "WAT28660FF"
  nom_modele text,                    -- ex: "Série 8 — 9kg"
  contenu_texte text,                 -- texte intégral de la notice (PDF extrait ou saisie manuelle)
  url_pdf text,                       -- lien public vers le PDF stocké (storage bucket manuals-pdf)
  date_ajout timestamptz not null default now(),
  embedding vector(1536)              -- embedding du contenu_texte complet (recherche grossière)
);

create index if not exists manuals_type_marque_ref_idx on manuals (type_appareil, marque, reference_modele);
create index if not exists manuals_date_ajout_idx on manuals (date_ajout desc);

-- Découpage du contenu en passages pour une recherche sémantique fine.
create table if not exists manual_chunks (
  id uuid primary key default gen_random_uuid(),
  manual_id uuid not null references manuals(id) on delete cascade,
  chunk_index int not null default 0,
  chunk_text text not null,
  embedding vector(1536),
  created_at timestamptz not null default now()
);

create index if not exists manual_chunks_manual_id_idx on manual_chunks (manual_id);

-- Recherche vectorielle des passages les plus proches d'une requête, pour une notice donnée.
create or replace function match_manual_chunks(
  query_embedding vector(1536),
  filter_manual_id uuid,
  match_count int default 4
)
returns table (id uuid, chunk_text text, similarity float)
language sql stable
as $$
  select id, chunk_text, 1 - (embedding <=> query_embedding) as similarity
  from manual_chunks
  where manual_id = filter_manual_id and embedding is not null
  order by embedding <=> query_embedding
  limit match_count
$$;

alter table manuals enable row level security;
alter table manual_chunks enable row level security;

create policy "service role full access" on manuals
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

create policy "service role full access" on manual_chunks
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

-- Bucket de stockage pour les PDF de notices (lecture publique, écriture service role uniquement).
insert into storage.buckets (id, name, public)
values ('manuals-pdf', 'manuals-pdf', true)
on conflict (id) do nothing;
