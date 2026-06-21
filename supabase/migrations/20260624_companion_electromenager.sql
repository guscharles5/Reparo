-- Vision "Companion Électroménager" : mode bienvenue/diagnostic, entretien
-- préventif, escalade SAV configurable par partenaire, NPS segmenté.

-- conversations : distinction mode bienvenue/diagnostic + traçabilité escalade SAV
alter table conversations add column if not exists mode text default 'diagnostic';
alter table conversations add column if not exists escalade_sav boolean default false;
alter table conversations add column if not exists canal_escalade text;
alter table conversations add column if not exists garantie_type text;

alter table conversations drop constraint if exists conversations_mode_check;
alter table conversations add constraint conversations_mode_check
  check (mode in ('bienvenue', 'diagnostic'));

alter table conversations drop constraint if exists conversations_canal_escalade_check;
alter table conversations add constraint conversations_canal_escalade_check
  check (canal_escalade is null or canal_escalade in ('rdv', 'rappel', 'chat'));

alter table conversations drop constraint if exists conversations_garantie_type_check;
alter table conversations add constraint conversations_garantie_type_check
  check (garantie_type is null or garantie_type in ('fabricant', 'partenaire', 'aucune'));

-- nps : segmentation par parcours utilisateur et par mode
alter table conversations add column if not exists nps_parcours text;
alter table conversations drop constraint if exists conversations_nps_parcours_check;
alter table conversations add constraint conversations_nps_parcours_check
  check (nps_parcours is null or nps_parcours in ('bienvenue', 'resolu', 'escalade', 'abandonne'));

-- entretiens : historique des entretiens effectués via Reparo
create table if not exists entretiens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  appareil_id uuid references appareils(id) on delete cascade,
  type_entretien text not null,
  date_realisation timestamptz not null default now(),
  rappel_suivant timestamptz
);

alter table entretiens enable row level security;
drop policy if exists "service role full access" on entretiens;
create policy "service role full access" on entretiens
  for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
drop policy if exists "owner read access" on entretiens;
create policy "owner read access" on entretiens
  for select using (auth.uid() = user_id);

-- rappels : calendrier d'entretien automatique
create table if not exists rappels (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  appareil_id uuid references appareils(id) on delete cascade,
  type_rappel text not null,
  date_prevue timestamptz not null,
  statut text not null default 'en_attente',
  created_at timestamptz not null default now()
);

alter table rappels drop constraint if exists rappels_statut_check;
alter table rappels add constraint rappels_statut_check
  check (statut in ('en_attente', 'envoye', 'complete', 'ignore'));

alter table rappels enable row level security;
drop policy if exists "service role full access" on rappels;
create policy "service role full access" on rappels
  for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
drop policy if exists "owner read access" on rappels;
create policy "owner read access" on rappels
  for select using (auth.uid() = user_id);

-- partners : configuration SAV connecté, générique (aucun nom de partenaire en dur)
alter table partners add column if not exists sav_connecte boolean default false;
alter table partners add column if not exists sav_rdv_url text;
alter table partners add column if not exists sav_rappel_numero text;
alter table partners add column if not exists sav_chat_url text;
alter table partners add column if not exists sav_delai_prise_en_charge text;
alter table partners add column if not exists sav_garantie_fabricant boolean default false;

create index if not exists idx_entretiens_user on entretiens(user_id);
create index if not exists idx_entretiens_appareil on entretiens(appareil_id);
create index if not exists idx_rappels_user on rappels(user_id);
create index if not exists idx_rappels_appareil on rappels(appareil_id);
create index if not exists idx_rappels_statut_date on rappels(statut, date_prevue);
create index if not exists idx_conversations_mode on conversations(mode);
