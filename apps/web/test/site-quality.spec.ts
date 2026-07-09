import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

const pages = [
  { name: 'home', path: '/?intro=0' },
  { name: 'search', path: '/search' },
  { name: 'product', path: '/products/premium-burger-offer-kit' },
  { name: 'checkout', path: '/checkout' },
  { name: 'account', path: '/account' },
] as const;

const accessibilityPages = pages.filter((page) => ['home', 'product', 'checkout'].includes(page.name));

test.describe('customer site quality', () => {
  for (const pageTarget of pages) {
    test(`${pageTarget.name} loads without broken primary UI`, async ({ page }) => {
      const consoleErrors: string[] = [];
      page.on('console', (message) => {
        if (message.type() === 'error' && !message.text().includes('_next/webpack-hmr')) {
          consoleErrors.push(message.text());
        }
      });

      await page.goto(pageTarget.path, { waitUntil: 'domcontentloaded' });

      await expect(page.locator('main').first()).toBeVisible();
      await expect(page.locator('body')).not.toContainText('Application error');
      await expect(page.locator('body')).not.toContainText('Unhandled Runtime Error');
      expect(consoleErrors).toEqual([]);
    });
  }

  for (const pageTarget of accessibilityPages) {
    test(`${pageTarget.name} has no serious accessibility violations`, async ({ page }) => {
      await page.goto(pageTarget.path, { waitUntil: 'domcontentloaded' });

      const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
      const serious = results.violations.filter((violation) => violation.impact === 'critical' || violation.impact === 'serious');

      expect(
        serious.map((violation) => ({
          id: violation.id,
          impact: violation.impact,
          help: violation.help,
          targets: violation.nodes.flatMap((node) => node.target).slice(0, 6),
        })),
      ).toEqual([]);
    });
  }

  test('primary customer buttons have clear behavior', async ({ page }) => {
    await page.goto('/products/premium-burger-offer-kit', { waitUntil: 'domcontentloaded' });

    await expect(page.locator('a[href^="/login?next="]').filter({ hasText: 'Sign in to add license' })).toBeVisible();

    await page.goto('/checkout', { waitUntil: 'domcontentloaded' });
    await expect(page.getByText('Sign in before checkout.')).toBeVisible();

    await page.goto('/search', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('button', { name: 'Find matched designs' })).toBeVisible();
  });
});
