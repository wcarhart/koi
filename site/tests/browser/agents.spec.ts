import { readFileSync } from 'node:fs';
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const source = readFileSync(
  new URL('../../../docs/llms.md', import.meta.url),
  'utf8',
);

test('homepage and shared navigation expose the agent guidance destinations', async ({
  page,
}) => {
  await page.goto('/');
  const heroLink = page.locator('.hero-agent-link');
  await expect(heroLink).toHaveText('LLM? Read llms.txt');
  await expect(
    heroLink.getByRole('link', { name: 'llms.txt' }),
  ).toHaveAttribute('href', '/llms.txt');
  const actions = page.locator('.header-actions');
  expect(
    await actions
      .locator('a,button')
      .evaluateAll((nodes) =>
        nodes.map((node) => node.getAttribute('aria-label')),
      ),
  ).toEqual([
    'GitHub repository',
    'See agent guidance',
    expect.stringMatching(/^Switch to .* mode$/),
  ]);
  const guidance = page.getByRole('link', {
    name: 'See agent guidance',
    exact: true,
  });
  await expect(guidance.locator('svg')).toHaveAttribute('fill', 'currentColor');
  await expect(guidance.locator('svg path')).toHaveCount(1);
  await guidance.click();
  await expect(page).toHaveURL('/agents');
  await expect(
    page.getByRole('heading', { name: 'Koi for agents', exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole('link', { name: 'llms.txt', exact: true }),
  ).toHaveAttribute('href', '/llms.txt');
  expect(
    await page.evaluate(
      () =>
        document.documentElement.scrollWidth <=
        document.documentElement.clientWidth,
    ),
  ).toBe(true);
});

test('agent tooltip appears on hover and focus and dismisses with Escape', async ({
  page,
}) => {
  await page.goto('/');
  const link = page.getByRole('link', {
    name: 'See agent guidance',
    exact: true,
  });
  const tooltip = page.getByRole('tooltip');
  await link.hover();
  await expect(tooltip).toHaveText('See agent guidance');
  await expect(tooltip).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(tooltip).not.toBeVisible();
  await page.mouse.move(0, 0);
  await link.focus();
  await expect(tooltip).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(tooltip).not.toBeVisible();
  await page.keyboard.press('Tab');
  await expect(
    page.getByRole('button', { name: /Switch to .* mode/ }),
  ).toBeFocused();
});

test('agent page, clipboard, and raw endpoint contain identical Markdown', async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'clipboard', {
      value: {
        writeText: async (text: string) => {
          (window as unknown as { copied: string }).copied = text;
        },
      },
    });
  });
  await page.goto('/agents');
  const code = page.locator('.agent-guidance-block code');
  expect(await code.textContent()).toBe(source);
  const raw = await page.request.get('/llms.txt');
  expect(raw.status()).toBe(200);
  expect(raw.headers()['content-type']).toContain('text/plain');
  expect(await raw.text()).toBe(source);
  const button = page.getByRole('button', { name: 'Copy agent guidance' });
  await button.click();
  await expect(button).toHaveAttribute('data-copy-state', 'success');
  expect(
    await page.evaluate(() => (window as unknown as { copied: string }).copied),
  ).toBe(source);
  await expect(button).not.toHaveAttribute('data-copy-state', 'success');
  await page.evaluate(() => {
    navigator.clipboard.writeText = async () => {
      throw new Error('denied');
    };
  });
  await button.click();
  await expect(button).toHaveAttribute('data-copy-state', 'error');
  await expect(page.locator('#announcement')).toContainText('Copy failed');
  const sitemap = await page.request.get('/sitemap.xml');
  expect(await sitemap.text()).toContain('https://koishell.com/agents');
});

test('agent page and tooltip are accessible in light and dark themes', async ({
  page,
}) => {
  for (const theme of ['light', 'dark'] as const) {
    await page.emulateMedia({ colorScheme: theme });
    await page.goto('/agents');
    await page.evaluate(() => document.fonts.ready);
    await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
    await page.mouse.move(0, 0);
    const idleColor = await page
      .getByRole('navigation', { name: 'Main navigation' })
      .getByRole('link', { name: 'Install', exact: true })
      .evaluate((node) => getComputedStyle(node).color);
    const accentColor = await page.evaluate(() => {
      const probe = document.createElement('span');
      probe.style.color = 'var(--accent)';
      document.body.append(probe);
      const color = getComputedStyle(probe).color;
      probe.remove();
      return color;
    });
    for (const label of ['GitHub repository', 'See agent guidance']) {
      const icon = page
        .locator('.header-actions')
        .getByRole('link', { name: label, exact: true });
      await expect(icon).toHaveCSS('color', idleColor);
      await expect(icon.locator('svg')).toHaveCSS('fill', idleColor);
      await icon.hover();
      await expect(icon).toHaveCSS('color', accentColor);
      await expect(icon.locator('svg')).toHaveCSS('fill', accentColor);
      await page.mouse.move(0, 0);
      await icon.focus();
      await expect(icon).toHaveCSS('color', idleColor);
      await icon.blur();
    }
    const report = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze();
    expect(
      report.violations.map((v) => ({
        id: v.id,
        targets: v.nodes.map((n) => n.target),
      })),
    ).toEqual([]);
    await page
      .getByRole('link', { name: 'See agent guidance', exact: true })
      .focus();
    const tooltip = page.getByRole('tooltip');
    await expect(tooltip).toBeVisible();
    const box = (await tooltip.boundingBox())!;
    const width = await page.evaluate(
      () => document.documentElement.clientWidth,
    );
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(width);
    await page.keyboard.press('Escape');
    expect(
      await page.evaluate(
        () =>
          document.documentElement.scrollWidth <=
          document.documentElement.clientWidth,
      ),
    ).toBe(true);
  }
});

test('agent guidance is readable without JavaScript', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto('/agents');
  await expect(
    page.getByRole('heading', { name: 'Koi for agents' }),
  ).toBeVisible();
  expect(await page.locator('.agent-guidance-block code').textContent()).toBe(
    source,
  );
  await expect(
    page.getByRole('button', { name: 'Copy agent guidance' }),
  ).not.toBeVisible();
  await page.getByRole('link', { name: 'llms.txt', exact: true }).click();
  await expect(page).toHaveURL('/llms.txt');
  await expect(page.locator('body')).toContainText('# Koi agent guidance');
  await context.close();
});
