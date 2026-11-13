import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('short heading fragments work across docs, reloads, and local glossary links', async ({
  page,
}) => {
  for (const [route, fragment] of [
    ['glossary', 'flag'],
    ['guides/lifecycle', 'parser-result-and-caller-result'],
    ['concepts/parsing-and-control-flow', 'parser-result-and-caller-result'],
    ['quickstart', 'example'],
    ['guides/help', 'help-configuration'],
    ['install', 'dependencies'],
  ]) {
    const url = `/docs/${route}#${fragment}`;
    await page.goto(url);
    const heading = page.locator(
      `[data-url="/docs/${route}"] [data-fragment="${fragment}"]`,
    );
    await expect(heading).toBeInViewport();
    await expect(heading.getByRole('link')).toHaveAttribute('href', url);
    await heading.getByRole('link').click();
    await expect(page).toHaveURL(url);
    await page.reload();
    await expect(heading).toBeInViewport();
  }
  await page.goto('/docs/glossary#argument');
  await page
    .locator('#doc-glossary a[href="/docs/glossary#flag"]')
    .first()
    .click();
  await expect(page).toHaveURL('/docs/glossary#flag');
  await expect(page.locator('#doc-glossary-flag')).toBeInViewport();
  await page.goBack();
  await expect(page).toHaveURL('/docs/glossary#argument');
  await expect(page.locator('#doc-glossary-argument')).toBeInViewport();
  await page.goto('/docs/glossary#doc-glossary-flag');
  await expect(page).toHaveURL('/docs/glossary#flag');
  await expect(page.locator('#doc-glossary-flag')).toBeInViewport();
});

async function openMenu(page: Page, isMobile: boolean) {
  if (isMobile)
    await page.getByRole('button', { name: 'Open documentation menu' }).click();
}

async function expectSectionStart(
  page: Page,
  selector: string,
  isMobile: boolean,
) {
  await expect(page.locator('html')).not.toHaveClass(/docs-initializing/);
  await expect
    .poll(() =>
      page
        .locator(selector)
        .evaluate((section) => Math.round(section.getBoundingClientRect().top)),
    )
    .toBe(isMobile ? 70 : 0);
  const bottom = await page
    .locator('.docs-topline')
    .evaluate((bar) => bar.getBoundingClientRect().bottom);
  expect(bottom).toBeLessThanOrEqual(isMobile ? 70 : 0);
}

test('fresh docs entry aligns Meet koi and leaves the joke above the viewport', async ({
  page,
  isMobile,
}) => {
  await page.goto('/docs');
  await expectSectionStart(page, '#doc-introduction', isMobile);
  await expect(page.locator('#doc-introduction .doc-description')).toHaveText(
    'Bashful argument parsing',
  );
  await expect(page.locator('#doc-introduction pre')).toContainText(
    'bark "$@"',
  );
  await expect(page.locator('#doc-introduction h2 em')).toHaveText('koi?');
  await expect(
    page.locator('#doc-introduction .intro-signoff .koi-mark-light'),
  ).toHaveAttribute('src', '/brand/koi-filled.svg');
  await page.evaluate(() => window.scrollTo(0, 0));
  await expect(page.locator('.docs-topline')).toBeInViewport();
  await expect(page.locator('.docs-joke')).toHaveText(
    'Why did the fish prefer the smaller pond? Because he was feeling a little koi.',
  );
  await expect(
    page.getByRole('link', { name: 'Koi home' }).locator('.koi-mark-light'),
  ).toHaveAttribute('src', '/brand/koi-outline.svg');
  await openMenu(page, isMobile);
  await page
    .getByRole('navigation', { name: 'Documentation sections' })
    .getByRole('link', { name: 'Introduction', exact: true })
    .click();
  await expectSectionStart(page, '#doc-introduction', isMobile);
  await page.goto('/');
  await page
    .locator('.site-header')
    .getByRole('link', { name: 'Docs', exact: true })
    .click();
  await expectSectionStart(page, '#doc-introduction', isMobile);
});

test('index headings navigate to isolated docs pages and article links restore the continuous flow', async ({
  page,
  isMobile,
}) => {
  await page.goto('/docs');
  for (const [title, slug] of [
    ['Guides', 'guides'],
    ['API reference', 'reference'],
    ['Examples', 'examples'],
  ]) {
    await openMenu(page, isMobile);
    await page
      .getByRole('navigation', { name: 'Documentation sections' })
      .getByRole('link', { name: title, exact: true })
      .click();
    await expect(page).toHaveURL(`/docs/${slug}`);
    await expectSectionStart(page, `#index-${slug}`, isMobile);
    await expect(page.locator('[data-doc-section]')).toHaveCount(1);
    await expect(page.locator('main h1')).toHaveText(title);
    await expect(page.locator('link[rel=canonical]')).toHaveAttribute(
      'href',
      `https://koishell.com/docs/${slug}`,
    );
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await expect(page).toHaveURL(`/docs/${slug}`);
    await page.reload();
    await expect(page.locator('[data-doc-section]')).toHaveCount(1);
    await openMenu(page, isMobile);
    await expect(
      page
        .getByRole('navigation', { name: 'Documentation sections' })
        .getByRole('link', { name: title, exact: true }),
    ).toHaveAttribute('aria-current', 'page');
    if (isMobile)
      await page
        .getByRole('button', { name: 'Close documentation menu', exact: true })
        .last()
        .click();
  }
  await page.locator('.index-list a').first().click();
  await expect(page).toHaveURL('/docs/examples/function-entrypoint');
  await expect(page.locator('[data-doc-section]')).toHaveCount(23);
  await expect(
    page.locator('#doc-examples-function-entrypoint h1'),
  ).toBeInViewport();
  await page.goBack();
  await expect(page).toHaveURL('/docs/examples');
  await expect(page.locator('[data-doc-section]')).toHaveCount(1);
});

test('index history and reload retain the reading position', async ({
  page,
}) => {
  await page.goto('/docs/examples');
  const article = page.locator('.index-list a').first();
  await article.scrollIntoViewIfNeeded();
  const savedY = await page.evaluate(() => window.scrollY);
  await article.click();
  await expect(page).toHaveURL('/docs/examples/function-entrypoint');
  await page.goBack();
  await expect(page).toHaveURL('/docs/examples');
  await expect
    .poll(() => page.evaluate(() => Math.round(window.scrollY)))
    .toBe(Math.round(savedY));
  await page.reload();
  await expect(page.locator('html')).not.toHaveClass(/docs-initializing/);
  await expect
    .poll(() => page.evaluate(() => Math.round(window.scrollY)))
    .toBe(Math.round(savedY));
});

test('guide and API indexes list the published collection', async ({
  page,
}) => {
  await page.goto('/docs/guides');
  await expect(page.locator('.guide-card')).toHaveCount(4);
  await expect(page.locator('.guide-card h2')).toHaveText([
    'Define flags, options, and positionals',
    'Build a command-line application',
    'Reuse parsing functions',
    'Customize generated help',
  ]);
  await expect(page.locator('.index-list a')).toHaveCount(1);
  await expect(page.locator('.index-list a')).toHaveAttribute(
    'href',
    '/docs/guides/troubleshooting',
  );
  await page.goto('/docs/reference');
  await expect(page.locator('.index-list strong')).toHaveText([
    '__addarg',
    '__addcommand',
    '__adddescription',
    '__parseargs',
    '__koiconfig',
    '__koirun',
  ]);
  await page.locator('.index-list a').nth(3).click();
  await expect(page).toHaveURL('/docs/reference/parseargs');
  await expect(page.locator('#doc-reference-parseargs h1')).toBeInViewport();
});

test('jukebox selection supports click, keyboard navigation, copying, and article links', async ({
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
  await page.goto('/docs/examples');
  const tabs = page
    .getByRole('tablist', { name: 'Featured examples' })
    .getByRole('tab');
  await expect(tabs).toHaveCount(3);
  await expect(tabs.first()).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByRole('tabpanel')).toHaveCount(1);
  await tabs.nth(1).click();
  await expect(page).toHaveURL('/docs/examples');
  await expect(page.getByRole('tabpanel')).toContainText('Positional values');
  await tabs.nth(1).press('ArrowRight');
  await expect(tabs.last()).toBeFocused();
  await expect(tabs.last()).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByRole('tabpanel').locator('code')).toContainText(
    '__addcommand',
  );
  await tabs.last().press('Home');
  await expect(tabs.first()).toHaveAttribute('aria-selected', 'true');
  await tabs.first().press('End');
  await expect(tabs.last()).toHaveAttribute('aria-selected', 'true');
  await page
    .getByRole('tabpanel')
    .getByRole('button', { name: 'Copy code' })
    .click();
  expect(
    await page.evaluate(() => (window as unknown as { copied: string }).copied),
  ).toContain('__parseargs "$@" || return "$koi_status"');
  await expect(page.locator('.index-list a')).toHaveCount(3);
  await page
    .getByRole('tabpanel')
    .getByRole('link', { name: 'Read example' })
    .click();
  await expect(page).toHaveURL('/docs/examples/commands');
});

test('homepage pairs primary CTAs with secondary examples links in the four feature sections', async ({
  page,
}) => {
  await page.goto('/');
  const rows = page.locator('.landing-actions');
  await expect(rows).toHaveCount(4);
  for (const row of await rows.all()) {
    await expect(row.locator('a.primary')).toHaveCount(1);
    await expect(
      row.getByRole('link', { name: 'More examples' }),
    ).toHaveAttribute('href', '/docs/examples');
    const bounds = await row
      .locator('a')
      .evaluateAll((links) =>
        links.map((link) => link.getBoundingClientRect().top),
      );
    expect(bounds[0]).toBe(bounds[1]);
  }
  await expect(
    page
      .locator('.hero, .landing-install')
      .getByRole('link', { name: 'More examples' }),
  ).toHaveCount(0);
});

test('indexes remain accessible and fit both themes', async ({
  page,
  isMobile,
}) => {
  for (const route of ['/docs/guides', '/docs/reference', '/docs/examples']) {
    await page.goto(route);
    for (const theme of ['light', 'dark']) {
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
        report.violations.map((violation) => ({
          id: violation.id,
          nodes: violation.nodes.map((node) => ({
            target: node.target,
            summary: node.failureSummary,
          })),
        })),
      ).toEqual([]);
    }
  }
  if (isMobile) {
    await openMenu(page, true);
    await expect(
      page.getByRole('link', { name: 'Examples', exact: true }),
    ).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.locator('body')).not.toHaveClass(/menu-open/);
  }
});

test('without JavaScript the collection still exposes existing scripts and working article links', async ({
  browser,
}) => {
  const context = await browser.newContext({
    javaScriptEnabled: false,
    reducedMotion: 'reduce',
  });
  const page = await context.newPage();
  await page.goto('/docs/examples');
  await expect(page.locator('.example-album')).toHaveCount(3);
  await expect(page.locator('.album-preview')).toHaveCount(3);
  await page.locator('.example-album').nth(1).click();
  await expect(page).toHaveURL('/docs/examples/positionals');
  await expect(page.locator('#doc-examples-positionals')).toContainText(
    'copy.sh',
  );
  await context.close();
});

test('docs sidebar and search retain the requested compact presentation', async ({
  page,
  isMobile,
}) => {
  await page.goto('/docs');
  await openMenu(page, isMobile);
  await expect(page.locator('.sidebar-version')).toHaveCount(0);
  const bottom = page.locator('.sidebar-bottom');
  for (const name of ['Install', 'Terminal']) {
    const link = bottom.getByRole('link', { name, exact: true });
    await expect(link).toHaveText(name);
    await expect(link.locator('span, svg')).toHaveCount(0);
  }
  await expect(bottom).not.toContainText('Bash 5.2+');
  await page.getByRole('button', { name: 'Search docs' }).click();
  const dialog = page.getByRole('dialog', { name: 'Search documentation' });
  const input = dialog.getByRole('combobox');
  await input.fill('zzzz-no-matching-doc');
  await expect(input).toBeFocused();
  await expect(input).toHaveCSS('box-shadow', 'none');
  await expect(input).toHaveCSS('outline-style', 'none');
  await expect(dialog.locator('.search-status')).toHaveText('No results.');
  await expect(dialog).not.toContainText('Search locally. Stay in flow.');
  for (const theme of ['light', 'dark']) {
    await page.evaluate((value) => {
      document.documentElement.dataset.theme = value;
    }, theme);
    await expect(
      dialog.locator(`.search-footer .koi-mark-${theme}`),
    ).toBeVisible();
    await expect(
      dialog.locator(`.search-footer .koi-mark-${theme}`),
    ).toHaveAttribute(
      'src',
      `/brand/koi-filled${theme === 'dark' ? '-dark' : ''}.svg`,
    );
  }
  await input.fill('__addarg');
  await expect(dialog.getByRole('option').first()).toContainText('__addarg');
  await input.press('ArrowDown');
  await expect(input).toHaveAttribute('aria-activedescendant', 'result-1');
});
