-- Migration : 015_notices_partenaires
-- Date : 2026-07-13
-- Description : Création de la table notices_partenaires pour la bibliothèque
--               de notices exclusives par partenaire (notices techniques PDF ou saisies manuellement).
-- Tables créées : notices_partenaires

-- ── Table notices_partenaires ─────────────────────────────────────────────────
create table if not exists notices_partenaires (
  id               uuid primary key default gen_random_uuid(),
  partner_id       uuid not null references partners(id) on delete cascade,
  type_appareil    text not null,
  marque           text not null,
  reference_modele text not null,
  nom_modele       text,
  source           text not null check (source in ('pdf', 'manuel')),
  contenu_texte    text,
  pdf_url          text,
  statut           text not null default 'en_cours' check (statut in ('indexee', 'en_cours')),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

comment on table notices_partenaires is 'Notices techniques exclusives déposées par chaque partenaire. Prioritaires sur la bibliothèque globale lors des diagnostics. Invisibles aux autres partenaires (RLS).';
comment on column notices_partenaires.partner_id       is 'Partenaire propriétaire de la notice.';
comment on column notices_partenaires.type_appareil    is 'Type d''appareil (ex: Lave-linge, Réfrigérateur, Four, Lave-vaisselle).';
comment on column notices_partenaires.marque           is 'Marque de l''appareil (ex: Bosch, Samsung).';
comment on column notices_partenaires.reference_modele is 'Référence constructeur unique du modèle.';
comment on column notices_partenaires.nom_modele       is 'Nom commercial du modèle (optionnel).';
comment on column notices_partenaires.source           is 'Origine de la notice : pdf (fichier uploadé) ou manuel (texte saisi).';
comment on column notices_partenaires.contenu_texte    is 'Contenu texte de la notice (saisie manuelle ou extraction PDF).';
comment on column notices_partenaires.pdf_url          is 'URL du fichier PDF dans le storage Supabase (source=pdf uniquement).';
comment on column notices_partenaires.statut           is 'Statut d''indexation : en_cours (en attente de traitement) ou indexee (disponible pour les diagnostics).';

-- ── Contrainte d'unicité ────────────────────────────────────────────────────
alter table notices_partenaires
  add constraint notices_partenaires_unique_ref unique (partner_id, reference_modele);

-- ── Indexes ──────────────────────────────────────────────────────────────────
create index if not exists notices_partenaires_partner_id_idx    on notices_partenaires (partner_id);
create index if not exists notices_partenaires_type_appareil_idx on notices_partenaires (partner_id, type_appareil);
create index if not exists notices_partenaires_marque_idx        on notices_partenaires (partner_id, marque);

-- ── Trigger updated_at ───────────────────────────────────────────────────────
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

create trigger notices_partenaires_updated_at
  before update on notices_partenaires
  for each row execute function set_updated_at();

-- ── RLS ──────────────────────────────────────────────────────────────────────
alter table notices_partenaires enable row level security;

create policy "Service role full access on notices_partenaires"
  on notices_partenaires
  for all
  to service_role
  using (true)
  with check (true);
