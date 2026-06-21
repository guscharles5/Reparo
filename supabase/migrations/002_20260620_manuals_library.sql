-- Migration : 002_manuals_library
-- Date : 2026-06-20
-- Description : Crée la table manuals (bibliothèque de notices techniques par modèle d'appareil) avec recherche plein texte, et le bucket de stockage des PDF associés.
-- Tables modifiées : manuals

-- Bibliothèque de notices techniques — recherche par mots-clés simple
-- (sans pgvector ni service d'embeddings externe). À exécuter dans le
-- SQL editor de Supabase.

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
  date_ajout timestamptz not null default now()
);

create index if not exists manuals_type_marque_ref_idx on manuals (type_appareil, marque, reference_modele);
create index if not exists manuals_date_ajout_idx on manuals (date_ajout desc);

-- Index plein texte (français) pour la recherche par mots-clés dans le contenu des notices.
create index if not exists manuals_contenu_texte_fts_idx
  on manuals using gin (to_tsvector('french', coalesce(contenu_texte, '')));

alter table manuals enable row level security;

create policy "service role full access" on manuals
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

-- Bucket de stockage pour les PDF de notices (lecture publique, écriture service role uniquement).
insert into storage.buckets (id, name, public)
values ('manuals-pdf', 'manuals-pdf', true)
on conflict (id) do nothing;
