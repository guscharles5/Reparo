-- Migration : 011_documentation_tables
-- Date : 2026-06-29
-- Description : Ajoute des commentaires PostgreSQL (comment on table / comment on column) documentant le rôle métier de toutes les tables et colonnes non triviales créées par les migrations 001 à 010, sans modifier le schéma.
-- Tables modifiées : agent_test_runs, manuals, partners, conversations, appareils, entretiens, rappels, partner_login_logs, partner_webhook_logs, config_globale, config_partenaire, releases, releases_partenaires, bienvenue_ouvertures

-- ===========================================================================
-- agent_test_runs (001)
-- ===========================================================================
comment on table agent_test_runs is 'Résultats des agents Playwright simulant des utilisateurs réels lors des tests automatisés.';
comment on column agent_test_runs.persona is 'Nom du persona utilisateur simulé par l''agent de test (ex: "Michel").';
comment on column agent_test_runs.appareil_type is 'Type d''appareil électroménager testé dans le scénario (ex: "Lave-linge").';
comment on column agent_test_runs.panne is 'Panne ou symptôme simulé par l''agent pour ce scénario de test (ex: "Fuite d''eau").';
comment on column agent_test_runs.status is 'Issue du scénario de test : résolu, échec ou erreur technique.';
comment on column agent_test_runs.turns is 'Nombre d''échanges (tours de conversation) effectués pendant le scénario.';
comment on column agent_test_runs.transcript is 'Transcription complète de la conversation simulée, au format JSON.';
comment on column agent_test_runs.duration_ms is 'Durée totale du scénario de test en millisecondes.';
comment on column agent_test_runs.base_url is 'URL de base de l''environnement testé par l''agent.';

-- ===========================================================================
-- manuals (002)
-- ===========================================================================
comment on table manuals is 'Bibliothèque de notices techniques par modèle d''appareil, avec recherche plein texte.';
comment on column manuals.type_appareil is 'Type de l''appareil concerné par la notice (ex: "Lave-linge").';
comment on column manuals.marque is 'Marque du fabricant de l''appareil (ex: "Bosch").';
comment on column manuals.reference_modele is 'Référence exacte du modèle d''appareil (ex: "WAT28660FF").';
comment on column manuals.nom_modele is 'Nom commercial du modèle, pour affichage utilisateur (ex: "Série 8 — 9kg").';
comment on column manuals.contenu_texte is 'Texte intégral de la notice, extrait du PDF ou saisi manuellement, utilisé pour la recherche par mots-clés.';
comment on column manuals.url_pdf is 'Lien public vers le PDF de la notice stocké dans le bucket manuals-pdf.';
comment on column manuals.date_ajout is 'Date d''ajout de la notice dans la bibliothèque.';

-- ===========================================================================
-- partners (003, 004, 005, 007, 009)
-- ===========================================================================
comment on table partners is 'Configuration des partenaires intégrés à la plateforme (back-office, webhook, SAV, personnalisation).';
comment on column partners.nom is 'Nom unique du partenaire, utilisé comme identifiant métier (ex: lien avec conversations.partner).';
comment on column partners.webhook_url is 'URL du webhook sortant vers lequel les résultats de diagnostic sont envoyés.';
comment on column partners.webhook_secret is 'Secret utilisé pour signer les requêtes webhook envoyées au partenaire.';
comment on column partners.actif is 'Indique si l''intégration webhook du partenaire est active.';
comment on column partners.crm_type is 'Preset de payload webhook choisi par le partenaire : custom, salesforce, hubspot ou zendesk.';
comment on column partners.user_id is 'Identifiant du compte Supabase Auth associé à ce partenaire, pour l''accès à l''espace partenaire.';
comment on column partners.email is 'Adresse email de contact du compte partenaire.';
comment on column partners.compte_actif is 'Indique si l''accès du partenaire à son espace back-office est actif (distinct du statut actif du webhook).';
comment on column partners.cout_intervention_evitee is 'Coût moyen estimé d''une intervention technicien évitée, configurable par partenaire, utilisé pour le calcul des économies.';
comment on column partners.sav_connecte is 'Indique si le partenaire a configuré une escalade SAV connectée (rdv, rappel, chat).';
comment on column partners.sav_rdv_url is 'URL de prise de rendez-vous SAV proposée au client lors d''une escalade.';
comment on column partners.sav_rappel_numero is 'Numéro de téléphone à utiliser pour un rappel SAV lors d''une escalade.';
comment on column partners.sav_chat_url is 'URL du chat SAV proposé au client lors d''une escalade.';
comment on column partners.sav_delai_prise_en_charge is 'Délai de prise en charge SAV communiqué au client, propre au partenaire.';
comment on column partners.sav_garantie_fabricant is 'Indique si le partenaire gère la garantie fabricant dans son parcours SAV.';
comment on column partners.backoffice_nom is 'Nom affiché du partenaire dans son back-office personnalisé.';
comment on column partners.backoffice_logo_url is 'URL du logo affiché dans le back-office du partenaire.';
comment on column partners.backoffice_couleur is 'Couleur principale utilisée pour personnaliser le back-office du partenaire.';
comment on column partners.backoffice_kpis_ordre is 'Ordre d''affichage des indicateurs (KPIs) dans le back-office du partenaire, au format JSON.';

-- ===========================================================================
-- conversations (colonnes ajoutées par 003, 005, 007 — table de base hors périmètre)
-- ===========================================================================
comment on table conversations is 'Historique des conversations entre un utilisateur et l''assistant Reparo (diagnostic ou prise en main), avec résultat, NPS et données d''escalade SAV.';
comment on column conversations.partner is 'Nom du partenaire à l''origine de la conversation, utilisé pour le tracking et le filtrage.';
comment on column conversations.ref_externe is 'Référence externe fournie par le partenaire pour relier la conversation à son propre système.';
comment on column conversations.modele is 'Référence du modèle d''appareil concerné par le diagnostic.';
comment on column conversations.resultat is 'Issue du diagnostic : résolu, échec ou abandonné.';
comment on column conversations.duree_minutes is 'Durée de la conversation en minutes.';
comment on column conversations.started_at is 'Date et heure de démarrage de la conversation.';
comment on column conversations.webhook_envoye is 'Indique si le résultat de la conversation a déjà été envoyé au webhook du partenaire.';
comment on column conversations.nps_score is 'Score NPS (0 à 10) donné par l''utilisateur à l''issue de la conversation.';
comment on column conversations.nps_commentaire is 'Commentaire libre laissé par l''utilisateur lors de l''évaluation NPS.';
comment on column conversations.mode is 'Mode de la conversation : bienvenue (premier contact) ou diagnostic (résolution de panne).';
comment on column conversations.escalade_sav is 'Indique si la conversation a été escaladée vers le SAV du partenaire.';
comment on column conversations.canal_escalade is 'Canal utilisé pour l''escalade SAV : rdv, rappel ou chat.';
comment on column conversations.garantie_type is 'Type de garantie applicable à l''appareil au moment de la conversation : fabricant, partenaire ou aucune.';
comment on column conversations.nps_parcours is 'Segment de parcours utilisateur associé à l''évaluation NPS : bienvenue, résolu, escalade ou abandonné.';

-- ===========================================================================
-- appareils (colonnes ajoutées par 008, 009 — table de base hors périmètre)
-- ===========================================================================
comment on table appareils is 'Appareils électroménagers enregistrés par les utilisateurs, avec garanties et attribution partenaire.';
comment on column appareils.partner is 'Partenaire auquel l''appareil est attribué, pour le calcul d''adoption et d''économies côté admin/partenaire.';
comment on column appareils.qr_code_url is 'URL du QR code associé à l''appareil, utilisé pour l''accès rapide au suivi d''entretien.';
comment on column appareils.date_achat is 'Date d''achat de l''appareil par l''utilisateur.';
comment on column appareils.garantie_fabricant_fin is 'Date de fin de la garantie fabricant de l''appareil.';
comment on column appareils.garantie_partenaire_fin is 'Date de fin de la garantie étendue proposée par le partenaire.';

-- ===========================================================================
-- entretiens (007, colonne ajoutée par 009)
-- ===========================================================================
comment on table entretiens is 'Historique des entretiens effectués sur les appareils via Reparo.';
comment on column entretiens.user_id is 'Utilisateur propriétaire de l''appareil ayant fait l''objet de l''entretien.';
comment on column entretiens.appareil_id is 'Appareil sur lequel l''entretien a été réalisé.';
comment on column entretiens.type_entretien is 'Nature de l''entretien réalisé (ex: détartrage, nettoyage filtre).';
comment on column entretiens.date_realisation is 'Date à laquelle l''entretien a été effectivement réalisé.';
comment on column entretiens.rappel_suivant is 'Date prévue du prochain entretien à rappeler à l''utilisateur.';
comment on column entretiens.partner_id is 'Partenaire attribué directement à l''entretien, pour éviter la jointure via appareils.';

-- ===========================================================================
-- rappels (007)
-- ===========================================================================
comment on table rappels is 'Calendrier de rappels d''entretien automatique envoyés aux utilisateurs.';
comment on column rappels.user_id is 'Utilisateur destinataire du rappel d''entretien.';
comment on column rappels.appareil_id is 'Appareil concerné par le rappel d''entretien.';
comment on column rappels.type_rappel is 'Nature de l''entretien à effectuer rappelé à l''utilisateur.';
comment on column rappels.date_prevue is 'Date prévue à laquelle l''entretien doit être effectué.';
comment on column rappels.statut is 'État du rappel : en_attente, envoyé, complété ou ignoré.';

-- ===========================================================================
-- partner_login_logs (005)
-- ===========================================================================
comment on table partner_login_logs is 'Journal des connexions des partenaires à leur espace back-office.';
comment on column partner_login_logs.partner_id is 'Partenaire qui s''est connecté.';
comment on column partner_login_logs.user_id is 'Identifiant du compte Supabase Auth utilisé pour la connexion.';
comment on column partner_login_logs.ip is 'Adresse IP depuis laquelle la connexion a été effectuée.';

-- ===========================================================================
-- partner_webhook_logs (006)
-- ===========================================================================
comment on table partner_webhook_logs is 'Journal des tentatives d''envoi de webhook partenaire, succès et échecs, pour diagnostiquer les livraisons ratées.';
comment on column partner_webhook_logs.partner_id is 'Partenaire destinataire du webhook.';
comment on column partner_webhook_logs.conversation_id is 'Conversation à l''origine de l''envoi du webhook.';
comment on column partner_webhook_logs.success is 'Indique si l''envoi du webhook a réussi.';
comment on column partner_webhook_logs.http_status is 'Code de statut HTTP retourné par le serveur du partenaire.';
comment on column partner_webhook_logs.error is 'Message d''erreur en cas d''échec de l''envoi du webhook.';

-- ===========================================================================
-- config_globale (009)
-- ===========================================================================
comment on table config_globale is 'Paramètres par défaut de la plateforme (couche 2 du moteur de configuration), modifiables uniquement par l''admin.';
comment on column config_globale.cle is 'Clé unique identifiant le paramètre de configuration.';
comment on column config_globale.valeur is 'Valeur du paramètre de configuration, au format JSON.';
comment on column config_globale.description is 'Description fonctionnelle du paramètre, à destination des administrateurs.';
comment on column config_globale.modifiable_par_partenaire is 'Indique si un partenaire peut surcharger ce paramètre via config_partenaire.';
comment on column config_globale.updated_at is 'Date de dernière modification du paramètre.';

-- ===========================================================================
-- config_partenaire (009)
-- ===========================================================================
comment on table config_partenaire is 'Personnalisation de configuration par partenaire (couche 3), prioritaire sur config_globale.';
comment on column config_partenaire.partner_id is 'Partenaire auquel s''applique cette personnalisation de configuration.';
comment on column config_partenaire.cle is 'Clé du paramètre personnalisé, correspondant à une clé de config_globale.';
comment on column config_partenaire.valeur is 'Valeur personnalisée du paramètre pour ce partenaire, au format JSON.';
comment on column config_partenaire.date_modification is 'Date de dernière modification de la personnalisation.';

-- ===========================================================================
-- releases (009)
-- ===========================================================================
comment on table releases is 'Système de release management de l''app mère : description et statut de déploiement de chaque version.';
comment on column releases.version is 'Numéro de version unique de la release.';
comment on column releases.titre is 'Titre de la release affiché aux partenaires.';
comment on column releases.type is 'Importance de la release : mineure, majeure ou critique.';
comment on column releases.resume is 'Résumé synthétique du contenu de la release.';
comment on column releases.ce_qui_change is 'Liste des changements apportés par la release, au format JSON.';
comment on column releases.ce_qui_ne_change_pas is 'Liste des éléments explicitement non affectés par la release, au format JSON.';
comment on column releases.impact_technique is 'Détail de l''impact technique de la release pour les équipes partenaires, au format JSON.';
comment on column releases.actions_requises is 'Actions que les partenaires doivent réaliser pour adopter la release.';
comment on column releases.date_disponibilite is 'Date à partir de laquelle la release est disponible.';
comment on column releases.date_limite_autorisation is 'Date limite avant laquelle un partenaire doit autoriser le déploiement.';
comment on column releases.statut_global is 'Statut global de la release : préparation, envoyée ou déployée.';

-- ===========================================================================
-- releases_partenaires (009)
-- ===========================================================================
comment on table releases_partenaires is 'Statut de déploiement d''une release, suivi individuellement pour chaque partenaire.';
comment on column releases_partenaires.release_id is 'Release concernée par ce statut de déploiement.';
comment on column releases_partenaires.partner_id is 'Partenaire concerné par ce statut de déploiement.';
comment on column releases_partenaires.statut is 'Statut du déploiement chez ce partenaire : en_attente, autorisée, reportée, déployée ou forcée.';
comment on column releases_partenaires.date_autorisation is 'Date à laquelle le partenaire a autorisé le déploiement de la release.';
comment on column releases_partenaires.date_deploiement is 'Date à laquelle la release a effectivement été déployée chez ce partenaire.';
comment on column releases_partenaires.notes_partenaire is 'Notes laissées par le partenaire concernant ce déploiement.';

-- ===========================================================================
-- bienvenue_ouvertures (010)
-- ===========================================================================
comment on table bienvenue_ouvertures is 'Journal de chaque ouverture du lien Mode Bienvenue, pour calculer un taux d''ouverture réel.';
comment on column bienvenue_ouvertures.partner_nom is 'Nom du partenaire à l''origine du lien Mode Bienvenue ouvert.';
comment on column bienvenue_ouvertures.appareil is 'Type d''appareil concerné par l''ouverture du lien, si connu.';
comment on column bienvenue_ouvertures.modele is 'Modèle d''appareil concerné par l''ouverture du lien, si connu.';
