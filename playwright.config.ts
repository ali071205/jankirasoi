import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 45000,
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    headless: true,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  webServer: [
    {
      command: 'pnpm --filter @jankirasoi/api start:prod',
      url: 'http://localhost:3000/api/v1/health',
      timeout: 30000,
      reuseExistingServer: !process.env.CI,
    },
    {
      command: 'pnpm --filter @jankirasoi/web start',
      url: 'http://localhost:3001',
      timeout: 30000,
      reuseExistingServer: !process.env.CI,
    },
    {
      command: 'pnpm --filter @jankirasoi/admin start',
      url: 'http://localhost:3002',
      timeout: 30000,
      reuseExistingServer: !process.env.CI,
    },
  ],
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
