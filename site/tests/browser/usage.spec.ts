import { test, expect } from '@playwright/test';

for (const name of ['addarg', 'parseargs']) {
  test(`${name} usage highlights in both themes and copies the original signature`, async ({
    page,
    isMobile,
  }, testInfo) => {
    await page.addInitScript(() => {
      localStorage.setItem('koi-theme', 'light');
      Object.defineProperty(navigator, 'clipboard', {
        value: {
          writeText: async (text: string) => {
            (window as unknown as { copied: string }).copied = text;
          },
        },
      });
    });
    const markdown = await (
      await page.request.get(`/docs/reference/${name}.md`)
    ).text();
    const signature = markdown.match(/```text usage\n([^]*?)\n```/)![1];
    await page.goto(`/docs/reference/${name}`);
    const block = page.locator(`#doc-reference-${name} .code-block`).filter({
      has: page.locator('.code-label > span', { hasText: /^Usage$/ }),
    });
    await expect(block).toHaveCount(1);
    const code = block.locator('code');
    expect(await code.textContent()).toBe(signature);
    const fn = code
      .locator('span[style]')
      .filter({ hasText: `__${name}` })
      .first();
    const light = await fn.evaluate((node) => getComputedStyle(node).color);
    expect(light).not.toBe(
      await code.evaluate((node) => getComputedStyle(node).color),
    );
    await block.screenshot({ path: testInfo.outputPath(`${name}-light.png`) });
    if (isMobile) {
      await page
        .getByRole('button', { name: 'Open documentation menu' })
        .click();
    }
    await page.getByRole('button', { name: 'Switch to dark mode' }).click();
    if (isMobile) {
      await page
        .locator('#docs-sidebar')
        .getByRole('button', { name: 'Close documentation menu' })
        .click();
    }
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await expect
      .poll(() => fn.evaluate((node) => getComputedStyle(node).color))
      .not.toBe(light);
    await block.screenshot({ path: testInfo.outputPath(`${name}-dark.png`) });
    const copy = block.getByRole('button', { name: 'Copy code' });
    await copy.click();
    await expect(copy).toHaveAttribute('data-copy-state', 'success');
    expect(
      await page.evaluate(
        () => (window as unknown as { copied: string }).copied,
      ),
    ).toBe(signature);
  });
}
