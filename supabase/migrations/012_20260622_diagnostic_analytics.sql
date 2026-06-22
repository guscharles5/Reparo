-- Migration : 012_diagnostic_analytics
-- Date : 2026-06-22
-- Description : Ajoute la collecte fiable des données de diagnostic IA sur conversations
--   (estimations explicitement marquées comme telles, jamais confondues avec des faits
--   sûrs), une date d'achat exploitable sur appareils pour calculer la garantie sans que
--   l'IA ait à la deviner, une table de log des tags mal formés (parsing défensif, jamais
--   bloquant), et les tables d'agrégation quotidienne/par panne alimentées par le cron.
-- Tables modifiées : conversations, appareils
-- Tables créées : tag_parse_errors, analytics_daily, analytics_pannes

-- ============================================================================
-- conversations : champs de diagnostic IA, clairement distingués des faits sûrs
-- (resultat, duree_minutes, garantie_type existent déjà et restent la source
-- de vérité pour tout ce qui est calculé/confirmé par l'utilisateur, pas deviné)
-- ============================================================================

alter table conversations add column if not exists appareil_id uuid references appareils(id) on delete set null;
comment on column conversations.appareil_id is 'Lien vers l''appareil concerné par le diagnostic. Obligatoire pour que les statistiques de panne par marque/modèle (analytics_pannes) aient un sens.';

alter table conversations add column if not exists panne_categorie text;
comment on column conversations.panne_categorie is 'Catégorie de panne estimée par l''IA à partir des symptômes décrits par l''utilisateur. Estimation, pas un fait vérifié — voir source_diagnostic.';

alter table conversations add column if not exists panne_detail text;
comment on column conversations.panne_detail is 'Détail libre de la panne estimée par l''IA, associé à panne_categorie.';

alter table conversations add column if not exists complexite text;
alter table conversations drop constraint if exists conversations_complexite_check;
alter table conversations add constraint conversations_complexite_check
  check (complexite in ('simple', 'moyenne', 'complexe', 'critique') or complexite is null);
comment on column conversations.complexite is 'Niveau de complexité de la panne estimé par l''IA. Estimation, pas un fait vérifié.';

alter table conversations add column if not exists cause_racine text;
alter table conversations drop constraint if exists conversations_cause_racine_check;
alter table conversations add constraint conversations_cause_racine_check
  check (cause_racine in ('manque_entretien', 'usure_normale', 'mauvaise_utilisation', 'defaut_fabrication', 'installation_incorrecte', 'inconnue') or cause_racine is null);
comment on column conversations.cause_racine is 'Cause racine de la panne estimée par l''IA à partir de la conversation. Estimation, exploitable en tendance statistique agrégée, jamais comme vérité individuelle (ex. pour une décision de garantie).';

alter table conversations add column if not exists notice_manual_id uuid references manuals(id) on delete set null;
alter table conversations add column if not exists notice_section text;
comment on column conversations.notice_manual_id is 'Notice technique effectivement utilisée par l''IA pendant le diagnostic (fait objectif, pas une estimation).';

alter table conversations add column if not exists source_diagnostic text default 'estimation_ia';
alter table conversations drop constraint if exists conversations_source_diagnostic_check;
alter table conversations add constraint conversations_source_diagnostic_check
  check (source_diagnostic in ('estimation_ia', 'verifiee'));
comment on column conversations.source_diagnostic is 'Indique si panne_categorie/panne_detail/complexite/cause_racine sont une estimation IA (défaut) ou une donnée vérifiée — à afficher distinctement dans le back-office.';

alter table conversations add column if not exists nb_tentatives integer not null default 0;
comment on column conversations.nb_tentatives is 'Nombre de tentatives de dépannage, compté automatiquement côté client à chaque étape envoyée par l''IA. Jamais déclaré par l''IA elle-même.';

create index if not exists idx_conversations_appareil on conversations(appareil_id);
create index if not exists idx_conversations_panne_categorie on conversations(panne_categorie);
create index if not exists idx_conversations_complexite on conversations(complexite);

-- ============================================================================
-- appareils : date d'achat exploitable pour calculer la garantie automatiquement
-- ============================================================================

alter table appareils add column if not exists date_achat date;
comment on column appareils.date_achat is 'Date d''achat saisie par l''utilisateur (mode Bienvenue ou ajout manuel). Source de vérité pour calculer la garantie automatiquement — l''IA ne doit jamais la deviner pendant une conversation.';

-- ============================================================================
-- tag_parse_errors : parsing défensif, jamais bloquant pour l'utilisateur
-- ============================================================================

create table if not exists tag_parse_errors (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid references conversations(id) on delete cascade,
  tag_name text not null,
  raw_tag text not null,
  reason text,
  created_at timestamptz not null default now()
);
comment on table tag_parse_errors is 'Journal des tags IA mal formés ou tronqués détectés par le parsing défensif côté client. N''impacte jamais l''utilisateur — sert uniquement à surveiller la qualité du pipeline analytics.';

alter table tag_parse_errors enable row level security;
drop policy if exists "service role full access" on tag_parse_errors;
create policy "service role full access" on tag_parse_errors
  for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

create index if not exists idx_tag_parse_errors_conversation on tag_parse_errors(conversation_id);
create index if not exists idx_tag_parse_errors_created on tag_parse_errors(created_at);

-- ============================================================================
-- analytics_daily : agrégation quotidienne par partenaire, alimentée par le cron
-- ============================================================================

create table if not exists analytics_daily (
  id uuid primary key default gen_random_uuid(),
  jour date not null,
  -- Nom du partenaire (conversations.partner est lui-même un text, pas un FK
  -- uuid). Jamais null : '_sans_partenaire' pour les conversations sans
  -- attribution, sinon une contrainte unique(jour, partenaire_nom) laisserait
  -- passer des doublons (Postgres traite NULL comme toujours distinct).
  partenaire_nom text not null default '_sans_partenaire',
  nb_conversations integer not null default 0,
  nb_resolues integer not null default 0,
  nb_abandonnees integer not null default 0,
  nb_escalades_sav integer not null default 0,
  duree_moyenne_secondes numeric,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (jour, partenaire_nom)
);
comment on table analytics_daily is 'Agrégat quotidien des conversations par partenaire, calculé par le cron Vercel (app/api/cron/analytics-daily). La contrainte unique (jour, partenaire_nom) garantit qu''un upsert répété (re-run du cron) ne crée jamais de doublon.';

alter table analytics_daily enable row level security;
drop policy if exists "service role full access" on analytics_daily;
create policy "service role full access" on analytics_daily
  for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

create index if not exists idx_analytics_daily_jour on analytics_daily(jour);
create index if not exists idx_analytics_daily_partenaire on analytics_daily(partenaire_nom);

-- ============================================================================
-- analytics_pannes : agrégation mensuelle par marque/modèle/catégorie de panne
-- ============================================================================

create table if not exists analytics_pannes (
  id uuid primary key default gen_random_uuid(),
  mois date not null,
  marque text not null,
  modele text not null,
  panne_categorie text not null,
  nb_occurrences integer not null default 0,
  nb_resolues integer not null default 0,
  source_diagnostic text not null default 'estimation_ia',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (mois, marque, modele, panne_categorie)
);
comment on table analytics_pannes is 'Agrégat mensuel des pannes par marque/modèle, calculé par le cron Vercel à partir de conversations.panne_categorie (estimation IA) et conversations.appareil_id. La contrainte unique évite tout doublon en cas de re-run.';

alter table analytics_pannes enable row level security;
drop policy if exists "service role full access" on analytics_pannes;
create policy "service role full access" on analytics_pannes
  for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

create index if not exists idx_analytics_pannes_mois on analytics_pannes(mois);
create index if not exists idx_analytics_pannes_marque_modele on analytics_pannes(marque, modele);
