const { test, expect } = require('@playwright/test')

test('la page d\'accueil charge', async ({ page }) => {
  await page.goto('/?guest=1')
  await expect(page.getByText('Choisissez votre appareil', { exact: true })).toBeVisible()
})

test('le mode maintenance s\'affiche quand il est activé', async ({ page }) => {
  await page.route('**/api/admin/settings/public', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        settings: {
          language: 'fr',
          features: { guestMode: true, photoAnalysis: true, savModal: true, maintenanceMode: true },
          maintenanceMessage: 'Maintenance en cours — test automatisé.',
        },
      }),
    })
  })
  await page.goto('/?guest=1')
  await expect(page.getByText('Reparo est en maintenance', { exact: true })).toBeVisible()
  await expect(page.getByText('Maintenance en cours — test automatisé.', { exact: true })).toBeVisible()
})

test('le back-office est accessible', async ({ page }) => {
  await page.goto('/admin')
  await expect(page.getByText('Reparo Admin', { exact: true })).toBeVisible()
  await expect(page.getByPlaceholder('admin@reparo.fr')).toBeVisible()
})
