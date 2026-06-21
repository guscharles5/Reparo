-- Migration : 008_appareils_partner_attribution
-- Date : 2026-06-25
-- Description : Ajoute la colonne partner sur appareils pour attribuer directement chaque appareil à un partenaire sans heuristique de jointure.
-- Tables modifiées : appareils

-- Attribution partenaire sur appareils, pour calculer côté admin/partenaire
-- le taux d'adoption du calendrier d'entretien et les économies de
-- maintenance préventive sans heuristique de jointure imprécise.
alter table appareils add column if not exists partner text;

create index if not exists idx_appareils_partner on appareils(partner);
