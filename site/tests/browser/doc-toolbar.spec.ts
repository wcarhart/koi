import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const article = '#doc-quickstart';

test('toolbar progress follows pinning, push-off, reverse scrolling, and the final article', async ({
  page,
}) => {
  await page.goto('/docs/quickstart');
  const section = page.locator(article);
  const toolbar = section.locator('[data-doc-toolbar]');
  const progress = section.locator('.doc-progress');
  await expect(progress).toHaveAttribute('aria-label', 'Reading progress: 0%');
  await expect(progress).toHaveText('');
  const ring = (await toolbar.locator('.doc-progress svg').boundingBox())!;
  const chatIcon = (await toolbar.locator('[data-ask-koi] svg').boundingBox())!;
  expect(ring.height).toBe(chatIcon.height);
  expect(ring.x + ring.width).toBeLessThan(chatIcon.x);
  const bounds = await section.evaluate((section) => {
    const header = document
      .querySelector('.docs-mobile-bar')!
      .getBoundingClientRect().height;
    const toolbar = section.querySelector<HTMLElement>('[data-doc-toolbar]')!;
    const start = section.getBoundingClientRect().top + window.scrollY - header;
    const next = section.nextElementSibling!;
    const end =
      next.getBoundingClientRect().top +
      window.scrollY -
      header -
      toolbar.offsetHeight;
    return { start, end, header, height: toolbar.offsetHeight };
  });
  await page.evaluate(
    (y) => window.scrollTo(0, y),
    (bounds.start + bounds.end) / 2,
  );
  await expect(progress).toHaveAttribute('aria-label', 'Reading progress: 50%');
  expect((await toolbar.boundingBox())!.y).toBeCloseTo(bounds.header, 0);
  await page.evaluate(
    (y) => window.scrollTo(0, y),
    bounds.end + bounds.height / 2,
  );
  await expect(progress).toHaveAttribute(
    'aria-label',
    'Reading progress: 100%',
  );
  expect((await toolbar.boundingBox())!.y).toBeLessThan(bounds.header);
  await page.evaluate((y) => window.scrollTo(0, y), bounds.start);
  await expect(progress).toHaveAttribute('aria-label', 'Reading progress: 0%');
  await expect(page.locator('html')).not.toHaveClass(/docs-initializing/);
  await page.evaluate(() =>
    window.scrollTo(0, document.documentElement.scrollHeight),
  );
  await expect(
    page.locator('[data-doc-section]').last().locator('.doc-progress'),
  ).toHaveAttribute('aria-label', 'Reading progress: 100%');
});

test('actions have article-specific URLs and an accessible custom menu', async ({
  page,
}) => {
  await page.goto('/docs/quickstart');
  const section = page.locator(article);
  await expect(
    section.getByRole('link', { name: 'View doc as Markdown' }),
  ).toHaveAttribute('href', '/docs/quickstart.md');
  const trigger = section.getByRole('button', { name: 'More doc actions' });
  await trigger.focus();
  await page.keyboard.press('ArrowDown');
  const menu = section.getByRole('menu');
  await expect(menu).toBeVisible();
  await expect(menu.getByRole('menuitem').first()).toBeFocused();
  for (const name of ['Ask ChatGPT', 'Ask Claude']) {
    const link = menu.getByRole('menuitem', { name });
    const url = new URL((await link.getAttribute('href'))!);
    expect(url.searchParams.get('q')).toContain(
      'https://koishell.com/docs/quickstart.md',
    );
    await expect(link).toHaveAttribute('target', '_blank');
  }
  const issue = new URL(
    (await menu
      .getByRole('menuitem', { name: 'Report an issue' })
      .getAttribute('href'))!,
  );
  expect(issue.searchParams.get('title')).toBe('Problem with /docs/quickstart');
  await page.keyboard.press('End');
  await expect(menu.getByRole('menuitem').last()).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(menu).toBeHidden();
  await expect(trigger).toBeFocused();
  await trigger.click();
  await page.mouse.click(8, page.viewportSize()!.height - 80);
  await expect(menu).toBeHidden();
});

test('Ask koi opens, reflows or overlays, and closes with focus restored', async ({
  page,
  isMobile,
}) => {
  await page.goto('/docs/quickstart');
  const trigger = page.locator(`${article} [data-ask-koi]`);
  const main = page.locator('.docs-main');
  const before = (await main.boundingBox())!.width;
  await trigger.click();
  const pane = page.locator('#ask-koi');
  await expect(
    pane.getByRole('heading', { name: 'Ask koi', exact: true }),
  ).toBeVisible();
  await expect(
    pane.getByRole('heading', { name: 'Coming soon' }),
  ).toBeVisible();
  await expect(trigger).toHaveAttribute('aria-expanded', 'true');
  await expect(trigger).toHaveAccessibleName('Close chat');
  const toolbarHeight = await page
    .locator(`${article} [data-doc-toolbar]`)
    .evaluate((node) => node.getBoundingClientRect().height);
  expect(
    await pane
      .locator('.ask-koi-heading')
      .evaluate((node) => node.getBoundingClientRect().height),
  ).toBe(toolbarHeight);
  if (isMobile) {
    await expect(pane).toHaveAttribute('aria-modal', 'true');
    await expect(main).toHaveAttribute('inert', '');
    await page.keyboard.press('Tab');
    await expect(
      pane.getByRole('button', { name: 'Close Ask koi' }),
    ).toBeFocused();
  } else {
    await expect
      .poll(async () => (await main.boundingBox())!.width)
      .toBeCloseTo(before - 360, 0);
  }
  await page.keyboard.press('Escape');
  await expect(trigger).toHaveAttribute('aria-expanded', 'false');
  await expect(trigger).toBeFocused();
  await expect
    .poll(async () => (await main.boundingBox())!.width)
    .toBeCloseTo(before, 0);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

test('documentation metadata resolves to Markdown, including index and standalone pages', async ({
  page,
}) => {
  for (const path of [
    '/docs/quickstart',
    '/docs/reference',
    '/docs/guides',
    '/docs/examples',
    '/install',
    '/agents',
  ]) {
    await page.goto(path);
    const alternate = page.locator(
      'link[rel="alternate"][type="text/markdown"]',
    );
    await expect(alternate).toHaveAttribute(
      'href',
      `https://koishell.com${path}.md`,
    );
    await expect(page.locator('link[rel="describedby"]')).toHaveAttribute(
      'href',
      'https://koishell.com/llms.txt',
    );
    expect((await page.request.get(`${path}.md`)).status()).toBe(200);
  }
  await page.goto('/docs/quickstart');
  await expect(page.locator('html')).not.toHaveClass(/docs-initializing/);
  await page.evaluate(() =>
    window.scrollTo(
      0,
      document.querySelector('#doc-concepts-arguments')!.getBoundingClientRect()
        .top + scrollY,
    ),
  );
  await expect(page).toHaveURL('/docs/concepts/arguments');
  await expect(page.locator('link[rel="alternate"]')).toHaveAttribute(
    'href',
    'https://koishell.com/docs/concepts/arguments.md',
  );
});

test('toolbar and open pane are accessible in both themes', async ({
  page,
}) => {
  for (const colorScheme of ['light', 'dark'] as const) {
    await page.emulateMedia({ colorScheme, reducedMotion: 'reduce' });
    await page.goto('/docs/quickstart');
    const section = page.locator(article);
    await section.getByRole('button', { name: 'More doc actions' }).click();
    let report = await new AxeBuilder({ page })
      .include(`${article} [data-doc-toolbar]`)
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze();
    expect(report.violations).toEqual([]);
    await page.keyboard.press('Escape');
    await section
      .getByRole('button', { name: 'Ask about this doc', exact: true })
      .click();
    report = await new AxeBuilder({ page })
      .include('#ask-koi')
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze();
    expect(report.violations).toEqual([]);
    await page.keyboard.press('Escape');
  }
});

test('tooltips dismiss on pane changes and stay hidden while the action menu is open', async ({
  page,
  isMobile,
}) => {
  test.skip(isMobile, 'Hover behavior requires a mouse.');
  await page.goto('/docs/quickstart');
  const section = page.locator(article);
  const toolbar = section.locator('[data-doc-toolbar]');
  const ask = section.locator('[data-ask-koi]');
  const askTip = section.locator('#doc-quickstart-ask-tip');
  await ask.hover();
  await expect(askTip).toBeVisible();
  await ask.click();
  await expect(askTip).toBeHidden();
  await page.mouse.move(0, 0);
  await ask.hover();
  await expect(askTip).toHaveText('Close chat');
  await expect(askTip).toBeVisible();
  await page
    .locator('#ask-koi')
    .getByRole('button', { name: 'Close Ask koi' })
    .click();
  await expect
    .poll(() =>
      page
        .locator('.docs-main')
        .evaluate((node) => getComputedStyle(node).marginRight),
    )
    .toBe('0px');
  await expect(ask).toBeFocused();
  await expect(askTip).toBeHidden();
  await page.mouse.move(0, 0);
  await ask.hover();
  await expect(askTip).toBeVisible();
  await page.mouse.move(0, 0);
  await expect(askTip).toBeHidden();
  const more = section.getByRole('button', { name: 'More doc actions' });
  await more.hover();
  await expect(section.locator('#doc-quickstart-more-tip')).toBeVisible();
  await more.click();
  await expect(section.getByRole('menu')).toBeVisible();
  for (const control of await toolbar
    .locator('.doc-action, .doc-progress')
    .all()) {
    await control.hover();
    await expect(toolbar.locator('.doc-tooltip:visible')).toHaveCount(0);
  }
  await page.keyboard.press('Escape');
  await expect(section.getByRole('menu')).toBeHidden();
  await page.mouse.move(0, 0);
  await section.getByRole('button', { name: 'Copy doc as Markdown' }).hover();
  await expect(section.locator('#doc-quickstart-copy-tip')).toBeVisible();
});

test('toolbar tooltips center on their controls and align right when the screen would clip them', async ({
  page,
  isMobile,
}) => {
  test.skip(isMobile, 'Exercise mouse hover at both desktop and phone widths.');
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto('/docs/quickstart');
    const toolbar = page.locator(`${article} [data-doc-toolbar]`);
    for (const control of await toolbar.locator('.doc-control').all()) {
      await control.locator('.doc-action, .doc-progress').hover();
      const tooltip = control.getByRole('tooltip');
      await expect(tooltip).toBeVisible();
      const button = (await control.boundingBox())!;
      const tip = (await tooltip.boundingBox())!;
      const centeredLeft = button.x + button.width / 2 - tip.width / 2;
      if (centeredLeft >= 0 && centeredLeft + tip.width <= width) {
        expect(tip.x + tip.width / 2).toBeCloseTo(
          button.x + button.width / 2,
          0,
        );
      } else {
        expect(tip.x + tip.width).toBeCloseTo(button.x + button.width, 0);
      }
      expect(tip.x).toBeGreaterThanOrEqual(0);
      expect(tip.x + tip.width).toBeLessThanOrEqual(width);
    }
  }
});
