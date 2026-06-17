require('dotenv/config')
const { defineConfig, devices } = require('@playwright/test')

// Cible : l'app déployée (prod/preview). Surchargeable via PLAYWRIGHT_BASE_URL.
const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'https://reparo-rosy.vercel.app'

module.exports = defineConfig({
  testDir: './tests',
  timeout: 90_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: BASE_URL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    launchOptions: process.env.CHROMIUM_EXECUTABLE_PATH ? { executablePath: process.env.CHROMIUM_EXECUTABLE_PATH } : {},
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
})
