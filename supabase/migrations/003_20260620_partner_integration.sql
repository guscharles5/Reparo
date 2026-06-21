-- Migration : 003_partner_integration
-- Date : 2026-06-20
-- Description : Ajoute le tracking partenaire/résultat sur conversations et crée la table partners pour la configuration des intégrations CRM/webhook partenaires.
-- Tables modifiées : conversations, partners

-- Intégration CRM partenaire générique — tracking, webhook sortant et config.
-- À exécuter dans le SQL editor de Supabase.

-- Colonnes de tracking partenaire / résultat du diagnostic sur les conversations.
alter table conversations add column if not exists partner text;
alter table conversations add column if not exists ref_externe text;
alter table conversations add column if not exists modele text;
alter table conversations add column if not exists resultat text; -- 'resolu' | 'echec' | 'abandonne'
alter table conversations add column if not exists duree_minutes numeric;
alter table conversations add column if not exists started_at timestamptz not null default now();
alter table conversations add column if not exists webhook_envoye boolean not null default false;

create index if not exists conversations_partner_idx on conversations (partner);

-- Configuration des partenaires (back-office "Intégrations partenaires").
-- Aucune référence à un partenaire précis : toutes les lignes sont des données.
create table if not exists partners (
  id uuid primary key default gen_random_uuid(),
  nom text not null unique,
  webhook_url text,
  webhook_secret text,
  actif boolean not null default true,
  created_at timestamptz not null default now()
);

alter table partners enable row level security;

drop policy if exists "service role full access" on partners;
create policy "service role full access" on partners
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');
