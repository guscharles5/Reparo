-- Migration : 011_documentation_tables
-- Date : 2026-06-29
-- Description : Ajoute des commentaires PostgreSQL (comment on table / comment on column) documentant le rôle métier de toutes les tables et colonnes non triviales créées par les migrations 001 à 010, sans modifier le schéma. Chaque bloc vérifie que la table existe avant de commenter, pour rester compatible avec un projet où certaines migrations n'auraient pas été appliquées.
-- Tables modifiées : agent_test_runs, manuals, partners, conversations, appareils, entretiens, rappels, partner_login_logs, partner_webhook_logs, config_globale, config_partenaire, releases, releases_partenaires, bienvenue_ouvertures

-- ===========================================================================
-- agent_test_runs (001)
-- ===========================================================================
do $$
begin
  if to_regclass('public.agent_test_runs') is not null then
    execute $cmt$comment on table agent_test_runs is 'Résultats des agents Playwright simulant des utilisateurs réels lors des tests automatisés.';$cmt$;
    execute $cmt$comment on column agent_test_runs.persona is 'Nom du persona utilisateur simulé par l''agent de test (ex: "Michel").';$cmt$;
    execute $cmt$comment on column agent_test_runs.appareil_type is 'Type d''appareil électroménager testé dans le scénario (ex: "Lave-linge").';$cmt$;
    execute $cmt$comment on column agent_test_runs.panne is 'Panne ou symptôme simulé par l''agent pour ce scénario de test (ex: "Fuite d''eau").';$cmt$;
    execute $cmt$comment on column agent_test_runs.status is 'Issue du scénario de test : résolu, échec ou erreur technique.';$cmt$;
    execute $cmt$comment on column agent_test_runs.turns is 'Nombre d''échanges (tours de conversation) effectués pendant le scénario.';$cmt$;
    execute $cmt$comment on column agent_test_runs.transcript is 'Transcription complète de la conversation simulée, au format JSON.';$cmt$;
    execute $cmt$comment on column agent_test_runs.duration_ms is 'Durée totale du scénario de test en millisecondes.';$cmt$;
    execute $cmt$comment on column agent_test_runs.base_url is 'URL de base de l''environnement testé par l''agent.';$cmt$;
  end if;
end $$;

-- ===========================================================================
-- manuals (002)
-- ===========================================================================
do $$
begin
  if to_regclass('public.manuals') is not null then
    execute $cmt$comment on table manuals is 'Bibliothèque de notices techniques par modèle d''appareil, avec recherche plein texte.';$cmt$;
    execute $cmt$comment on column manuals.type_appareil is 'Type de l''appareil concerné par la notice (ex: "Lave-linge").';$cmt$;
    execute $cmt$comment on column manuals.marque is 'Marque du fabricant de l''appareil (ex: "Bosch").';$cmt$;
    execute $cmt$comment on column manuals.reference_modele is 'Référence exacte du modèle d''appareil (ex: "WAT28660FF").';$cmt$;
    execute $cmt$comment on column manuals.nom_modele is 'Nom commercial du modèle, pour affichage utilisateur (ex: "Série 8 — 9kg").';$cmt$;
    execute $cmt$comment on column manuals.contenu_texte is 'Texte intégral de la notice, extrait du PDF ou saisi manuellement, utilisé pour la recherche par mots-clés.';$cmt$;
    execute $cmt$comment on column manuals.url_pdf is 'Lien public vers le PDF de la notice stocké dans le bucket manuals-pdf.';$cmt$;
    execute $cmt$comment on column manuals.date_ajout is 'Date d''ajout de la notice dans la bibliothèque.';$cmt$;
  end if;
end $$;

-- ===========================================================================
-- partners (003, 004, 005, 007, 009)
-- ===========================================================================
do $$
begin
  if to_regclass('public.partners') is not null then
    execute $cmt$comment on table partners is 'Configuration des partenaires intégrés à la plateforme (back-office, webhook, SAV, personnalisation).';$cmt$;
    execute $cmt$comment on column partners.nom is 'Nom unique du partenaire, utilisé comme identifiant métier (ex: lien avec conversations.partner).';$cmt$;
    if exists (select 1 from information_schema.columns where table_schema='public' and table_name='partners' and column_name='webhook_url') then
      execute $cmt$comment on column partners.webhook_url is 'URL du webhook sortant vers lequel les résultats de diagnostic sont envoyés.';$cmt$;
    end if;
    if exists (select 1 from information_schema.columns where table_schema='public' and table_name='partners' and column_name='webhook_secret') then
      execute $cmt$comment on column partners.webhook_secret is 'Secret utilisé pour signer les requêtes webhook envoyées au partenaire.';$cmt$;
    end if;
    if exists (select 1 from information_schema.columns where table_schema='public' and table_name='partners' and column_name='actif') then
      execute $cmt$comment on column partners.actif is 'Indique si l''intégration webhook du partenaire est active.';$cmt$;
    end if;
    if exists (select 1 from information_schema.columns where table_schema='public' and table_name='partners' and column_name='crm_type') then
      execute $cmt$comment on column partners.crm_type is 'Preset de payload webhook choisi par le partenaire : custom, salesforce, hubspot ou zendesk.';$cmt$;
    end if;
    if exists (select 1 from information_schema.columns where table_schema='public' and table_name='partners' and column_name='user_id') then
      execute $cmt$comment on column partners.user_id is 'Identifiant du compte Supabase Auth associé à ce partenaire, pour l''accès à l''espace partenaire.';$cmt$;
    end if;
    if exists (select 1 from information_schema.columns where table_schema='public' and table_name='partners' and column_name='email') then
      execute $cmt$comment on column partners.email is 'Adresse email de contact du compte partenaire.';$cmt$;
    end if;
    if exists (select 1 from information_schema.columns where table_schema='public' and table_name='partners' and column_name='compte_actif') then
      execute $cmt$comment on column partners.compte_actif is 'Indique si l''accès du partenaire à son espace back-office est actif (distinct du statut actif du webhook).';$cmt$;
    end if;
    if exists (select 1 from information_schema.columns where table_schema='public' and table_name='partners' and column_name='cout_intervention_evitee') then
      execute $cmt$comment on column partners.cout_intervention_evitee is 'Coût moyen estimé d''une intervention technicien évitée, configurable par partenaire, utilisé pour le calcul des économies.';$cmt$;
    end if;
    if exists (select 1 from information_schema.columns where table_schema='public' and table_name='partners' and column_name='sav_connecte') then
      execute $cmt$comment on column partners.sav_connecte is 'Indique si le partenaire a configuré une escalade SAV connectée (rdv, rappel, chat).';$cmt$;
    end if;
    if exists (select 1 from information_schema.columns where table_schema='public' and table_name='partners' and column_name='sav_rdv_url') then
      execute $cmt$comment on column partners.sav_rdv_url is 'URL de prise de rendez-vous SAV proposée au client lors d''une escalade.';$cmt$;
    end if;
    if exists (select 1 from information_schema.columns where table_schema='public' and table_name='partners' and column_name='sav_rappel_numero') then
      execute $cmt$comment on column partners.sav_rappel_numero is 'Numéro de téléphone à utiliser pour un rappel SAV lors d''une escalade.';$cmt$;
    end if;
    if exists (select 1 from information_schema.columns where table_schema='public' and table_name='partners' and column_name='sav_chat_url') then
      execute $cmt$comment on column partners.sav_chat_url is 'URL du chat SAV proposé au client lors d''une escalade.';$cmt$;
    end if;
    if exists (select 1 from information_schema.columns where table_schema='public' and table_name='partners' and column_name='sav_delai_prise_en_charge') then
      execute $cmt$comment on column partners.sav_delai_prise_en_charge is 'Délai de prise en charge SAV communiqué au client, propre au partenaire.';$cmt$;
    end if;
    if exists (select 1 from information_schema.columns where table_schema='public' and table_name='partners' and column_name='sav_garantie_fabricant') then
      execute $cmt$comment on column partners.sav_garantie_fabricant is 'Indique si le partenaire gère la garantie fabricant dans son parcours SAV.';$cmt$;
    end if;
    if exists (select 1 from information_schema.columns where table_schema='public' and table_name='partners' and column_name='backoffice_nom') then
      execute $cmt$comment on column partners.backoffice_nom is 'Nom affiché du partenaire dans son back-office personnalisé.';$cmt$;
    end if;
    if exists (select 1 from information_schema.columns where table_schema='public' and table_name='partners' and column_name='backoffice_logo_url') then
      execute $cmt$comment on column partners.backoffice_logo_url is 'URL du logo affiché dans le back-office du partenaire.';$cmt$;
    end if;
    if exists (select 1 from information_schema.columns where table_schema='public' and table_name='partners' and column_name='backoffice_couleur') then
      execute $cmt$comment on column partners.backoffice_couleur is 'Couleur principale utilisée pour personnaliser le back-office du partenaire.';$cmt$;
    end if;
    if exists (select 1 from information_schema.columns where table_schema='public' and table_name='partners' and column_name='backoffice_kpis_ordre') then
      execute $cmt$comment on column partners.backoffice_kpis_ordre is 'Ordre d''affichage des indicateurs (KPIs) dans le back-office du partenaire, au format JSON.';$cmt$;
    end if;
  end if;
end $$;

-- ===========================================================================
-- conversations (colonnes ajoutées par 003, 005, 007 — table de base hors périmètre)
-- ===========================================================================
do $$
begin
  if to_regclass('public.conversations') is not null then
    execute $cmt$comment on table conversations is 'Historique des conversations entre un utilisateur et l''assistant Reparo (diagnostic ou prise en main), avec résultat, NPS et données d''escalade SAV.';$cmt$;
    if exists (select 1 from information_schema.columns where table_schema='public' and table_name='conversations' and column_name='partner') then
      execute $cmt$comment on column conversations.partner is 'Nom du partenaire à l''origine de la conversation, utilisé pour le tracking et le filtrage.';$cmt$;
    end if;
    if exists (select 1 from information_schema.columns where table_schema='public' and table_name='conversations' and column_name='ref_externe') then
      execute $cmt$comment on column conversations.ref_externe is 'Référence externe fournie par le partenaire pour relier la conversation à son propre système.';$cmt$;
    end if;
    if exists (select 1 from information_schema.columns where table_schema='public' and table_name='conversations' and column_name='modele') then
      execute $cmt$comment on column conversations.modele is 'Référence du modèle d''appareil concerné par le diagnostic.';$cmt$;
    end if;
    if exists (select 1 from information_schema.columns where table_schema='public' and table_name='conversations' and column_name='resultat') then
      execute $cmt$comment on column conversations.resultat is 'Issue du diagnostic : résolu, échec ou abandonné.';$cmt$;
    end if;
    if exists (select 1 from information_schema.columns where table_schema='public' and table_name='conversations' and column_name='duree_minutes') then
      execute $cmt$comment on column conversations.duree_minutes is 'Durée de la conversation en minutes.';$cmt$;
    end if;
    if exists (select 1 from information_schema.columns where table_schema='public' and table_name='conversations' and column_name='started_at') then
      execute $cmt$comment on column conversations.started_at is 'Date et heure de démarrage de la conversation.';$cmt$;
    end if;
    if exists (select 1 from information_schema.columns where table_schema='public' and table_name='conversations' and column_name='webhook_envoye') then
      execute $cmt$comment on column conversations.webhook_envoye is 'Indique si le résultat de la conversation a déjà été envoyé au webhook du partenaire.';$cmt$;
    end if;
    if exists (select 1 from information_schema.columns where table_schema='public' and table_name='conversations' and column_name='nps_score') then
      execute $cmt$comment on column conversations.nps_score is 'Score NPS (0 à 10) donné par l''utilisateur à l''issue de la conversation.';$cmt$;
    end if;
    if exists (select 1 from information_schema.columns where table_schema='public' and table_name='conversations' and column_name='nps_commentaire') then
      execute $cmt$comment on column conversations.nps_commentaire is 'Commentaire libre laissé par l''utilisateur lors de l''évaluation NPS.';$cmt$;
    end if;
    if exists (select 1 from information_schema.columns where table_schema='public' and table_name='conversations' and column_name='mode') then
      execute $cmt$comment on column conversations.mode is 'Mode de la conversation : bienvenue (premier contact) ou diagnostic (résolution de panne).';$cmt$;
    end if;
    if exists (select 1 from information_schema.columns where table_schema='public' and table_name='conversations' and column_name='escalade_sav') then
      execute $cmt$comment on column conversations.escalade_sav is 'Indique si la conversation a été escaladée vers le SAV du partenaire.';$cmt$;
    end if;
    if exists (select 1 from information_schema.columns where table_schema='public' and table_name='conversations' and column_name='canal_escalade') then
      execute $cmt$comment on column conversations.canal_escalade is 'Canal utilisé pour l''escalade SAV : rdv, rappel ou chat.';$cmt$;
    end if;
    if exists (select 1 from information_schema.columns where table_schema='public' and table_name='conversations' and column_name='garantie_type') then
      execute $cmt$comment on column conversations.garantie_type is 'Type de garantie applicable à l''appareil au moment de la conversation : fabricant, partenaire ou aucune.';$cmt$;
    end if;
    if exists (select 1 from information_schema.columns where table_schema='public' and table_name='conversations' and column_name='nps_parcours') then
      execute $cmt$comment on column conversations.nps_parcours is 'Segment de parcours utilisateur associé à l''évaluation NPS : bienvenue, résolu, escalade ou abandonné.';$cmt$;
    end if;
  end if;
end $$;

-- ===========================================================================
-- appareils (colonnes ajoutées par 008, 009 — table de base hors périmètre)
-- ===========================================================================
do $$
begin
  if to_regclass('public.appareils') is not null then
    execute $cmt$comment on table appareils is 'Appareils électroménagers enregistrés par les utilisateurs, avec garanties et attribution partenaire.';$cmt$;
    if exists (select 1 from information_schema.columns where table_schema='public' and table_name='appareils' and column_name='partner') then
      execute $cmt$comment on column appareils.partner is 'Partenaire auquel l''appareil est attribué, pour le calcul d''adoption et d''économies côté admin/partenaire.';$cmt$;
    end if;
    if exists (select 1 from information_schema.columns where table_schema='public' and table_name='appareils' and column_name='qr_code_url') then
      execute $cmt$comment on column appareils.qr_code_url is 'URL du QR code associé à l''appareil, utilisé pour l''accès rapide au suivi d''entretien.';$cmt$;
    end if;
    if exists (select 1 from information_schema.columns where table_schema='public' and table_name='appareils' and column_name='date_achat') then
      execute $cmt$comment on column appareils.date_achat is 'Date d''achat de l''appareil par l''utilisateur.';$cmt$;
    end if;
    if exists (select 1 from information_schema.columns where table_schema='public' and table_name='appareils' and column_name='garantie_fabricant_fin') then
      execute $cmt$comment on column appareils.garantie_fabricant_fin is 'Date de fin de la garantie fabricant de l''appareil.';$cmt$;
    end if;
    if exists (select 1 from information_schema.columns where table_schema='public' and table_name='appareils' and column_name='garantie_partenaire_fin') then
      execute $cmt$comment on column appareils.garantie_partenaire_fin is 'Date de fin de la garantie étendue proposée par le partenaire.';$cmt$;
    end if;
  end if;
end $$;

-- ===========================================================================
-- entretiens (007, colonne ajoutée par 009)
-- ===========================================================================
do $$
begin
  if to_regclass('public.entretiens') is not null then
    execute $cmt$comment on table entretiens is 'Historique des entretiens effectués sur les appareils via Reparo.';$cmt$;
    if exists (select 1 from information_schema.columns where table_schema='public' and table_name='entretiens' and column_name='user_id') then
      execute $cmt$comment on column entretiens.user_id is 'Utilisateur propriétaire de l''appareil ayant fait l''objet de l''entretien.';$cmt$;
    end if;
    if exists (select 1 from information_schema.columns where table_schema='public' and table_name='entretiens' and column_name='appareil_id') then
      execute $cmt$comment on column entretiens.appareil_id is 'Appareil sur lequel l''entretien a été réalisé.';$cmt$;
    end if;
    if exists (select 1 from information_schema.columns where table_schema='public' and table_name='entretiens' and column_name='type_entretien') then
      execute $cmt$comment on column entretiens.type_entretien is 'Nature de l''entretien réalisé (ex: détartrage, nettoyage filtre).';$cmt$;
    end if;
    if exists (select 1 from information_schema.columns where table_schema='public' and table_name='entretiens' and column_name='date_realisation') then
      execute $cmt$comment on column entretiens.date_realisation is 'Date à laquelle l''entretien a été effectivement réalisé.';$cmt$;
    end if;
    if exists (select 1 from information_schema.columns where table_schema='public' and table_name='entretiens' and column_name='rappel_suivant') then
      execute $cmt$comment on column entretiens.rappel_suivant is 'Date prévue du prochain entretien à rappeler à l''utilisateur.';$cmt$;
    end if;
    if exists (select 1 from information_schema.columns where table_schema='public' and table_name='entretiens' and column_name='partner_id') then
      execute $cmt$comment on column entretiens.partner_id is 'Partenaire attribué directement à l''entretien, pour éviter la jointure via appareils.';$cmt$;
    end if;
  end if;
end $$;

-- ===========================================================================
-- rappels (007)
-- ===========================================================================
do $$
begin
  if to_regclass('public.rappels') is not null then
    execute $cmt$comment on table rappels is 'Calendrier de rappels d''entretien automatique envoyés aux utilisateurs.';$cmt$;
    execute $cmt$comment on column rappels.user_id is 'Utilisateur destinataire du rappel d''entretien.';$cmt$;
    execute $cmt$comment on column rappels.appareil_id is 'Appareil concerné par le rappel d''entretien.';$cmt$;
    execute $cmt$comment on column rappels.type_rappel is 'Nature de l''entretien à effectuer rappelé à l''utilisateur.';$cmt$;
    execute $cmt$comment on column rappels.date_prevue is 'Date prévue à laquelle l''entretien doit être effectué.';$cmt$;
    execute $cmt$comment on column rappels.statut is 'État du rappel : en_attente, envoyé, complété ou ignoré.';$cmt$;
  end if;
end $$;

-- ===========================================================================
-- partner_login_logs (005)
-- ===========================================================================
do $$
begin
  if to_regclass('public.partner_login_logs') is not null then
    execute $cmt$comment on table partner_login_logs is 'Journal des connexions des partenaires à leur espace back-office.';$cmt$;
    execute $cmt$comment on column partner_login_logs.partner_id is 'Partenaire qui s''est connecté.';$cmt$;
    execute $cmt$comment on column partner_login_logs.user_id is 'Identifiant du compte Supabase Auth utilisé pour la connexion.';$cmt$;
    execute $cmt$comment on column partner_login_logs.ip is 'Adresse IP depuis laquelle la connexion a été effectuée.';$cmt$;
  end if;
end $$;

-- ===========================================================================
-- partner_webhook_logs (006)
-- ===========================================================================
do $$
begin
  if to_regclass('public.partner_webhook_logs') is not null then
    execute $cmt$comment on table partner_webhook_logs is 'Journal des tentatives d''envoi de webhook partenaire, succès et échecs, pour diagnostiquer les livraisons ratées.';$cmt$;
    execute $cmt$comment on column partner_webhook_logs.partner_id is 'Partenaire destinataire du webhook.';$cmt$;
    execute $cmt$comment on column partner_webhook_logs.conversation_id is 'Conversation à l''origine de l''envoi du webhook.';$cmt$;
    execute $cmt$comment on column partner_webhook_logs.success is 'Indique si l''envoi du webhook a réussi.';$cmt$;
    execute $cmt$comment on column partner_webhook_logs.http_status is 'Code de statut HTTP retourné par le serveur du partenaire.';$cmt$;
    execute $cmt$comment on column partner_webhook_logs.error is 'Message d''erreur en cas d''échec de l''envoi du webhook.';$cmt$;
  end if;
end $$;

-- ===========================================================================
-- config_globale (009)
-- ===========================================================================
do $$
begin
  if to_regclass('public.config_globale') is not null then
    execute $cmt$comment on table config_globale is 'Paramètres par défaut de la plateforme (couche 2 du moteur de configuration), modifiables uniquement par l''admin.';$cmt$;
    execute $cmt$comment on column config_globale.cle is 'Clé unique identifiant le paramètre de configuration.';$cmt$;
    execute $cmt$comment on column config_globale.valeur is 'Valeur du paramètre de configuration, au format JSON.';$cmt$;
    execute $cmt$comment on column config_globale.description is 'Description fonctionnelle du paramètre, à destination des administrateurs.';$cmt$;
    execute $cmt$comment on column config_globale.modifiable_par_partenaire is 'Indique si un partenaire peut surcharger ce paramètre via config_partenaire.';$cmt$;
    execute $cmt$comment on column config_globale.updated_at is 'Date de dernière modification du paramètre.';$cmt$;
  end if;
end $$;

-- ===========================================================================
-- config_partenaire (009)
-- ===========================================================================
do $$
begin
  if to_regclass('public.config_partenaire') is not null then
    execute $cmt$comment on table config_partenaire is 'Personnalisation de configuration par partenaire (couche 3), prioritaire sur config_globale.';$cmt$;
    execute $cmt$comment on column config_partenaire.partner_id is 'Partenaire auquel s''applique cette personnalisation de configuration.';$cmt$;
    execute $cmt$comment on column config_partenaire.cle is 'Clé du paramètre personnalisé, correspondant à une clé de config_globale.';$cmt$;
    execute $cmt$comment on column config_partenaire.valeur is 'Valeur personnalisée du paramètre pour ce partenaire, au format JSON.';$cmt$;
    execute $cmt$comment on column config_partenaire.date_modification is 'Date de dernière modification de la personnalisation.';$cmt$;
  end if;
end $$;

-- ===========================================================================
-- releases (009)
-- ===========================================================================
do $$
begin
  if to_regclass('public.releases') is not null then
    execute $cmt$comment on table releases is 'Système de release management de l''app mère : description et statut de déploiement de chaque version.';$cmt$;
    execute $cmt$comment on column releases.version is 'Numéro de version unique de la release.';$cmt$;
    execute $cmt$comment on column releases.titre is 'Titre de la release affiché aux partenaires.';$cmt$;
    execute $cmt$comment on column releases.type is 'Importance de la release : mineure, majeure ou critique.';$cmt$;
    execute $cmt$comment on column releases.resume is 'Résumé synthétique du contenu de la release.';$cmt$;
    execute $cmt$comment on column releases.ce_qui_change is 'Liste des changements apportés par la release, au format JSON.';$cmt$;
    execute $cmt$comment on column releases.ce_qui_ne_change_pas is 'Liste des éléments explicitement non affectés par la release, au format JSON.';$cmt$;
    execute $cmt$comment on column releases.impact_technique is 'Détail de l''impact technique de la release pour les équipes partenaires, au format JSON.';$cmt$;
    execute $cmt$comment on column releases.actions_requises is 'Actions que les partenaires doivent réaliser pour adopter la release.';$cmt$;
    execute $cmt$comment on column releases.date_disponibilite is 'Date à partir de laquelle la release est disponible.';$cmt$;
    execute $cmt$comment on column releases.date_limite_autorisation is 'Date limite avant laquelle un partenaire doit autoriser le déploiement.';$cmt$;
    execute $cmt$comment on column releases.statut_global is 'Statut global de la release : préparation, envoyée ou déployée.';$cmt$;
  end if;
end $$;

-- ===========================================================================
-- releases_partenaires (009)
-- ===========================================================================
do $$
begin
  if to_regclass('public.releases_partenaires') is not null then
    execute $cmt$comment on table releases_partenaires is 'Statut de déploiement d''une release, suivi individuellement pour chaque partenaire.';$cmt$;
    execute $cmt$comment on column releases_partenaires.release_id is 'Release concernée par ce statut de déploiement.';$cmt$;
    execute $cmt$comment on column releases_partenaires.partner_id is 'Partenaire concerné par ce statut de déploiement.';$cmt$;
    execute $cmt$comment on column releases_partenaires.statut is 'Statut du déploiement chez ce partenaire : en_attente, autorisée, reportée, déployée ou forcée.';$cmt$;
    execute $cmt$comment on column releases_partenaires.date_autorisation is 'Date à laquelle le partenaire a autorisé le déploiement de la release.';$cmt$;
    execute $cmt$comment on column releases_partenaires.date_deploiement is 'Date à laquelle la release a effectivement été déployée chez ce partenaire.';$cmt$;
    execute $cmt$comment on column releases_partenaires.notes_partenaire is 'Notes laissées par le partenaire concernant ce déploiement.';$cmt$;
  end if;
end $$;

-- ===========================================================================
-- bienvenue_ouvertures (010)
-- ===========================================================================
do $$
begin
  if to_regclass('public.bienvenue_ouvertures') is not null then
    execute $cmt$comment on table bienvenue_ouvertures is 'Journal de chaque ouverture du lien Mode Bienvenue, pour calculer un taux d''ouverture réel.';$cmt$;
    execute $cmt$comment on column bienvenue_ouvertures.partner_nom is 'Nom du partenaire à l''origine du lien Mode Bienvenue ouvert.';$cmt$;
    execute $cmt$comment on column bienvenue_ouvertures.appareil is 'Type d''appareil concerné par l''ouverture du lien, si connu.';$cmt$;
    execute $cmt$comment on column bienvenue_ouvertures.modele is 'Modèle d''appareil concerné par l''ouverture du lien, si connu.';$cmt$;
  end if;
end $$;
