import { test, expect } from '@playwright/test';

test('quickstart displays the guard, example, and sidebar labels in both themes', async ({
  page,
  isMobile,
}) => {
  await page.goto('/docs/quickstart');
  const section = page.locator('#doc-quickstart');
  await expect(
    section.getByRole('heading', { name: 'Quickstart', exact: true }),
  ).toBeVisible();
  await expect(section).toContainText('Write your first koi-powered script');
  for (const theme of ['light', 'dark']) {
    await page
      .locator('html')
      .evaluate((html, value) => html.setAttribute('data-theme', value), theme);
    const callout = section.getByRole('complementary', {
      name: 'Always use a guard',
    });
    await expect(callout).toBeVisible();
    await expect(callout).toContainText(
      '__parseargs "$@" || return "$koi_status"',
    );
    await expect(
      callout.getByRole('button', { name: 'Copy code' }),
    ).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
  }
  await expect(section).toContainText('Hello, world!');
  if (isMobile)
    await page.getByRole('button', { name: 'Open documentation menu' }).click();
  const navigation = page.getByRole('navigation', {
    name: 'Documentation sections',
  });
  await expect(
    navigation.getByRole('link', { name: 'Introduction', exact: true }),
  ).toBeVisible();
  await expect(
    navigation.getByRole('link', { name: 'Installation', exact: true }),
  ).toBeVisible();
});
