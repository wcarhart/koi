import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('custom version selector supports keyboard, tooltips, dismissal, and the legacy destination', async ({
  page,
  isMobile,
}) => {
  await page.goto('/docs');
  const selector = page
    .locator(isMobile ? '#mobile-version-options' : '#sidebar-version-options')
    .locator('..');
  const trigger = selector.getByRole('button', {
    name: 'Koi version: Unreleased',
  });
  await trigger.focus();
  await trigger.press('ArrowDown');
  await expect(
    selector.getByRole('link', { name: 'Unreleased', exact: true }),
  ).toBeFocused();
  await selector.getByRole('button', { name: 'About Unreleased' }).focus();
  await expect(
    selector.getByRole('tooltip').filter({
      hasText: 'Subject to change without notice. Use at your own risk.',
    }),
  ).toBeVisible();
  const legacy = selector.getByRole('link', { name: 'v1.x' });
  await expect(legacy).toHaveAttribute(
    'href',
    'https://old.willcarhart.dev/docs/koi',
  );
  await expect(legacy).toHaveAttribute('target', '_blank');
  await selector.getByRole('button', { name: 'About v1.x' }).focus();
  await expect(
    selector
      .getByRole('tooltip')
      .filter({ hasText: 'Koi v1 is no longer supported.' }),
  ).toBeVisible();
  expect(
    (
      await new AxeBuilder({ page })
        .include('[data-version-selector]')
        .analyze()
    ).violations,
  ).toEqual([]);
  await page.keyboard.press('Escape');
  await expect(trigger).toBeFocused();
  await expect(trigger).toHaveAttribute('aria-expanded', 'false');
  await trigger.click();
  await page.locator('.docs-main').click({ position: { x: 100, y: 400 } });
  await expect(trigger).toHaveAttribute('aria-expanded', 'false');
  const results = await new AxeBuilder({ page })
    .include('[data-version-selector]')
    .analyze();
  expect(results.violations).toEqual([]);
});

test('unknown documentation versions render the 404 page', async ({ page }) => {
  for (const url of [
    '/docs/v2.0.0/concepts/cardinality',
    '/docs/v1.2.1/concepts/cardinality',
    '/docs/v9.9.9',
    '/docs/no-such-document',
  ]) {
    const response = await page.goto(url);
    expect(response?.status(), url).toBe(404);
    await expect(
      page.getByRole('heading', { name: 'Not found', exact: true }),
    ).toBeVisible();
  }
});

test.describe('historical fixture builds', () => {
  test.skip(
    !process.env.KOI_TEST_VERSIONS,
    'Run pnpm test:versions for isolated historical builds.',
  );
  test('navbar selects stable while unversioned docs remain Unreleased', async ({
    page,
    request,
  }) => {
    await page.goto('/');
    await expect(
      page
        .locator('.site-header')
        .getByRole('link', { name: 'Docs', exact: true }),
    ).toHaveAttribute('href', '/docs/v2.1.0');
    await page.goto('/docs');
    await expect(page.locator('meta[name=robots]')).toHaveAttribute(
      'content',
      'noindex',
    );
    const sitemap = await (await request.get('/sitemap.xml')).text();
    expect(sitemap).toContain('<loc>https://koishell.com/docs/v2.0.4</loc>');
    expect(sitemap).not.toContain('<loc>https://koishell.com/docs</loc>');
  });
  test('switching preserves current document and valid fragment with version-specific search', async ({
    page,
    isMobile,
  }) => {
    await page.goto('/docs/v2.0.5/reference/glossary#flag');
    await expect(page.locator('#doc-reference-glossary-flag')).toBeInViewport();
    const selector = page
      .locator(
        isMobile ? '#mobile-version-options' : '#sidebar-version-options',
      )
      .locator('..');
    await selector.getByRole('button', { name: 'Koi version: v2.0.5' }).click();
    await selector.getByRole('link', { name: 'v2.0.4', exact: true }).click();
    await expect(page).toHaveURL('/docs/v2.0.4/reference/glossary#flag');
    await expect(page.locator('#doc-reference-glossary-flag')).toBeInViewport();
    await page.keyboard.press('/');
    const input = page.getByRole('combobox', { name: 'Search documentation' });
    await input.fill('neweronly');
    await expect(page.locator('.search-status')).toHaveText('No results.');
    await input.fill('olderonly');
    await expect(page.locator('#search-results a').first()).toHaveAttribute(
      'href',
      '/docs/v2.0.4',
    );
    await page.keyboard.press('Escape');
    await page.reload();
    await expect(page.locator('link[rel=canonical]')).toHaveAttribute(
      'href',
      'https://koishell.com/docs/v2.0.4/reference/glossary',
    );
  });
  test('selector falls back quietly while direct missing documents and versions return 404', async ({
    page,
    request,
    isMobile,
  }) => {
    await page.goto('/docs/v2.0.5/release-only');
    const selector = page
      .locator(
        isMobile ? '#mobile-version-options' : '#sidebar-version-options',
      )
      .locator('..');
    await selector.getByRole('button', { name: 'Koi version: v2.0.5' }).click();
    await selector.getByRole('link', { name: 'v2.0.4', exact: true }).click();
    await expect(page).toHaveURL('/docs/v2.0.4/examples/commands');
    for (const url of [
      '/docs/v2.0.4/release-only',
      '/docs/v1.2.1',
      '/docs/v9.9.9',
      '/docs/v2.0.4/absent',
    ]) {
      expect((await request.get(url)).status(), url).toBe(404);
    }
  });
  test('historical exports and source retain their version and unsupported builders remain static', async ({
    page,
    request,
  }) => {
    const markdown = await (
      await request.get('/docs/v2.0.4/reference/add_arg.md')
    ).text();
    expect(markdown).toContain('https://koishell.com/docs/v2.0.4/');
    const index = await (await request.get('/docs/v2.0.4/llms.txt')).text();
    expect(index).toContain(
      'https://koishell.com/docs/v2.0.4/reference/add_arg.md',
    );
    const source = await request.get('/versions/v2.0.4/koi');
    expect(source.status()).toBe(200);
    expect(await source.text()).toContain('koi::parse()');
    await page.goto('/docs/v2.1.0/reference/add_arg');
    await expect(page.locator('[data-argument-explorer]')).toHaveCount(0);
    await expect(
      page.locator('#doc-reference-add_arg .doc-example'),
    ).toContainText('koi::add_arg');
    await page.goto('/docs/v2.0.4/reference/add_arg');
    await expect(page.locator('[data-argument-explorer]')).toHaveCount(1);
  });
});

test.describe('stable documentation links', () => {
  test('site entry links use stable while installation links stay standalone', async ({
    page,
    request,
  }) => {
    const aliases = await (await request.get('/_stable-aliases.json')).json();
    const base = aliases['/docs/stable'];
    await page.goto('/');
    await expect(
      page
        .locator('.site-header')
        .getByRole('link', { name: 'Docs', exact: true }),
    ).toHaveAttribute('href', base);
    await expect(
      page
        .locator('.site-footer')
        .getByRole('link', { name: 'Docs', exact: true }),
    ).toHaveAttribute('href', base);
    for (const [label, slug] of [
      ['Read the docs', ''],
      ['Get started', 'concepts/lifecycle'],
      ['More examples', 'examples'],
      ['Explore commands', 'guides/commands'],
      ['Explore direct calls', 'concepts/routing'],
      ['Explore help', 'guides/help'],
    ]) {
      const links = page
        .locator('main')
        .getByRole('link', { name: new RegExp(`^${label}`) });
      expect(await links.count()).toBeGreaterThan(0);
      for (const link of await links.all())
        await expect(link).toHaveAttribute(
          'href',
          base + (slug ? '/' + slug : ''),
        );
    }
    for (const link of await page
      .getByRole('link', { name: /^Install(?:ation guide)?$/ })
      .all())
      await expect(link).toHaveAttribute('href', '/install');
    const references = JSON.parse(
      (await page.locator('#api-references').textContent()) || '[]',
    );
    expect(references.length).toBeGreaterThan(0);
    expect(
      references.every((reference: { url: string }) =>
        reference.url.startsWith(base + '/reference/'),
      ),
    ).toBe(true);
    await page.goto('/no-such-page');
    await expect(
      page.getByRole('link', { name: /^Read the docs/ }),
    ).toHaveAttribute('href', base);
    await page.goto('/install');
    await expect(
      page.getByRole('link', { name: /^Next: Quickstart/ }),
    ).toHaveCount(6);
    for (const link of await page
      .getByRole('link', { name: /^Next: Quickstart/ })
      .all())
      await expect(link).toHaveAttribute('href', base + '/quickstart');
    await expect(
      page.getByRole('tab', { name: 'brew', exact: true }),
    ).toBeVisible();
    const markdown = await (await request.get('/install.md')).text();
    expect(markdown).toContain('brew install');
    if (process.env.KOI_TEST_VERSIONS) {
      await expect(page.locator('main')).toContainText('stableinstallprose');
      expect(markdown).toContain('stableinstallprose');
      await expect(page.locator('main > .install-next:last-child')).toHaveCount(
        1,
      );
      expect(
        await page
          .locator('main > .install-next:last-child')
          .evaluate((button) => button.previousElementSibling?.textContent),
      ).toBe('stableinstallprose');
    }
    for (const prefix of [
      ...(process.env.KOI_TEST_VERSIONS ? ['/docs/v2.0.4'] : []),
      '/docs',
    ]) {
      await page.goto(`${prefix}/install`);
      const content = page.locator('#doc-install .doc-prose');
      const next = content.getByRole('link', { name: /^Next: Quickstart/ });
      await expect(next).toHaveCount(5);
      for (const link of await next.all()) {
        await expect(link).toHaveAttribute('href', `${prefix}/quickstart`);
        await expect(link.locator('.cta-arrow')).toHaveCount(1);
      }
      expect(
        await content.locator('.install-next').evaluateAll((buttons) =>
          buttons.map((button) => {
            let heading = button.previousElementSibling;
            while (heading && heading.tagName !== 'H2') {
              heading = heading.previousElementSibling;
            }
            return {
              section: heading?.textContent,
              next: button.nextElementSibling?.tagName,
            };
          }),
        ),
      ).toEqual([
        { section: 'Quick install', next: 'H2' },
        { section: 'Homebrew and mise', next: 'H2' },
        { section: 'Manual install', next: 'H2' },
        { section: 'GitHub download', next: 'H2' },
        { section: 'Clone', next: 'H2' },
      ]);
      if (prefix === '/docs/v2.0.4') {
        await expect(content.locator('h2').first()).toHaveText('Dependencies');
      }
    }
  });

  test('stable aliases redirect HTML, Markdown, and aggregates without caching or missing-page fallback', async ({
    page,
    request,
  }) => {
    const aliases = await (await request.get('/_stable-aliases.json')).json();
    for (const suffix of [
      '',
      '.md',
      '/quickstart',
      '/quickstart.md',
      '/guides',
      '/guides.md',
      '/search.json',
      '/llms.txt',
      '/llms-full.txt',
    ]) {
      const source = '/docs/stable' + suffix;
      const response = await request.get(source + '?from=alias', {
        maxRedirects: 0,
      });
      expect(response.status(), source).toBe(302);
      expect(response.headers()['location']).toBe(
        aliases[source] + '?from=alias',
      );
      expect(response.headers()['cache-control']).toBe('no-store');
    }
    await page.goto('/docs/stable/reference/glossary?from=alias#flag');
    await expect(page).toHaveURL(
      aliases['/docs/stable/reference/glossary'] + '?from=alias#flag',
    );
    await expect(page.locator('#doc-reference-glossary-flag')).toBeInViewport();
    const rules = await (await request.get('/_redirects')).text();
    expect(rules).toContain(
      `/docs/stable/quickstart ${aliases['/docs/stable/quickstart']} 302`,
    );
    for (const url of [
      '/docs/stable/absent',
      '/docs/stable/v1.2.1',
      ...(process.env.KOI_TEST_VERSIONS ? ['/docs/stable/release-only'] : []),
    ]) {
      const response = await request.get(url, { maxRedirects: 0 });
      expect(response.status(), url).toBe(404);
    }
    const sitemap = await (await request.get('/sitemap.xml')).text();
    expect(sitemap).not.toContain('/docs/stable');
  });
});
