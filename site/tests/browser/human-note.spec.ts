import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page, isMobile }) => {
  await page.goto('/docs');
  if (isMobile) {
    await page.getByRole('button', { name: 'Open documentation menu' }).click();
  }
  await page.locator('#human-note').scrollIntoViewIfNeeded();
});

test('authorship card stays open across hover surfaces and dismisses outside', async ({
  page,
  isMobile,
}) => {
  test.skip(isMobile, 'Hover applies to mouse input.');
  const note = page.locator('#human-note');
  const card = page.getByRole('region', { name: "Hi, I'm Will!" });
  await expect(card).toBeHidden();
  await note.locator('img').hover();
  await expect(card).toBeVisible();
  await note.locator('span').hover();
  await expect(card).toBeVisible();
  await card.getByRole('link', { name: 'an issue' }).hover();
  await expect(card).toBeVisible();
  await expect(note).toHaveAttribute('aria-expanded', 'true');
  await page.mouse.move(1200, 100);
  await expect(card).toBeHidden();
  await note.hover();
  await expect(card).toBeVisible();
  await page.locator('#docs-sidebar').evaluate((el) => (el.scrollTop = 0));
  await expect(card).toBeHidden();
});

test('authorship card supports keyboard access and Escape without closing the menu', async ({
  page,
  isMobile,
}) => {
  const note = page.locator('#human-note');
  const card = page.getByRole('region', { name: "Hi, I'm Will!" });
  await page.keyboard.press('Tab');
  await note.focus();
  await expect(card).toBeVisible();
  await page.keyboard.press('Tab');
  await expect(
    card.getByRole('link', { name: 'wcarhart on GitHub' }),
  ).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(card.getByRole('link', { name: 'an issue' })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(card).toBeHidden();
  await expect(note).toBeFocused();
  await expect(note).toHaveAttribute('aria-expanded', 'false');
  if (isMobile) {
    await expect(page.locator('body')).toHaveClass(/menu-open/);
  }
  await page.keyboard.press('Shift+Tab');
  await page.keyboard.press('Tab');
  await expect(card).toBeVisible();
  await page.keyboard.press('Tab');
  await page.keyboard.press('Tab');
  await page.keyboard.press('Tab');
  await expect(card).toBeHidden();
});

test('authorship card fits the viewport and uses the permanent portrait in both themes', async ({
  page,
  isMobile,
}) => {
  const note = page.locator('#human-note');
  const card = page.getByRole('region', { name: "Hi, I'm Will!" });
  if (isMobile) {
    await note.tap();
  } else {
    await note.hover();
  }
  await expect(card).toBeVisible();
  const profile = card.getByRole('link', { name: 'wcarhart on GitHub' });
  await expect(profile).toHaveAttribute('href', 'https://github.com/wcarhart');
  await expect(profile).toHaveAttribute('target', '_blank');
  await expect(
    profile.getByRole('img', { name: 'Will Carhart' }),
  ).toBeVisible();
  await expect(profile.getByText('wcarhart', { exact: true })).toBeVisible();
  const noteImage = (await note.locator('img').boundingBox())!;
  const lineHeight = await note.evaluate((el) =>
    parseFloat(getComputedStyle(el).lineHeight),
  );
  expect(noteImage.height).toBeCloseTo(lineHeight * 2, 1);
  const issue = card.getByRole('link', { name: 'an issue' });
  await expect(issue).toHaveAttribute(
    'href',
    'https://github.com/wcarhart/koi/issues/new',
  );
  await expect(issue).toHaveAttribute('target', '_blank');
  const portrait = card.getByRole('img', { name: 'Will Carhart' });
  await expect(portrait).toHaveAttribute('src', '/images/wcarhart.png');
  await expect
    .poll(() =>
      portrait.evaluate((img) => (img as HTMLImageElement).naturalWidth),
    )
    .toBeGreaterThan(0);

  for (const theme of ['light', 'dark']) {
    await page.evaluate((value) => {
      document.documentElement.dataset.theme = value;
    }, theme);
    const bounds = (await card.boundingBox())!;
    const viewport = page.viewportSize()!;
    const trigger = (await note.boundingBox())!;
    expect(bounds.x).toBeGreaterThanOrEqual(12);
    expect(bounds.y).toBeGreaterThanOrEqual(12);
    expect(bounds.x + bounds.width).toBeLessThanOrEqual(viewport.width - 12);
    expect(bounds.y + bounds.height).toBeLessThanOrEqual(trigger.y);
    const image = (await portrait.boundingBox())!;
    expect(image.width).toBe(120);
    expect(image.height).toBe(120);
    const badge = (await card.locator('.human-card-badge').boundingBox())!;
    expect(badge.y + badge.height / 2).toBe(image.y + image.height);
    expect(badge.x + badge.width / 2).toBeCloseTo(image.x + image.width / 2, 1);
  }

  if (isMobile) {
    await note.tap();
    await expect(card).toBeHidden();
    await note.tap();
    await expect(card).toBeVisible();
    await page
      .getByRole('button', { name: 'Close documentation menu', exact: true })
      .last()
      .click();
    await expect(card).toBeHidden();
  }
});
