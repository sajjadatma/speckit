import { createRequire } from 'node:module';
import type { APIRequestContext, Page, Route } from '@playwright/test';

if (process.env.NODE_TEST_CONTEXT === undefined) {
  const { expect, test } = createRequire(`${process.cwd()}/package.json`)(
    '@playwright/test',
  ) as typeof import('@playwright/test');

  for (const viewport of [
    { name: 'narrow', width: 375, height: 667 },
    { name: 'wide', width: 1440, height: 900 },
  ] as const) {
    test(`renders the neutral baseline shell at ${viewport.name} width`, async ({
      page,
    }: {
      page: Page;
    }) => {
      await page.setViewportSize(viewport);
      await page.goto('/');

      await expect(page.locator('main')).toBeVisible();
      await expect(page.getByRole('heading', { level: 1 })).toContainText(/platform foundation/i);
      expect(
        await page.locator('body').evaluate((body) => body.scrollWidth <= window.innerWidth),
      ).toBe(true);
    });
  }

  for (const viewport of [
    { name: 'narrow', width: 375, height: 667 },
    { name: 'wide', width: 1440, height: 900 },
  ] as const) {
    test(`runs the independent API and web CI journey at ${viewport.name} width`, async ({
      page,
      request,
    }: {
      page: Page;
      request: APIRequestContext;
    }) => {
      await page.setViewportSize(viewport);

      const [liveness, status] = await Promise.all([
        request.get('http://127.0.0.1:3999/health/live'),
        request.get('http://127.0.0.1:3999/api/v1/status'),
      ]);
      expect(liveness.status()).toBe(200);
      expect(await liveness.json()).toEqual({ status: 'live', requestId: expect.any(String) });
      expect(status.status()).toBe(200);
      expect(await status.json()).toEqual({ data: { status: 'operational' } });

      await page.route('**/api/v1/status', async (route: Route) => {
        const response = await request.get(route.request().url());
        await route.fulfill({
          body: await response.text(),
          contentType: 'application/json',
          status: response.status(),
        });
      });
      await page.goto('/');

      await expect(page.getByRole('heading', { name: 'Platform status' })).toBeVisible();
      await expect(page.getByText('The platform is ready.')).toBeVisible();
      await expect(page.locator('section[role="alert"]')).toHaveCount(0);
      expect(
        await page.locator('body').evaluate((body) => body.scrollWidth <= window.innerWidth),
      ).toBe(true);
    });
  }

  for (const viewport of [
    { name: 'narrow', width: 375, height: 667 },
    { name: 'wide', width: 1440, height: 900 },
  ] as const) {
    test(`renders every shared foundation state at ${viewport.name} width`, async ({
      page,
    }: {
      page: Page;
    }) => {
      await page.setViewportSize(viewport);
      await page.goto('/states');

      await expect(page.locator('nav')).toHaveCount(0);
      await expect(page.locator('form')).toHaveCount(0);

      for (const state of [
        'loading',
        'ready',
        'empty',
        'validation',
        'application',
        'service',
        'unexpected',
        'not-found',
        'route-error',
        'global-error',
      ] as const) {
        const surface = page.locator(`[data-foundation-state="${state}"]`);
        await expect(surface).toBeVisible();

        const recovery = surface.getByRole('link');
        if ((await recovery.count()) > 0) {
          await recovery.focus();
          await expect(recovery).toBeFocused();
          await expect(recovery).toHaveCSS('outline-style', /^(solid|auto)$/);
        }
      }

      expect(
        await page.locator('body').evaluate((body) => body.scrollWidth <= window.innerWidth),
      ).toBe(true);
    });
  }

  for (const viewport of [
    { name: 'narrow', width: 375, height: 667 },
    { name: 'wide', width: 1440, height: 900 },
  ] as const) {
    test(`fetches the live API across origins without interception at ${viewport.name} width`, async ({
      page,
    }: {
      page: Page;
    }) => {
      await page.setViewportSize(viewport);
      await page.goto('/');

      await expect(page.getByRole('heading', { name: 'Platform status' })).toBeVisible();
      await expect(page.getByText('The platform is ready.')).toBeVisible();
      await expect(page.locator('section[role="alert"]')).toHaveCount(0);
    });
  }

  test('presents an accessible not-found state with a visible-focus recovery link', async ({
    page,
  }: {
    page: Page;
  }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/this-route-does-not-exist');

    await expect(
      page.getByRole('heading', { name: /(not found|could not be found)/i }),
    ).toBeVisible();

    const recovery = page.getByRole('link', { name: /(back|start|home)/i });
    await expect(recovery).toBeVisible();
    await recovery.focus();
    await expect(recovery).toBeFocused();
    await expect(recovery).toHaveCSS('outline-style', /^(solid|auto)$/);
  });

  test('renders a safe, keyboard-recoverable service fallback for an injected API failure', async ({
    page,
  }: {
    page: Page;
  }) => {
    await page.route('**/api/v1/status', async (route: Route) => {
      await route.fulfill({
        status: 503,
        contentType: 'application/json',
        body: JSON.stringify({
          error: {
            category: 'service',
            code: 'SERVICE_UNAVAILABLE',
            message: 'service-failure-payload-sentinel',
          },
        }),
      });
    });

    await page.goto('/');

    const fallback = page.locator('section[role="alert"]');
    await expect(fallback).toBeVisible();
    await expect(fallback).toContainText(/service.*unavailable|connection/i);
    await expect(fallback).not.toContainText(/service-failure-payload-sentinel|stack|payload/i);
    await expect(page.getByRole('heading', { level: 1 })).not.toContainText(/operational|success/i);

    const recovery = fallback.getByRole('link', { name: /try again|retry/i });
    await recovery.focus();
    await expect(recovery).toBeFocused();
    await expect(recovery).toHaveCSS('outline-style', /^(solid|auto)$/);
  });
}
