import { test, expect } from '@playwright/test';

test('opt-in line numbers render in both themes and stay out of copied code', async ({
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
  await page.goto('/docs/concepts/lifecycle');
  const section = page.locator('#doc-concepts-lifecycle');
  const numbered = section
    .locator('.code-block')
    .filter({ has: page.locator('[data-line-number]') });
  await expect(numbered).toHaveCount(2);
  await expect(numbered.nth(1)).toContainText('if (( ! admin ))');
  for (const theme of ['light', 'dark']) {
    await page
      .locator('html')
      .evaluate((html, theme) => html.setAttribute('data-theme', theme), theme);
    for (const block of await numbered.all()) {
      const lines = block.locator('.line');
      for (const [index, line] of (await lines.all()).entries()) {
        await expect(line).toHaveAttribute(
          'data-line-number',
          String(index + 1),
        );
      }
      const first = lines.first();
      const style = await first.evaluate((line) => {
        const before = getComputedStyle(line, '::before');
        return {
          content: before.content,
          width: parseFloat(before.width),
          select: before.userSelect,
        };
      });
      expect(style.content).toMatch(/^"1"/);
      expect(style.width).toBeGreaterThan(0);
      expect(style.select).toBe('none');
    }
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
  }
  const code = await numbered.first().locator('code').textContent();
  const copy = numbered.first().getByRole('button', { name: 'Copy code' });
  await copy.click();
  await expect(copy).toHaveAttribute('data-copy-state', 'success');
  expect(
    await page.evaluate(() => (window as unknown as { copied: string }).copied),
  ).toBe(code);
});
