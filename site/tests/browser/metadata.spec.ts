import { test, expect } from '@playwright/test';
import { getDocs } from '../../src/lib/content';
import { docsIndexes } from '../../src/lib/docs-indexes';

test('initial HTML publishes self canonicals, discovery, and only real Markdown alternates', async ({
  page,
  request,
}) => {
  const paths = [
    ...new Set([
      '/',
      '/install',
      '/review-source',
      '/agents',
      '/docs',
      ...docsIndexes.map((index) => index.url),
      ...(await getDocs()).map((doc) => doc.url),
    ]),
  ];
  const headerResponse = await request.get('/_headers');
  expect(headerResponse.status()).toBe(200);
  const deploymentHeaders = await headerResponse.text();
  for (const path of paths) {
    const response = await request.get(path);
    expect(response.status(), path).toBe(200);
    const html = await response.text();
    const metadata = await page.evaluate((html) => {
      const document = new DOMParser().parseFromString(html, 'text/html');
      return {
        canonical: [...document.querySelectorAll('link[rel="canonical"]')].map(
          (node) => node.getAttribute('href'),
        ),
        describedBy: [
          ...document.querySelectorAll('link[rel="describedby"]'),
        ].map((node) => node.getAttribute('href')),
        markdown: [
          ...document.querySelectorAll(
            'link[rel="alternate"][type="text/markdown"]',
          ),
        ].map((node) => node.getAttribute('href')),
        description: document
          .querySelector('meta[name="description"]')
          ?.getAttribute('content'),
        ogTitle: document
          .querySelector('meta[property="og:title"]')
          ?.getAttribute('content'),
        noindex: document
          .querySelector('meta[name="robots"]')
          ?.getAttribute('content'),
      };
    }, html);
    expect(metadata.canonical, path).toEqual([`https://koishell.com${path}`]);
    expect(metadata.describedBy, path).toEqual([
      'https://koishell.com/llms.txt',
    ]);
    expect(metadata.description, path).toBeTruthy();
    expect(metadata.ogTitle, path).toBeTruthy();
    expect(metadata.noindex, path).toBeUndefined();
    expect(metadata.markdown, path).toEqual(
      path === '/' || path === '/review-source'
        ? []
        : [`https://koishell.com${path}.md`],
    );
    for (const alternate of metadata.markdown) {
      const markdownPath = new URL(alternate!).pathname;
      expect(deploymentHeaders).toContain(
        `${markdownPath}\n  Link: <https://koishell.com${path}>; rel="canonical"`,
      );
      const markdown = await request.get(markdownPath);
      expect(markdown.status(), alternate!).toBe(200);
      expect(markdown.headers()['content-type']).toMatch(
        /^text\/(markdown|plain)/,
      );
      const content = await markdown.text();
      expect(content).not.toMatch(/<!doctype html|<html[\s>]/i);
      expect(content).toMatch(/^# |^---\r?\n/m);
    }
  }
});

test('unfinished playground stays out of documentation discovery and indexing', async ({
  browser,
  request,
}) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto('/playground');
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    'href',
    'https://koishell.com/playground',
  );
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
    'content',
    'noindex',
  );
  await expect(
    page.locator(
      'link[rel="describedby"], link[rel="alternate"][type="text/markdown"]',
    ),
  ).toHaveCount(0);
  expect(await (await request.get('/sitemap.xml')).text()).not.toContain(
    '/playground',
  );
  expect(await (await request.get('/llms.txt')).text()).not.toContain(
    '/playground',
  );
  await context.close();
});

test('continuous navigation keeps canonical and Markdown URLs synchronized', async ({
  page,
}) => {
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
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    'href',
    'https://koishell.com/docs/concepts/arguments',
  );
  await expect(page.locator('link[rel="alternate"]')).toHaveAttribute(
    'href',
    'https://koishell.com/docs/concepts/arguments.md',
  );
  await page.reload();
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    'href',
    'https://koishell.com/docs/concepts/arguments',
  );
});
