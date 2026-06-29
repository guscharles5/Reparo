'use client'
// Fichier : categories-appareils/page.js
// Rôle : Page Catégories d'appareils — affiche un message "Bientôt disponible" en attendant
//         l'implémentation complète de cette section du back-office partenaire.
// Dépendances : components/shared/admin-ui
// Dernière modification : 2026-06-30
import { SectionHeader, Card, Icon } from '../../../../../components/shared/admin-ui'

export default function CatégoriesDappareils() {
  return (
    <div>
      <SectionHeader title="Catégories d'appareils" subtitle="Configurez les types d'appareils visibles dans votre application (lave-linge, réfrigérateur, four…) et personnalisez leurs libellés." />
      <Card>
        <div style={{ textAlign: 'center', padding: '48px 24px' }}>
          <div style={{ fontSize: '36px', marginBottom: '16px' }}>🚧</div>
          <div style={{ fontSize: '16px', fontWeight: '700', color: '#0f172a', marginBottom: '8px' }}>
            Bientôt disponible
          </div>
          <div style={{ fontSize: '13px', color: '#64748b', maxWidth: '400px', margin: '0 auto' }}>
            Cette section est en cours de développement.
            Elle sera disponible dans une prochaine mise à jour Reparo.
          </div>
        </div>
      </Card>
    </div>
  )
}
