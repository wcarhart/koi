import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import matter from 'gray-matter';

test('site external links open new tabs and internal links stay in the current tab', async ({
  browser,
}) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await context.route('https://github.com/**', (route) =>
    route.fulfill({ contentType: 'text/plain', body: 'External destination' }),
  );
  for (const route of [
    '/',
    '/install',
    '/docs',
    '/docs/guides',
    '/docs/reference',
    '/docs/examples',
    '/agents',
    '/playground',
  ]) {
    await page.goto(route);
    const links = await page.locator('a[href]').evaluateAll((anchors) =>
      anchors.map((anchor) => {
        const link = anchor as HTMLAnchorElement;
        return {
          href: link.href,
          external: new URL(link.href).origin !== location.origin,
          target: link.target,
          rel: [...link.relList],
        };
      }),
    );
    expect(links.some((link) => link.external)).toBe(true);
    for (const link of links) {
      if (link.external) {
        expect(link.target, link.href).toBe('_blank');
        expect(link.rel, link.href).toEqual(
          expect.arrayContaining(['noopener', 'noreferrer']),
        );
      } else {
        expect(link.target, link.href).not.toBe('_blank');
      }
    }
  }
  await page.goto('/');
  const originalUrl = page.url();
  const popupPromise = page.waitForEvent('popup');
  await page
    .locator('.site-header')
    .getByRole('link', { name: 'GitHub repository' })
    .click();
  const popup = await popupPromise;
  await expect(popup).toHaveURL('https://github.com/wcarhart/koi');
  await expect(page).toHaveURL(originalUrl);
  await popup.close();
  await page.getByRole('link', { name: 'Read the docs' }).click();
  await expect(page).toHaveURL(/\/docs$/);
  expect(context.pages()).toHaveLength(1);
  await context.route('https://docs.python.org/**', (route) =>
    route.fulfill({ contentType: 'text/plain', body: 'External destination' }),
  );
  for (const name of ['argparse', 'repository']) {
    const popupPromise = page.waitForEvent('popup');
    await page
      .locator('#doc-introduction')
      .getByRole('link', { name, exact: true })
      .click();
    const popup = await popupPromise;
    await expect(popup).toHaveURL(
      name === 'argparse'
        ? 'https://docs.python.org/3/library/argparse.html'
        : 'https://github.com/wcarhart/koi',
    );
    await expect(page).toHaveURL(/\/docs$/);
    await popup.close();
  }
  await context.close();
});

test('landing, installation, empty playground, and real 404', async ({
  page,
}) => {
  await page.goto('/');
  await expect(
    page.getByRole('heading', { name: 'Turn any script into a proper CLI.' }),
  ).toBeVisible();
  await expect(
    page.getByRole('link', { name: 'Try it yourself' }),
  ).toHaveAttribute('href', '/playground');
  await page
    .locator('.landing-install')
    .getByRole('link', { name: 'Installation guide' })
    .click();
  await expect(
    page.getByRole('heading', { name: 'Install koi' }),
  ).toBeVisible();
  await page.goto('/playground');
  await expect(page.locator('main')).toBeEmpty();
  await expect(page.locator('meta[name=robots]')).toHaveAttribute(
    'content',
    'noindex',
  );
  const response = await page.goto('/not-a-page');
  expect(response?.status()).toBe(404);
});

test('deep links, refresh, scroll URLs, explicit navigation, and browser history', async ({
  page,
  isMobile,
}) => {
  await page.goto('/docs/reference/addarg');
  await expect(page.locator('#doc-reference-addarg h1')).toBeInViewport();
  await expect(page).toHaveURL(/\/docs\/reference\/addarg$/);
  await page.reload();
  await expect(page.locator('#doc-reference-addarg h1')).toBeInViewport();
  if (isMobile)
    await page.getByRole('button', { name: 'Open documentation menu' }).click();
  await page
    .getByRole('navigation', { name: 'Documentation sections' })
    .getByRole('link', { name: '__parseargs', exact: true })
    .click();
  await expect(page).toHaveURL(/\/docs\/reference\/parseargs$/);
  await expect(page.locator('#doc-reference-parseargs h1')).toBeInViewport();
  await page.goBack();
  await expect(page.locator('#doc-reference-addarg h1')).toBeInViewport();
  await page.goForward();
  await expect(page.locator('#doc-reference-parseargs h1')).toBeInViewport();
  await page.locator('#doc-reference-koiconfig').scrollIntoViewIfNeeded();
  await page.waitForTimeout(200);
  await page.evaluate(() =>
    document.getElementById('doc-reference-koiconfig')!.scrollIntoView(),
  );
  await expect(page).toHaveURL(/\/docs\/reference\/koiconfig$/);
  await page.goto('/docs/reference/addarg#options');
  await expect(page.locator('#doc-reference-addarg-options')).toBeInViewport();
});

test('keyboard search navigates, closes, and ignores editable inputs', async ({
  page,
  isMobile,
}) => {
  await page.goto('/docs');
  await page.keyboard.press('/');
  const dialog = page.getByRole('dialog', { name: 'Search documentation' });
  await expect(dialog).toBeVisible();
  const search = dialog.getByRole('combobox', { name: 'Search documentation' });
  await search.fill('__addarg');
  await expect(dialog.getByRole('option').first()).toContainText('__addarg');
  await search.press('Enter');
  await expect(dialog).not.toBeVisible();
  await expect(page).toHaveURL(/\/docs\/reference\/addarg$/);
  await page.getByRole('button', { name: 'Edit name argument' }).click();
  const dest = page.getByLabel('Destination variable');
  await dest.fill('name');
  await dest.press('/');
  await expect(dialog).not.toBeVisible();
  await page.locator('h1').filter({ hasText: '__addarg' }).click();
  await page.keyboard.press('/');
  await expect(dialog).toBeVisible();
  await search.fill('zzz-not-a-match');
  await expect(dialog).toContainText('No results.');
  await search.press('Escape');
  await expect(dialog).not.toBeVisible();
  if (isMobile)
    await page.getByRole('button', { name: 'Open documentation menu' }).click();
  await page.getByRole('button', { name: 'Search docs' }).click();
  await expect(dialog).toBeVisible();
});

test('code builders update, constrain fields, and reset to documented defaults', async ({
  page,
}) => {
  await page.goto('/docs/reference/addarg');
  const section = page.locator('#doc-reference-addarg');
  const code = section.locator('.doc-example code').first();
  const initial = await code.textContent();
  await section.getByRole('button', { name: 'Edit name argument' }).click();
  await section.getByLabel('Destination variable').fill('recipient');
  await section.getByRole('button', { name: 'Save argument' }).click();
  await expect(code).toContainText('local recipient');
  await expect(code.locator('span[style]')).not.toHaveCount(0);
  await section
    .getByRole('button', { name: 'Edit recipient argument' })
    .click();
  await section.getByRole('button', { name: 'Kind' }).click();
  await section
    .getByRole('option', { name: 'Positional', exact: true })
    .click();
  await expect(section.getByLabel('Short name')).not.toBeVisible();
  await section.getByRole('switch', { name: 'Required', exact: true }).click();
  await expect(
    section.getByRole('switch', { name: 'Use a default' }),
  ).not.toBeVisible();
  await section.getByRole('button', { name: 'Save argument' }).click();
  await expect(code).toContainText('__addarg recipient -p');
  await expect(code).not.toContainText(' -D ');
  await section
    .getByRole('button', { name: 'Edit recipient argument' })
    .click();
  await section.getByLabel('Destination variable').fill('bad-name');
  await section.getByRole('button', { name: 'Save argument' }).click();
  await expect(section.getByLabel('Destination variable')).toHaveAttribute(
    'aria-invalid',
    'true',
  );
  await expect(code).toContainText('local recipient');
  await section.getByRole('button', { name: 'Cancel', exact: true }).click();
  await section.getByRole('button', { name: 'Reset arguments' }).click();
  await expect(code).toHaveText(initial!);
  await page.goto('/docs/guides/help');
  const help = page.locator('#doc-guides-help');
  await help.getByLabel('Root verbose help').check();
  await expect(help.locator('.doc-example code').first()).toContainText(
    '--koi-enable-verbose-help',
  );
  await help.getByLabel('Built-in branch help commands').uncheck();
  await expect(help.getByLabel('Root verbose help')).toBeDisabled();
  await expect(help.locator('.doc-example code').first()).not.toContainText(
    '--koi-enable-verbose-help',
  );
  await expect(help.locator('.doc-example code').first()).toContainText(
    '--koi-disable-help-subcommand',
  );
});

test('copy buttons use Markdown response, checkmark feedback, and failure feedback', async ({
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
  await page.goto('/docs/reference/addarg');
  const section = page.locator('#doc-reference-addarg');
  const copy = section.locator('[data-copy-markdown]');
  await copy.click();
  await expect(copy).toHaveAttribute('data-copy-state', 'success');
  const markdown = await (
    await page.request.get('/docs/reference/addarg.md')
  ).text();
  expect(matter(markdown).data).toEqual({
    title: '__addarg',
    subtitle:
      'Define one flag, option, or positional argument in the current registration context.',
  });
  expect(
    await page.evaluate(() => (window as unknown as { copied: string }).copied),
  ).toBe(markdown);
  await expect(copy).toHaveText('Copy for LLM');
  const codeCopy = section
    .locator('.doc-example')
    .getByRole('button', { name: 'Copy code' })
    .first();
  await codeCopy.click();
  await expect(codeCopy).toHaveAttribute('data-copy-state', 'success');
  expect(
    await page.evaluate(() => (window as unknown as { copied: string }).copied),
  ).toContain('__parseargs "$@" || return "$koi_status"');
  await page.evaluate(() => {
    navigator.clipboard.writeText = async () => {
      throw new Error('denied');
    };
  });
  await codeCopy.click();
  await expect(codeCopy).toHaveAttribute('data-copy-state', 'error');
  await expect(page.locator('#announcement')).toContainText('Copy failed');
});

test('theme persists, mobile does not overflow, and search handles fetch failure', async ({
  page,
  isMobile,
}) => {
  await page.goto('/install');
  const initial = await page.locator('html').getAttribute('data-theme');
  await page.getByRole('button', { name: /Switch to .* mode/ }).click();
  const changed = await page.locator('html').getAttribute('data-theme');
  expect(changed).not.toBe(initial);
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', changed!);
  await page.route('/search.json', (route) => route.abort());
  await page.goto('/docs');
  if (isMobile)
    expect(
      await page.evaluate(
        () =>
          document.documentElement.scrollWidth <=
          document.documentElement.clientWidth,
      ),
    ).toBe(true);
  await page.keyboard.press('/');
  await expect(page.getByRole('dialog')).toContainText('Search could not load');
});

test('templates pass accessibility checks', async ({ page, isMobile }) => {
  for (const route of ['/', '/install', '/docs/reference/addarg']) {
    await page.goto(route);
    const report = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze();
    expect(
      report.violations.map((v) => ({
        id: v.id,
        nodes: v.nodes.map((n) => ({
          target: n.target,
          summary: n.failureSummary,
        })),
      })),
    ).toEqual([]);
  }
  await page.keyboard.press('/');
  const modal = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze();
  expect(modal.violations).toEqual([]);
  if (isMobile) {
    await page.keyboard.press('Escape');
    await page.getByRole('button', { name: 'Open documentation menu' }).click();
    const drawer = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze();
    expect(drawer.violations).toEqual([]);
  }
});

test('no-JavaScript reading and reduced-motion support', async ({
  browser,
}) => {
  const context = await browser.newContext({
    javaScriptEnabled: false,
    reducedMotion: 'reduce',
  });
  const page = await context.newPage();
  await page.goto('/docs');
  await expect(
    page.getByRole('heading', { name: 'Meet koi', exact: true }),
  ).toBeVisible();
  await expect(
    page.locator('#doc-reference-addarg code').first(),
  ).toBeAttached();
  await expect(
    page.getByRole('form', { name: 'Argument code builder' }),
  ).not.toBeVisible();
  await context.close();
});

test('dark templates retain contrast and reduced motion stops the cursor', async ({
  page,
}) => {
  await page.emulateMedia({ colorScheme: 'dark', reducedMotion: 'reduce' });
  for (const route of ['/', '/docs/reference/addarg']) {
    await page.goto(route);
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    const report = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze();
    expect(
      report.violations.map((v) => ({
        id: v.id,
        targets: v.nodes.map((n) => n.target),
      })),
    ).toEqual([]);
    if (route === '/')
      expect(
        await page
          .locator('.cursor')
          .evaluate((node) => getComputedStyle(node).animationName),
      ).toBe('none');
  }
});

test('search retries after a failed fetch and opens heading results', async ({
  page,
}) => {
  let requests = 0;
  await page.route('/search.json', async (route) => {
    if (++requests === 1) await route.abort();
    else await route.continue();
  });
  await page.goto('/docs');
  await page.keyboard.press('/');
  const dialog = page.getByRole('dialog');
  await expect(dialog).toContainText('Search could not load');
  await page.getByRole('button', { name: 'Close search', exact: true }).click();
  await page.keyboard.press('/');
  await dialog.getByRole('combobox').fill('Returns and assignment');
  await expect(dialog.getByRole('option').first()).toContainText(
    'Returns and assignment',
  );
  await dialog.getByRole('combobox').press('Enter');
  await expect(page).toHaveURL(
    /\/docs\/reference\/addarg#returns-and-assignment$/,
  );
  await expect(
    page.locator('#doc-reference-addarg-returns-and-assignment'),
  ).toBeInViewport();
});

test('Markdown routes open as raw text and drafts stay unpublished', async ({
  page,
}) => {
  await page.goto('/docs/reference/addarg');
  await page
    .locator('#doc-reference-addarg')
    .getByRole('link', { name: 'View as Markdown' })
    .click();
  await expect(page).toHaveURL(/\/docs\/reference\/addarg\.md$/);
  await expect(page.locator('body')).toContainText('title: __addarg');
  await expect(page.locator('body')).toContainText('__addarg DEST');
  expect(await page.locator('html').getAttribute('data-theme')).toBeNull();
  const index = await page.request.get('/search.json');
  expect(JSON.stringify(await index.json())).not.toContain(
    '/docs/guides/arrays',
  );
  expect((await page.request.get('/docs/guides/arrays')).status()).toBe(404);
  expect((await page.request.get('/docs/guides/arrays.md')).status()).toBe(404);
  const introduction = await page.request.get('/docs.md');
  expect(introduction.status()).toBe(200);
  const introductionMarkdown = await introduction.text();
  expect(matter(introductionMarkdown).data).toEqual({
    title: 'Meet koi',
    subtitle: 'Bashful argument parsing',
  });
  expect(introductionMarkdown).toContain(
    'Koi is a lightweight, 100% Bash-native argument parser.',
  );
  const quickstart = await page.request.get('/docs/quickstart.md');
  expect(quickstart.headers()['content-type']).toContain('text/plain');
  expect(matter(await quickstart.text()).data).toEqual({
    title: 'Quickstart',
    subtitle: 'Write your first koi-powered script',
  });
});

test('homepage install tabs work with keyboard and copy only their command', async ({
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
  await page.goto('/');
  await page.evaluate(() => document.fonts.ready);
  const box = page.locator('.hero .install-box');
  const initialBox = (await box.boundingBox())!;
  const buttons = (await page.locator('.hero .button-row').boundingBox())!;
  expect(Math.abs(initialBox.width - buttons.width)).toBeLessThan(1);
  expect(Math.abs(initialBox.x - buttons.x)).toBeLessThan(1);
  const downloadTab = box.getByRole('tab', { name: 'pacman', exact: true });
  const idleTabStyle = await downloadTab.evaluate((tab) => ({
    background: getComputedStyle(tab).backgroundColor,
    color: getComputedStyle(tab).color,
    border: getComputedStyle(tab).borderBottomColor,
  }));
  await downloadTab.hover();
  const hoverTabStyle = await downloadTab.evaluate((tab) => ({
    background: getComputedStyle(tab).backgroundColor,
    color: getComputedStyle(tab).color,
    border: getComputedStyle(tab).borderBottomColor,
  }));
  expect(hoverTabStyle.background).toBe(idleTabStyle.background);
  expect(hoverTabStyle.color).toBe(idleTabStyle.color);
  expect(hoverTabStyle.border).not.toBe(idleTabStyle.border);
  const homebrew = box.getByRole('tab', { name: 'Homebrew' });
  await expect(homebrew).toHaveAttribute('aria-selected', 'true');
  await box.getByRole('button', { name: 'Copy Homebrew command' }).click();
  expect(
    await page.evaluate(() => (window as unknown as { copied: string }).copied),
  ).toBe('brew tap wcarhart/koi && brew install wcarhart/koi/koi');
  await expect(box.getByRole('tab')).toHaveText([
    'Homebrew',
    'apt',
    'pacman',
    'dnf',
    'apk',
    'mise',
    'Clone',
    'Manual',
  ]);
  await homebrew.focus();
  await page.keyboard.press('ArrowRight');
  const cloneTab = box.getByRole('tab', { name: 'apt', exact: true });
  await expect(cloneTab).toBeFocused();
  await expect(cloneTab).toHaveAttribute('aria-selected', 'true');
  const cloneBox = (await box.boundingBox())!;
  expect(Math.abs(cloneBox.height - initialBox.height)).toBeLessThan(1);
  expect(Math.abs(cloneBox.width - initialBox.width)).toBeLessThan(1);
  await box.getByRole('button', { name: 'Copy apt command' }).click();
  expect(
    await page.evaluate(() => (window as unknown as { copied: string }).copied),
  ).toBe('sudo apt install koi');
  await cloneTab.press('ArrowRight');
  await expect(downloadTab).toBeFocused();
  const download = box.getByRole('tabpanel', { name: 'pacman', exact: true });
  await expect(download).toContainText('sudo pacman -S koi');
  await expect(download.getByRole('button')).toHaveCount(1);
  const downloadBox = (await box.boundingBox())!;
  expect(Math.abs(downloadBox.height - initialBox.height)).toBeLessThan(1);
  expect(Math.abs(downloadBox.width - initialBox.width)).toBeLessThan(1);
  await downloadTab.press('End');
  const manualTab = box.getByRole('tab', { name: 'Manual', exact: true });
  await expect(manualTab).toBeFocused();
  const manual = box.getByRole('tabpanel', { name: 'Manual', exact: true });
  const downloadLink = manual.getByRole('link', {
    name: 'Download from GitHub',
    exact: true,
  });
  await expect(downloadLink).toHaveAttribute(
    'href',
    'https://github.com/wcarhart/koi/releases',
  );
  await expect(downloadLink.locator('.cta-arrow')).toHaveCount(1);
  await expect(manual.getByRole('button')).toHaveCount(0);
  await manualTab.press('ArrowLeft');
  const clone = box.getByRole('tabpanel', { name: 'Clone', exact: true });
  await clone.getByRole('button', { name: 'Copy Clone command' }).click();
  expect(
    await page.evaluate(() => (window as unknown as { copied: string }).copied),
  ).toBe('git clone git@github.com:wcarhart/koi.git');
  await box.getByRole('tab', { name: 'Clone', exact: true }).press('Home');
  await expect(homebrew).toBeFocused();
});

test('shared header and hero use the requested branding and centered theme icons', async ({
  page,
}) => {
  await page.goto('/');
  await expect(page.locator('.brand')).toHaveText('');
  await expect(page.locator('.brand img')).toBeVisible();
  await expect(page.locator('.hero-kicker')).toHaveText(
    /Bash 5\.2\+\s*MIT licensed/,
  );
  await expect(page.locator('.hero-kicker .preview-tag')).toHaveCount(0);
  await expect(page.locator('.hero-description')).toHaveText(
    'Give any Bash function proper argument parsing. Koi is 100% Bash and handles flags, options, validations, help menus, + more.',
  );
  await expect(page.locator('.hero-terminal .copy-button')).toHaveCount(0);
  await expect(page.locator('.terminal-filename')).toHaveText('~/greet.sh');
  await expect(page.locator('.hero-terminal code')).toContainText('source koi');
  await expect(page.locator('.terminal-output')).toContainText('./greet.sh -h');
  await expect(page.locator('.terminal-output')).toContainText(
    './greet.sh --name Will -e',
  );
  await expect(page.locator('.terminal-output')).toContainText('Hello, Will!');
  await expect(page.locator('.hero-footnote')).toHaveCount(0);
  const github = page.locator('.site-header').getByRole('link', {
    name: 'GitHub repository',
    exact: true,
  });
  await expect(github).toBeVisible();
  await expect(github).toHaveText('');
  await expect(github.locator('svg')).toHaveAttribute('fill', 'currentColor');
  const toggle = page.getByRole('button', { name: /Switch to .* mode/ });
  for (let theme = 0; theme < 2; theme++) {
    const centers = await toggle.evaluate((button) => {
      const box = button.getBoundingClientRect();
      const icon = [...button.querySelectorAll('svg')]
        .find((svg) => svg.getClientRects().length)!
        .getBoundingClientRect();
      return {
        x: (box.left + box.right - icon.left - icon.right) / 2,
        y: (box.top + box.bottom - icon.top - icon.bottom) / 2,
      };
    });
    expect(Math.abs(centers.x)).toBeLessThan(0.01);
    expect(Math.abs(centers.y)).toBeLessThan(0.01);
    await toggle.click();
  }
  expect(
    await page.evaluate(
      () =>
        document.documentElement.scrollWidth <=
        document.documentElement.clientWidth,
    ),
  ).toBe(true);
});

test('homepage heading font, button fills, copy alignment, and window hover are correct', async ({
  page,
  isMobile,
}) => {
  await page.goto('/');
  await page.evaluate(() => document.fonts.ready);
  expect(
    await page
      .locator('.hero h1')
      .evaluate((node) => getComputedStyle(node).fontFamily),
  ).toContain('Cabinet Grotesk');
  expect(
    await page
      .locator('.hero-description')
      .evaluate((node) => getComputedStyle(node).fontFamily),
  ).toContain('Satoshi');
  expect(
    await page
      .locator('.landing-copy h2')
      .first()
      .evaluate((node) => getComputedStyle(node).fontFamily),
  ).toContain('Satoshi');
  expect(
    await page
      .locator('.hero-terminal code')
      .evaluate((node) => getComputedStyle(node).fontFamily),
  ).toContain('Monaspace Neon');
  const heroMetrics = await page.evaluate(() => {
    const title = document.querySelector('.hero h1')!;
    const pre = document.querySelector('.hero-terminal pre')!;
    const style = getComputedStyle(pre);
    const available =
      pre.clientWidth -
      parseFloat(style.paddingLeft) -
      parseFloat(style.paddingRight);
    const declarations = [...pre.querySelectorAll('.line')].filter((line) =>
      line.textContent?.includes('__addarg '),
    );
    return {
      titleLines:
        title.getBoundingClientRect().height /
        parseFloat(getComputedStyle(title).lineHeight),
      declarationsFit:
        declarations.length === 2 &&
        declarations.every((line) => {
          const range = document.createRange();
          range.selectNodeContents(line);
          return range.getBoundingClientRect().width <= available;
        }),
    };
  });
  expect(heroMetrics.titleLines).toBeLessThan(2.1);
  if (!isMobile) expect(heroMetrics.declarationsFit).toBe(true);
  const css = (node: Element) => ({
    color: getComputedStyle(node).color,
    fill: getComputedStyle(node).backgroundColor,
    transform: getComputedStyle(node).transform,
  });
  for (const button of await page.locator('.hero .button-row .button').all()) {
    await page.mouse.move(0, 0);
    const before = await button.evaluate(css);
    const bounds = (await button.boundingBox())!;
    await button.hover();
    const after = await button.evaluate(css);
    expect(after.color).toBe(before.color);
    expect(after.fill).not.toBe(before.fill);
    expect(after.transform).toBe('none');
    expect((await button.boundingBox())!.y).toBe(bounds.y);
  }
  for (const tabName of ['Homebrew', 'apt']) {
    await page
      .locator('.hero .install-box')
      .getByRole('tab', { name: tabName, exact: true })
      .click();
    const command = page
      .locator('.hero .install-box')
      .getByRole('tabpanel', { name: tabName, exact: true })
      .locator('.install-command');
    const centers = await command.evaluate((node) => {
      const text = node.querySelector('pre')!.getBoundingClientRect();
      const icon = node.querySelector('button svg')!.getBoundingClientRect();
      return {
        text: (text.top + text.bottom) / 2,
        icon: (icon.top + icon.bottom) / 2,
      };
    });
    expect(Math.abs(centers.text - centers.icon)).toBeLessThan(1);
  }
  const titlebar = page.locator('.hero-terminal .terminal-titlebar');
  await page.mouse.move(0, 0);
  const idle = await titlebar
    .locator('.dot')
    .evaluateAll((nodes) =>
      nodes.map((node) => getComputedStyle(node).backgroundColor),
    );
  expect(new Set(idle).size).toBe(1);
  await titlebar.hover();
  expect(await titlebar.evaluate((node) => getComputedStyle(node).cursor)).toBe(
    'default',
  );
  expect(
    await titlebar
      .locator('.dot')
      .evaluateAll((nodes) =>
        nodes.map((node) => getComputedStyle(node).backgroundColor),
      ),
  ).toEqual(['rgb(255, 95, 87)', 'rgb(254, 188, 46)', 'rgb(40, 200, 64)']);
  await expect(page.locator('.principles-strip')).toContainText(
    'Automatic -h / --help',
  );
});

test('homepage sections, footer, and duplicated install boxes remain accessible', async ({
  page,
}) => {
  await page.goto('/');
  const sections = page.locator('.landing-section');
  await expect(sections).toHaveCount(5);
  const destinations = [
    ['Get started', '/docs/concepts/lifecycle'],
    ['Explore commands', '/docs/guides/commands'],
    ['Explore direct calls', '/docs/concepts/routing'],
    ['Explore help', '/docs/guides/help'],
    ['Installation guide', '/install'],
  ];
  for (const [index, [label, href]] of destinations.entries()) {
    await expect(
      sections.nth(index).getByRole('link', { name: label, exact: true }),
    ).toHaveAttribute('href', href);
    await expect(sections.nth(index).locator('.section-number')).toHaveCount(0);
  }
  await expect(
    page.getByRole('region', { name: 'Direct call output' }),
  ).toContainText('Packaged release.tar.gz');
  await expect(
    page.getByRole('region', { name: 'Generated command help' }),
  ).toContainText('--output');
  await expect(page.locator('.hero-kicker .metadata-pill')).toHaveText([
    'Bash 5.2+',
    'MIT licensed',
  ]);
  await expect(page.locator('.site-footer .preview-tag')).toHaveCount(0);
  await expect(
    page
      .getByRole('navigation', { name: 'Footer navigation' })
      .getByRole('link'),
  ).toHaveCount(4);
  const hero = page.locator('.hero .install-box');
  const lower = page.locator('.landing-install .install-box');
  await expect(lower.getByRole('tab')).toHaveText([
    'Homebrew',
    'apt',
    'pacman',
    'dnf',
    'apk',
    'mise',
  ]);
  await lower.getByRole('tab', { name: 'apt', exact: true }).click();
  await expect(
    lower.getByRole('tabpanel', { name: 'apt', exact: true }),
  ).toBeVisible();
  await expect(hero.getByRole('tab', { name: 'Homebrew' })).toHaveAttribute(
    'aria-selected',
    'true',
  );
  await hero.getByRole('tab', { name: 'pacman', exact: true }).click();
  await expect(
    lower.getByRole('tab', { name: 'apt', exact: true }),
  ).toHaveAttribute('aria-selected', 'true');
  const ids = await page
    .locator('.install-box [id]')
    .evaluateAll((elements) => elements.map((element) => element.id));
  expect(new Set(ids).size).toBe(ids.length);
  for (const theme of ['light', 'dark']) {
    await page.evaluate(
      (value) => (document.documentElement.dataset.theme = value),
      theme,
    );
    await expect(
      page.locator(`.footer-brand .koi-mark-${theme}`),
    ).toBeVisible();
    expect(
      await page.evaluate(
        () =>
          document.documentElement.scrollWidth <=
          document.documentElement.clientWidth,
      ),
    ).toBe(true);
  }
});

test('internal homepage arrows animate on hover and focus and respect reduced motion', async ({
  page,
  isMobile,
}) => {
  await page.goto('/');
  const cta = page.getByRole('link', { name: 'Read the docs', exact: true });
  const shaft = cta.locator('.cta-arrow-shaft');
  const chevron = cta.locator('.cta-arrow-chevron');
  await expect(shaft).toHaveCSS('opacity', '0');
  if (!isMobile) {
    await cta.hover();
    await expect(shaft).toHaveCSS('opacity', '1');
    await expect(chevron).toHaveCSS('transform', 'matrix(1, 0, 0, 1, 12, 0)');
    await page.mouse.move(0, 0);
  }
  await cta.focus();
  await page.keyboard.press('Tab');
  await page.keyboard.press('Shift+Tab');
  await expect(cta).toBeFocused();
  await expect(shaft).toHaveCSS('opacity', '1');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(chevron).toHaveCSS('transform', 'none');
  await expect(shaft).toHaveCSS('opacity', '0');
});

test('homepage anchors, shell prompts, and compact footer use the requested presentation', async ({
  page,
}) => {
  await page.goto('/');
  const slugs = [
    'supercharge-your-scripts',
    'from-one-command-to-a-whole-toolbox',
    'use-shell-like-interfaces-within-your-scripts',
    'intuitive-help-menus-for-free',
    'works-on-mac-and-linux',
  ];
  const headings = page.locator('.landing-copy h2');
  for (const [index, slug] of slugs.entries()) {
    await expect(headings.nth(index)).toHaveAttribute('id', slug);
    await headings.nth(index).getByRole('link').click();
    await expect(page).toHaveURL(new RegExp(`#${slug}$`));
  }
  await page.goto('/#supercharge-your-scripts');
  await expect(headings.first()).toBeInViewport();
  await expect(page.locator('.shell-prompt')).toHaveCount(9);
  for (const prompt of await page.locator('.shell-prompt').all()) {
    await expect(prompt).toHaveText('>');
    await expect(prompt.locator('.koi-mark-light')).toHaveAttribute(
      'src',
      '/brand/koi-filled.svg',
    );
  }
  await expect(page.locator('.cli-invocations')).toContainText(
    'cli deploy stack stacks/production',
  );
  await expect(page.locator('.footer-brand')).not.toHaveAttribute('href');
  await expect(page.locator('.footer-brand')).toHaveCSS('width', '28px');
  await expect(page.locator('.footer-story-title')).toHaveText(
    'Why the name koi?',
  );
  await expect(page.locator('.footer-story .koi-mark-light')).toHaveAttribute(
    'src',
    '/brand/koi-filled.svg',
  );
  await expect(page.locator('.hero-kicker')).toHaveCSS('margin-bottom', '12px');
  await expect(page.locator('.cli-invocations code')).toHaveCount(0);
  await expect(
    page.getByRole('region', { name: 'Generated command help' }),
  ).toContainText('  DIRECTORY  Directory to archive (required)');
  await expect(page.locator('.footer-story')).toContainText(
    'Koi is a homophone of coy and sounds much cooler.',
  );
  for (const theme of ['light', 'dark']) {
    await page.evaluate(
      (value) => (document.documentElement.dataset.theme = value),
      theme,
    );
    const badges = page.locator('.metadata-pill, .landing-section .eyebrow');
    await expect(badges).toHaveCount(7);
    for (const badge of await badges.all()) {
      await expect(badge).toHaveCSS(
        'background-color',
        theme === 'light' ? 'rgb(236, 226, 242)' : 'rgb(49, 32, 60)',
      );
      await expect(badge).toHaveCSS(
        'color',
        theme === 'light' ? 'rgb(120, 68, 157)' : 'rgb(193, 142, 225)',
      );
    }
    const terminal = (await page.locator('.cli-invocations').boundingBox())!;
    const explore = (await page
      .getByRole('link', { name: 'Explore commands', exact: true })
      .boundingBox())!;
    expect(explore.y - terminal.y - terminal.height).toBeCloseTo(20, 0);
    for (const session of await page.locator('.terminal-session').all()) {
      await expect(session).toHaveCSS(
        'background-color',
        theme === 'light' ? 'rgb(255, 255, 255)' : 'rgb(27, 21, 31)',
      );
      await expect(session).toHaveCSS(
        'color',
        theme === 'light' ? 'rgb(107, 97, 113)' : 'rgb(184, 176, 191)',
      );
      await expect(session.locator('.terminal-input').first()).toHaveCSS(
        'color',
        theme === 'light' ? 'rgb(46, 36, 53)' : 'rgb(255, 255, 255)',
      );
      await expect(session.locator('.shell-prompt').first()).toHaveCSS(
        'color',
        theme === 'light' ? 'rgb(120, 68, 157)' : 'rgb(193, 142, 225)',
      );
      await expect(session.locator(`.koi-mark-${theme}`).first()).toBeVisible();
      if (await session.locator('pre').count()) {
        await expect(session.locator('pre').first()).toHaveCSS(
          'color',
          theme === 'light' ? 'rgb(107, 97, 113)' : 'rgb(184, 176, 191)',
        );
      }
    }
  }
});

test('arrow shafts never extend ahead of their moving chevrons', async ({
  page,
}) => {
  await page.goto('/');
  const cta = page.getByRole('link', { name: 'Read the docs', exact: true });
  const samples = await cta.evaluate(async (button) => {
    // Sample both paths on the same animation clock, including the reverse transition.
    button.querySelectorAll('path').forEach((path) => {
      path.style.transitionDuration = '1000ms';
    });
    getComputedStyle(button.querySelector('.cta-arrow-chevron')!).transform;
    const samples: { tip: number; shaftEnd: number }[] = [];
    for (const active of [true, false]) {
      button.classList.toggle('arrow-test-active', active);
      const style = document.createElement('style');
      style.textContent =
        '.arrow-test-active .cta-arrow-chevron { transform: translateX(12px) } .arrow-test-active .cta-arrow-shaft { opacity: 1; stroke-dashoffset: 0 }';
      document.head.append(style);
      getComputedStyle(button.querySelector('.cta-arrow-chevron')!).transform;
      const animations = button.getAnimations({ subtree: true });
      animations.forEach((animation) => animation.pause());
      for (const fraction of [0, 0.25, 0.5, 0.75, 1]) {
        animations.forEach(
          (animation) => (animation.currentTime = fraction * 1000),
        );
        const shaft = button.querySelector<SVGPathElement>('.cta-arrow-shaft')!;
        const chevron =
          button.querySelector<SVGPathElement>('.cta-arrow-chevron')!;
        const matrix = new DOMMatrixReadOnly(
          getComputedStyle(chevron).transform,
        );
        const offset = parseFloat(getComputedStyle(shaft).strokeDashoffset);
        samples.push({ tip: 5 + matrix.m41, shaftEnd: 5 + 12 * (1 - offset) });
      }
      animations.forEach((animation) => animation.finish());
      style.remove();
    }
    return samples;
  });
  for (const sample of samples) {
    expect(sample.shaftEnd).toBeLessThanOrEqual(sample.tip + 0.05);
  }
});

test('installation routes share content and tabs with a standalone-only bottom next button', async ({
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
  const commands = [
    ['Homebrew', 'brew tap wcarhart/koi && brew install wcarhart/koi/koi'],
    ['apt', 'sudo apt install koi'],
    ['pacman', 'sudo pacman -S koi'],
    ['dnf', 'sudo dnf install koi'],
    ['apk', 'sudo apk add koi'],
    ['mise', 'mise use -g koi@latest'],
  ];
  let standaloneText = '';
  for (const route of ['/install', '/docs/install']) {
    await page.goto(route);
    const content =
      route === '/install'
        ? page.locator('main.standalone')
        : page.locator('#doc-install .doc-prose');
    await expect(content.locator('h2')).toHaveText([
      'Quick install',
      'Dependencies',
      'Manual install',
      'Clone',
      'Older Bash versions',
    ]);
    await expect(content).not.toContainText('GET UP AND RUNNING');
    const quick = content.locator('.install-box').nth(0);
    await expect(quick.getByRole('tab')).toHaveText(
      commands.map(([label]) => label),
    );
    for (const [label, command] of commands) {
      await quick.getByRole('tab', { name: label, exact: true }).click();
      const panel = quick.getByRole('tabpanel', { name: label, exact: true });
      await expect(panel).toHaveText(command);
      await panel.getByRole('button').click();
      expect(
        await page.evaluate(
          () => (window as unknown as { copied: string }).copied,
        ),
      ).toBe(command);
    }
    const bash = content.locator('.install-box').nth(1);
    for (const [label, command] of [
      ['Ubuntu/Debian', 'sudo apt-get install bash'],
      ['Fedora/RHEL', 'sudo dnf install bash'],
      ['Windows 10/11', 'wsl --install'],
      ['macOS', 'brew install bash'],
    ]) {
      await bash.getByRole('tab', { name: label, exact: true }).click();
      await expect(
        bash.getByRole('tabpanel', { name: label, exact: true }),
      ).toHaveText(command);
    }
    await expect(
      quick.getByRole('tab', { name: 'mise', exact: true }),
    ).toHaveAttribute('aria-selected', 'true');
    const next = content.getByRole('link', {
      name: 'Next: Quickstart',
      exact: true,
    });
    await expect(next).toHaveCount(route === '/install' ? 2 : 1);
    for (const button of await next.all()) {
      await expect(button).toHaveAttribute('href', '/docs/quickstart');
      await expect(button.locator('.cta-arrow')).toHaveCount(1);
    }
    const quickBounds = (await quick.boundingBox())!;
    const nextBounds = (await next.first().boundingBox())!;
    const dependencies = (await content
      .locator('#doc-install-dependencies')
      .boundingBox())!;
    expect(nextBounds.y).toBeGreaterThanOrEqual(
      quickBounds.y + quickBounds.height,
    );
    expect(nextBounds.y + nextBounds.height).toBeLessThanOrEqual(
      dependencies.y,
    );
    expect(nextBounds.x + nextBounds.width).toBeCloseTo(
      quickBounds.x + quickBounds.width,
      0,
    );
    const text = await content.evaluate((node) => {
      const copy = node.cloneNode(true) as HTMLElement;
      copy.querySelectorAll('.install-next').forEach((node) => node.remove());
      return copy.textContent!.replace(/\s+/g, ' ').trim();
    });
    if (route === '/install') standaloneText = text;
    else expect(text).toBe(standaloneText);
    expect(
      await page.evaluate(
        () =>
          document.documentElement.scrollWidth <=
          document.documentElement.clientWidth,
      ),
    ).toBe(true);
    const ids = await page
      .locator('.install-box [id]')
      .evaluateAll((nodes) => nodes.map((node) => node.id));
    expect(new Set(ids).size).toBe(ids.length);
  }
});

test('simple docs and install buttons change only fill and arrow on hover and keyboard focus', async ({
  page,
  isMobile,
}) => {
  for (const route of [
    '/install',
    '/docs',
    '/docs/install',
    '/docs/guides',
    '/docs/examples',
  ]) {
    await page.goto(route);
    for (const theme of ['light', 'dark']) {
      await page.evaluate((theme) => {
        document.documentElement.dataset.theme = theme;
      }, theme);
      for (const button of await page.locator('.button:visible').all()) {
        await page.mouse.move(0, 0);
        await button.evaluate((node) => (node as HTMLElement).blur());
        const initial = await button.evaluate((node) => {
          const style = getComputedStyle(node);
          return { color: style.color, fill: style.backgroundColor };
        });
        if (!isMobile) {
          await button.scrollIntoViewIfNeeded();
          const before = (await button.boundingBox())!;
          await button.hover();
          const after = (await button.boundingBox())!;
          expect(after).toEqual(before);
          await expect(button).toHaveCSS('color', initial.color);
          await expect(button).not.toHaveCSS('background-color', initial.fill);
          await expect(button).toHaveCSS('transform', 'none');
          await expect(button).toHaveCSS('box-shadow', 'none');
          await expect(button.locator('.cta-arrow-chevron')).toHaveCSS(
            'transform',
            'matrix(1, 0, 0, 1, 12, 0)',
          );
          await expect(button.locator('.cta-arrow-shaft')).toHaveCSS(
            'opacity',
            '1',
          );
          await page.mouse.move(0, 0);
        }
        await button.focus();
        await page.keyboard.press('Tab');
        await page.keyboard.press('Shift+Tab');
        await expect(button).toBeFocused();
        await expect(button).toHaveCSS('color', initial.color);
        await expect(button).toHaveCSS('transform', 'none');
        await expect(button.locator('.cta-arrow-shaft')).toHaveCSS(
          'opacity',
          '1',
        );
        await page.emulateMedia({ reducedMotion: 'reduce' });
        await expect(button.locator('.cta-arrow-chevron')).toHaveCSS(
          'transform',
          'none',
        );
        await expect(button.locator('.cta-arrow-shaft')).toHaveCSS(
          'opacity',
          '0',
        );
        await page.emulateMedia({ reducedMotion: 'no-preference' });
      }
    }
  }
});

test('internal and external prose links share purple text and underline only on interaction', async ({
  page,
  isMobile,
}) => {
  for (const route of ['/docs', '/install', '/docs/install']) {
    await page.goto(route);
    const prose =
      route === '/install'
        ? page.locator('main.standalone')
        : page.locator(
            route === '/docs' ? '#doc-introduction' : '#doc-install',
          );
    const links = prose.locator('p a:not(.button), li a:not(.button)');
    expect(await links.count()).toBeGreaterThan(0);
    for (const theme of ['light', 'dark']) {
      await page.evaluate((theme) => {
        document.documentElement.dataset.theme = theme;
      }, theme);
      for (const link of await links.all()) {
        await page.mouse.move(0, 0);
        await link.evaluate((node) => (node as HTMLElement).blur());
        await expect(link).toHaveCSS('text-decoration-line', 'none');
        expect(
          await link.evaluate((node) => {
            const probe = document.createElement('span');
            probe.style.color = 'var(--accent)';
            node.append(probe);
            const matches =
              getComputedStyle(node).color === getComputedStyle(probe).color;
            probe.remove();
            return matches;
          }),
        ).toBe(true);
        if (!isMobile) {
          await link.hover();
          await expect(link).toHaveCSS('text-decoration-line', 'underline');
        }
        await link.focus();
        await expect(link).toHaveCSS('text-decoration-line', 'underline');
      }
    }
  }
});
