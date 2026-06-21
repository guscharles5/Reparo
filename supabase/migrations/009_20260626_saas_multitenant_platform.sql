-- Migration : 009_saas_multitenant_platform
-- Date : 2026-06-26
-- Description : Ajoute les garanties/QR code sur appareils et la personnalisation back-office sur partners, et crée le moteur de configuration à 3 couches (config_globale, config_partenaire) ainsi que le release management (releases, releases_partenaires).
-- Tables modifiées : appareils, entretiens, partners, config_globale, config_partenaire, releases, releases_partenaires

-- Plateforme SaaS multi-tenant "Companion Électroménager" : moteur de
-- configuration à 3 couches (app mère / config globale / config partenaire),
-- release management, garanties par appareil. Aucun nom de partenaire en dur :
-- toute personnalisation passe par config_globale / config_partenaire.

-- appareils (= "devices" du cahier des charges) : garanties + QR code
alter table appareils add column if not exists qr_code_url text;
alter table appareils add column if not exists date_achat date;
alter table appareils add column if not exists garantie_fabricant_fin date;
alter table appareils add column if not exists garantie_partenaire_fin date;

-- entretiens : attribution partenaire directe (évite la jointure via appareils)
alter table entretiens add column if not exists partner_id uuid references partners(id) on delete set null;
create index if not exists idx_entretiens_partner on entretiens(partner_id);

-- partners : personnalisation back-office (couche 3)
alter table partners add column if not exists backoffice_nom text;
alter table partners add column if not exists backoffice_logo_url text;
alter table partners add column if not exists backoffice_couleur text;
alter table partners add column if not exists backoffice_kpis_ordre jsonb default '[]'::jsonb;

-- config_globale : couche 2, paramètres par défaut modifiables uniquement par l'admin
create table if not exists config_globale (
  id uuid primary key default gen_random_uuid(),
  cle text not null unique,
  valeur jsonb not null,
  description text,
  modifiable_par_partenaire boolean not null default true,
  updated_at timestamptz not null default now()
);

alter table config_globale enable row level security;
drop policy if exists "service role full access" on config_globale;
create policy "service role full access" on config_globale
  for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

-- config_partenaire : couche 3, personnalisation prioritaire sur config_globale
create table if not exists config_partenaire (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid not null references partners(id) on delete cascade,
  cle text not null,
  valeur jsonb not null,
  date_modification timestamptz not null default now(),
  unique (partner_id, cle)
);

alter table config_partenaire enable row level security;
drop policy if exists "service role full access" on config_partenaire;
create policy "service role full access" on config_partenaire
  for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

create index if not exists idx_config_partenaire_partner on config_partenaire(partner_id);

-- releases : système de release management de l'app mère
create table if not exists releases (
  id uuid primary key default gen_random_uuid(),
  version text not null unique,
  titre text not null,
  type text not null,
  resume text,
  ce_qui_change jsonb default '[]'::jsonb,
  ce_qui_ne_change_pas jsonb default '[]'::jsonb,
  impact_technique jsonb default '{}'::jsonb,
  actions_requises text default 'Aucune',
  date_disponibilite timestamptz not null default now(),
  date_limite_autorisation timestamptz,
  statut_global text not null default 'preparation',
  created_at timestamptz not null default now()
);

alter table releases drop constraint if exists releases_type_check;
alter table releases add constraint releases_type_check
  check (type in ('mineure', 'majeure', 'critique'));

alter table releases drop constraint if exists releases_statut_global_check;
alter table releases add constraint releases_statut_global_check
  check (statut_global in ('preparation', 'envoyee', 'deployee'));

alter table releases enable row level security;
drop policy if exists "service role full access" on releases;
create policy "service role full access" on releases
  for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

-- releases_partenaires : statut de déploiement par partenaire
create table if not exists releases_partenaires (
  id uuid primary key default gen_random_uuid(),
  release_id uuid not null references releases(id) on delete cascade,
  partner_id uuid not null references partners(id) on delete cascade,
  statut text not null default 'en_attente',
  date_autorisation timestamptz,
  date_deploiement timestamptz,
  notes_partenaire text,
  unique (release_id, partner_id)
);

alter table releases_partenaires drop constraint if exists releases_partenaires_statut_check;
alter table releases_partenaires add constraint releases_partenaires_statut_check
  check (statut in ('en_attente', 'autorisee', 'reportee', 'deployee', 'forcee'));

alter table releases_partenaires enable row level security;
drop policy if exists "service role full access" on releases_partenaires;
create policy "service role full access" on releases_partenaires
  for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
drop policy if exists "owner read access" on releases_partenaires;
create policy "owner read access" on releases_partenaires
  for select using (
    auth.uid() in (select user_id from partners where id = releases_partenaires.partner_id)
  );

create index if not exists idx_releases_partenaires_release on releases_partenaires(release_id);
create index if not exists idx_releases_partenaires_partner on releases_partenaires(partner_id);
