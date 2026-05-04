export const metadata = {
  title: 'Reparo — Dépannage électroménager IA',
  description: 'Diagnostiquez et réparez vos appareils électroménagers avec l\'aide de l\'IA',
}

export default function RootLayout({ children }) {
  return (
    <html lang="fr">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
      </head>
      <body style={{ margin: 0, padding: 0, background: '#f0f2f5' }}>{children}</body>
    </html>
  )
}
