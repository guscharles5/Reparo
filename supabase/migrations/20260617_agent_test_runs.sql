-- Table de résultats des agents Playwright simulant des utilisateurs réels.
-- À exécuter une fois dans le SQL editor de Supabase avant de lancer les tests.

create table if not exists agent_test_runs (
  id uuid primary key default gen_random_uuid(),
  persona text not null,            -- ex: "Michel"
  appareil_type text not null,      -- ex: "Lave-linge"
  panne text not null,              -- ex: "Fuite d'eau"
  status text not null check (status in ('resolu', 'echec', 'erreur')),
  turns int not null default 0,
  transcript jsonb not null default '[]'::jsonb,
  duration_ms int,
  base_url text,
  created_at timestamptz not null default now()
);

create index if not exists agent_test_runs_created_at_idx on agent_test_runs (created_at desc);

alter table agent_test_runs enable row level security;

-- Lecture/écriture réservées au service role (la clé utilisée par les tests
-- et par le back-office), aucun accès anonyme.
create policy "service role full access" on agent_test_runs
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');
