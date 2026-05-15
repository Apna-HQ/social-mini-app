import { defineConfig, devices } from '@playwright/test';
// Smoke-only config: targets the running PM2 dev servers and skips the
// pre-existing tests/example.spec.ts (production-Vercel, deprecated).
export default defineConfig({
  testDir: './tests/integration',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list']],
  use: { trace: 'retain-on-failure' },
  projects: [{ name: 'Mobile Chrome', use: { ...devices['Pixel 5'] } }],
  // No webServer: PM2 is the source of truth.
});
