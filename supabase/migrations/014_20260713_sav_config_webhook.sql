-- Migration : 014_sav_config_webhook
-- Date : 2026-07-13
-- Description : Ajout des colonnes de configuration SAV avancée sur la table partners
--               (horaires, email garantie, délai réponse, webhook CRM) et du champ
--               webhook_statut sur conversations pour le suivi des envois CRM.
-- Tables modifiées : partners, conversations

-- ── Table partners — nouveaux champs SAV ──────────────────────────────────────
alter table partners
  add column if not exists sav_horaires       text,
  add column if not exists sav_email_garantie text,
  add column if not exists sav_delai_reponse  text,
  add column if not exists sav_webhook_url    text,
  add column if not exists sav_webhook_secret text;

comment on column partners.sav_horaires       is 'Horaires d''ouverture du SAV téléphone (ex: Lun-Sam 8h-20h).';
comment on column partners.sav_email_garantie is 'Adresse email du service garantie affiché si l''appareil est sous garantie.';
comment on column partners.sav_delai_reponse  is 'Délai de réponse garanti pour le canal email garantie (ex: Réponse sous 48h).';
comment on column partners.sav_webhook_url    is 'URL webhook CRM pour la réception automatique des demandes SAV.';
comment on column partners.sav_webhook_secret is 'Clé secrète HMAC-SHA256 pour la signature des payloads webhook.';

-- ── Table conversations — statut envoi webhook ────────────────────────────────
alter table conversations
  add column if not exists webhook_statut text
    check (webhook_statut in ('envoye', 'echec'));

comment on column conversations.webhook_statut is 'Statut de l''envoi webhook CRM pour les demandes SAV : envoye | echec | null (non configuré ou non applicable).';
