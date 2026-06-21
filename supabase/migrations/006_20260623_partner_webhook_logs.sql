-- Migration : 006_partner_webhook_logs
-- Date : 2026-06-23
-- Description : Crée la table partner_webhook_logs qui journalise les tentatives d'envoi de webhook partenaire (succès et échecs) pour diagnostiquer les livraisons ratées.
-- Tables modifiées : partner_webhook_logs

-- Journal des tentatives d'envoi de webhook partenaire (succès et échecs),
-- pour diagnostiquer les livraisons ratées depuis le back-office.
create table if not exists partner_webhook_logs (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid references partners(id) on delete cascade,
  conversation_id uuid,
  success boolean not null,
  http_status int,
  error text,
  created_at timestamptz not null default now()
);

alter table partner_webhook_logs enable row level security;
drop policy if exists "service role full access" on partner_webhook_logs;
create policy "service role full access" on partner_webhook_logs
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');
