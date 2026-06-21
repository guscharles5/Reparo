-- Attribution partenaire sur appareils, pour calculer côté admin/partenaire
-- le taux d'adoption du calendrier d'entretien et les économies de
-- maintenance préventive sans heuristique de jointure imprécise.
alter table appareils add column if not exists partner text;

create index if not exists idx_appareils_partner on appareils(partner);
