-- Migration : 013_clients_partenaires
-- Date : 2026-07-13
-- Description : Création des tables clients_partenaires et import_logs pour
--               la gestion de la base clients côté partenaire.
--               Les emails ne sont JAMAIS stockés en clair — uniquement
--               email_hash (SHA-256) pour déduplication et email_masked pour affichage.
-- Tables modifiées : clients_partenaires (création), import_logs (création)

-- ── Table clients_partenaires ───────────────────────────────────────────────────
create table if not exists clients_partenaires (
  id               uuid        primary key default gen_random_uuid(),
  partner_id       uuid        not null references partners(id) on delete cascade,
  ref_client       text        not null,
  email_hash       text,
  email_masked     text,
  user_id          uuid        references auth.users(id) on delete set null,
  date_inscription timestamptz not null default now(),
  source_import    text        not null default 'import_csv'
                               check (source_import in ('manuel', 'import_csv', 'inscription_app')),
  appareil_type    text,
  modele           text,
  date_achat       date,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (partner_id, ref_client),
  unique (partner_id, email_hash)
);

comment on table  clients_partenaires                   is 'Base clients importée par les partenaires. Aucune donnée personnelle en clair.';
comment on column clients_partenaires.ref_client        is 'Référence unique par partenaire — fournie par le CSV ou générée automatiquement (REF-XXXXX).';
comment on column clients_partenaires.email_hash        is 'Hash SHA-256 de l''email normalisé (minuscules, trimmed), pour déduplication sans stocker le clair.';
comment on column clients_partenaires.email_masked      is 'Email partiellement masqué (ex: j***@gmail.com) pour affichage dans l''interface.';
comment on column clients_partenaires.user_id           is 'Lien vers le compte Supabase Auth si ce client a utilisé l''app Reparo.';
comment on column clients_partenaires.source_import     is 'Origine de l''enregistrement : manuel, import_csv, ou inscription_app.';

create index if not exists idx_clients_partenaires_partner_id  on clients_partenaires(partner_id);
create index if not exists idx_clients_partenaires_email_hash  on clients_partenaires(partner_id, email_hash);
create index if not exists idx_clients_partenaires_user_id     on clients_partenaires(user_id);
create index if not exists idx_clients_partenaires_ref_client  on clients_partenaires(partner_id, ref_client);

alter table clients_partenaires enable row level security;
create policy "service role full access" on clients_partenaires
  using (true) with check (true);

-- ── Table import_logs ──────────────────────────────────────────────────────────
create table if not exists import_logs (
  id           uuid        primary key default gen_random_uuid(),
  partner_id   uuid        not null references partners(id) on delete cascade,
  nom_fichier  text        not null,
  nb_importes  integer     not null default 0,
  nb_doublons  integer     not null default 0,
  nb_erreurs   integer     not null default 0,
  date_import  timestamptz not null default now(),
  rapport_json jsonb
);

comment on table  import_logs             is 'Historique des imports de bases clients par les partenaires.';
comment on column import_logs.rapport_json is 'Rapport détaillé : doublonAction, liste des erreurs avec raison.';

create index if not exists idx_import_logs_partner_id on import_logs(partner_id);

alter table import_logs enable row level security;
create policy "service role full access" on import_logs
  using (true) with check (true);
