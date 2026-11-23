import { test, expect, type Locator } from '@playwright/test';

async function geometry(button: Locator) {
  return button.evaluate((node) => {
    const button = node.getBoundingClientRect();
    const chevron = node
      .querySelector('.cta-arrow-chevron')!
      .getBoundingClientRect();
    const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT);
    const textRects: DOMRect[] = [];
    while (walker.nextNode()) {
      const text = walker.currentNode.textContent!;
      if (!text.trim()) continue;
      const range = document.createRange();
      range.setStart(walker.currentNode, text.search(/\S/));
      range.setEnd(walker.currentNode, text.trimEnd().length);
      textRects.push(range.getBoundingClientRect());
    }
    return {
      width: button.width,
      height: button.height,
      left:
        Math.min(chevron.left, ...textRects.map((r) => r.left)) - button.left,
      right:
        Math.max(chevron.right, ...textRects.map((r) => r.right)) - button.left,
      textLeft: textRects[0].left - button.left,
      chevronLeft: chevron.left - button.left,
    };
  });
}

const cases = [
  { route: '/', name: 'Read the docs' },
  { route: '/docs/reference', name: 'Glossary' },
  { route: '/docs/install', name: 'Next: Quickstart' },
  { route: '/install', name: 'Next: Quickstart' },
  { route: '/install', name: 'Download from GitHub', tab: true },
  { route: '/404', name: 'Back home' },
  { route: '/404', name: 'Read the docs' },
];

for (const { route, name, tab } of cases) {
  test(`${route} ${name} tightens its arrow spacing without resizing`, async ({
    page,
    isMobile,
  }) => {
    await page.goto(route);
    if (tab)
      await page.getByRole('tab', { name: 'GitHub', exact: true }).click();
    const button = page
      .locator('main .button')
      .and(page.getByRole('link', { name, exact: true }))
      .first();
    await button.scrollIntoViewIfNeeded();
    await page.evaluate(() => document.fonts.ready);
    await page.mouse.move(0, 0);
    const chevron = button.locator('.cta-arrow-chevron');
    await expect(chevron).toHaveCSS('transform', 'none');
    const arrow = button.locator('.cta-arrow');
    // Compare against the original arrow position without changing layout styles.
    await arrow.evaluate((node) => (node.style.transform = 'none'));
    const original = await geometry(button);
    await arrow.evaluate((node) => node.style.removeProperty('transform'));
    const idle = await geometry(button);
    expect(idle.width).toBe(original.width);
    expect(idle.height).toBe(original.height);
    expect(idle.textLeft).toBe(original.textLeft);
    expect(idle.chevronLeft - original.chevronLeft).toBeCloseTo(
      name === 'Back home' ? 6 : -6,
      1,
    );
    expect(
      Math.abs((original.left + original.right) / 2 - original.width / 2),
    ).toBeLessThan(1);

    const checkExtended = async () => {
      await expect(chevron).toHaveCSS('transform', 'matrix(1, 0, 0, 1, 12, 0)');
      await expect(button.locator('.cta-arrow-shaft')).toHaveCSS(
        'opacity',
        '1',
      );
      const extended = await geometry(button);
      expect(extended.width).toBe(idle.width);
      expect(extended.height).toBe(idle.height);
      expect(extended.textLeft).toBeCloseTo(idle.textLeft, 1);
      expect(extended.left).toBeGreaterThan(0);
      expect(extended.right).toBeLessThan(extended.width);
      expect(
        (extended.left + extended.right - idle.left - idle.right) / 2,
      ).toBeCloseTo(name === 'Back home' ? -6 : 6, 1);
    };

    if (!isMobile) {
      await button.hover();
      await checkExtended();
      await page.mouse.move(0, 0);
    }
    await button.focus();
    await page.keyboard.press('Tab');
    await page.keyboard.press('Shift+Tab');
    await expect(button).toBeFocused();
    await checkExtended();

    await page.emulateMedia({ reducedMotion: 'reduce' });
    await expect(chevron).toHaveCSS('transform', 'none');
    await expect(button.locator('.cta-arrow-shaft')).toHaveCSS('opacity', '0');
    expect(await geometry(button)).toEqual(idle);
  });
}
