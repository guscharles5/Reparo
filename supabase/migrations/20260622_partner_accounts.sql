-- Espace partenaire séparé : comptes partenaires (Supabase Auth), NPS,
-- journal de connexion et RLS. À exécuter dans le SQL editor de Supabase.

-- Lien entre une ligne "partners" et son compte Supabase Auth.
alter table partners add column if not exists user_id uuid references auth.users(id) on delete set null;
alter table partners add column if not exists email text;
-- Accès à l'espace partenaire (distinct du statut "actif" du webhook).
alter table partners add column if not exists compte_actif boolean not null default true;
-- Coût moyen estimé d'une intervention technicien évitée, configurable par partenaire.
alter table partners add column if not exists cout_intervention_evitee numeric not null default 80;

create unique index if not exists partners_user_id_idx on partners (user_id);

-- NPS associé à chaque conversation/diagnostic.
alter table conversations add column if not exists nps_score smallint; -- 0 à 10
alter table conversations add column if not exists nps_commentaire text;

-- Journal des connexions à l'espace partenaire.
create table if not exists partner_login_logs (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid references partners(id) on delete cascade,
  user_id uuid,
  ip text,
  created_at timestamptz not null default now()
);

alter table partner_login_logs enable row level security;
drop policy if exists "service role full access" on partner_login_logs;
create policy "service role full access" on partner_login_logs
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

-- RLS défense en profondeur : un partenaire ne lit que ses propres
-- conversations, via le lien partners.user_id = auth.uid(). L'accès principal
-- de l'app passe par des routes API service-role, ces policies couvrent tout
-- accès direct au client Supabase authentifié comme partenaire.
alter table conversations enable row level security;

drop policy if exists "partners read own conversations" on conversations;
create policy "partners read own conversations" on conversations
  for select
  using (
    exists (
      select 1 from partners
      where partners.user_id = auth.uid()
        and partners.nom = conversations.partner
        and partners.compte_actif = true
    )
  );

drop policy if exists "service role full access" on conversations;
create policy "service role full access" on conversations
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

drop policy if exists "partners read own row" on partners;
create policy "partners read own row" on partners
  for select
  using (user_id = auth.uid());
