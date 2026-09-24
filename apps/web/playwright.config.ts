import { defineConfig, devices } from '@playwright/test';

const host = '127.0.0.1';
const port = 3100;
const baseURL = `http://${host}:${port}`;

export default defineConfig({
  testDir: './tests',
  testMatch: 'foundation.e2e.spec.ts',
  fullyParallel: false,
  use: {
    baseURL,
    browserName: 'chromium',
    headless: true,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: [
    {
      command: 'corepack pnpm --dir ../api run start',
      cwd: '.',
      url: 'http://127.0.0.1:3999/health/live',
      reuseExistingServer: !process.env.CI,
      env: {
        CORS_ORIGIN: `http://${host}:${port}`,
        DATABASE_URL:
          'postgresql://synthetic_user:synthetic_password@127.0.0.1:1/synthetic_db?connect_timeout=1',
        NODE_ENV: 'test',
        PORT: '3999',
      },
    },
    {
      command: `corepack pnpm exec next dev --hostname ${host} --port ${port}`,
      cwd: '.',
      url: baseURL,
      reuseExistingServer: !process.env.CI,
      env: {
        NEXT_PUBLIC_API_ORIGIN: 'http://127.0.0.1:3999',
      },
    },
  ],
});
