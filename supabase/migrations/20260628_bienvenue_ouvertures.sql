-- Tracking des ouvertures de lien "Mode Bienvenue" (?mode=bienvenue&partner=...).
-- Distinct de l'activation côté client (gardée par localStorage, une seule
-- fois par appareil) : ici on logue CHAQUE ouverture du lien, pour calculer
-- un vrai "taux d'ouverture" plutôt qu'une donnée inventée.

create table if not exists bienvenue_ouvertures (
  id uuid primary key default gen_random_uuid(),
  partner_nom text not null,
  appareil text,
  modele text,
  created_at timestamptz not null default now()
);

alter table bienvenue_ouvertures enable row level security;
drop policy if exists "service role full access" on bienvenue_ouvertures;
create policy "service role full access" on bienvenue_ouvertures
  for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

create index if not exists idx_bienvenue_ouvertures_partner on bienvenue_ouvertures(partner_nom);
create index if not exists idx_bienvenue_ouvertures_created on bienvenue_ouvertures(created_at);
