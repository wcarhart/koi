import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('the homepage runs the approved decorative fish beneath the hero without controls', async ({
  page,
}) => {
  await page.clock.install();
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  const surface = page.locator('.hero swimming-surface');
  const canvas = surface.locator('canvas');
  await expect(surface).toHaveAttribute('data-route', 'wander');
  await expect(surface).toHaveAttribute('aria-hidden', 'true');
  await expect(surface).toHaveAttribute('data-state', 'paused');
  expect(JSON.parse((await surface.getAttribute('data-settings'))!)).toEqual({
    speed: 1.4,
    length: 41,
    width: 5.9,
    depth: 85,
    variation: 35,
    flex: 65,
    wake: 48,
    spacing: 8,
    glyphRate: 0.5,
  });
  await expect(page.locator('[data-swimming-controls]')).toHaveCount(0);
  await expect(page.getByRole('slider')).toHaveCount(0);
  await expect(surface.locator('.surface-fallback')).toHaveCount(0);
  await page.evaluate(() => document.fonts.ready);
  const image = () =>
    canvas.evaluate((node: HTMLCanvasElement) => node.toDataURL());
  const initial = await image();
  expect(
    await canvas.evaluate((node: HTMLCanvasElement) =>
      node
        .getContext('2d')!
        .getImageData(0, 0, node.width, node.height)
        .data.some((value, index) => index % 4 === 3 && value > 0),
    ),
  ).toBe(true);
  await page.clock.runFor(1000);
  expect(await image()).toBe(initial);
  const headingBounds = await page.locator('.hero h1').boundingBox();
  await expect(surface).toHaveCSS('pointer-events', 'none');
  await expect(surface).toHaveCSS('z-index', '0');
  await expect(page.locator('.hero > div').first()).toHaveCSS('z-index', '1');
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await expect(surface).toHaveAttribute('data-state', 'playing');
  await page.clock.runFor(1000);
  expect(await image()).not.toBe(initial);
  expect(await page.locator('.hero h1').boundingBox()).toEqual(headingBounds);
  await page
    .locator('.hero')
    .getByRole('link', { name: 'Read the docs' })
    .click();
  await expect(page).toHaveURL(/\/docs$/);
});

test('the fish follows the homepage theme and preserves accessible responsive content', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  const surface = page.locator('.hero swimming-surface');
  await expect(surface).toHaveAttribute('data-state', 'paused');
  await page.evaluate(() => document.fonts.ready);
  const image = () =>
    surface
      .locator('canvas')
      .evaluate((node: HTMLCanvasElement) => node.toDataURL());
  const light = await image();
  await page.getByRole('button', { name: 'Switch to dark mode' }).click();
  await expect.poll(image).not.toBe(light);
  for (const theme of ['dark', 'light']) {
    await page.evaluate((value) => {
      document.documentElement.dataset.theme = value;
    }, theme);
    expect(
      await page.evaluate(
        () =>
          document.documentElement.scrollWidth <=
          document.documentElement.clientWidth,
      ),
    ).toBe(true);
    const report = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze();
    expect(
      report.violations.map(({ id, nodes }) => ({
        id,
        nodes: nodes.map(({ target }) => target),
      })),
    ).toEqual([]);
  }
});

test('the homepage keeps the background silent without JavaScript or Canvas', async ({
  browser,
}) => {
  for (const javaScriptEnabled of [false, true]) {
    const context = await browser.newContext({ javaScriptEnabled });
    if (javaScriptEnabled)
      await context.addInitScript(() => {
        HTMLCanvasElement.prototype.getContext = () => null;
      });
    const page = await context.newPage();
    await page.goto('/');
    await expect(page.locator('.hero h1')).toBeVisible();
    await expect(page.locator('.hero .surface-fallback')).toHaveCount(0);
    await page
      .locator('.hero')
      .getByRole('link', { name: 'Read the docs' })
      .click();
    await expect(page).toHaveURL(/\/docs$/);
    await context.close();
  }
});
