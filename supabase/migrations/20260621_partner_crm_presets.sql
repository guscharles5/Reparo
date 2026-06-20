-- Support multi-CRM pour les intégrations partenaires : chaque partenaire
-- choisit un preset de payload webhook (Salesforce, HubSpot, Zendesk, Custom).
-- À exécuter dans le SQL editor de Supabase.

alter table partners add column if not exists crm_type text not null default 'custom';
-- Valeurs attendues : 'custom' | 'salesforce' | 'hubspot' | 'zendesk'
