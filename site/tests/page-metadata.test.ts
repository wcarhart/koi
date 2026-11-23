import test from 'node:test';
import assert from 'node:assert/strict';
import { getDocs } from '../src/lib/content';
import {
  markdownHeaders,
  markdownLink,
  pageMetadata,
  publishedPagePaths,
} from '../src/lib/page-metadata';
import { GET as deploymentHeaders } from '../src/pages/[metadata]';
import { GET as introduction } from '../src/pages/docs.md';
import { GET as installation } from '../src/pages/install.md';
import { GET as agents } from '../src/pages/agents.md';
import {
  GET as document,
  getStaticPaths,
} from '../src/pages/docs/[...slug].md';
import { GET as sitemap } from '../src/pages/sitemap.xml';

test('metadata treats documentation coverage separately from Markdown availability', async () => {
  const docs = await getDocs();
  const home = pageMetadata('/', docs);
  assert.equal(home.canonical, 'https://koishell.com/');
  assert.equal(home.describedBy, 'https://koishell.com/llms.txt');
  assert.equal(home.markdownUrl, undefined);
  for (const path of publishedPagePaths(docs).filter((path) => path !== '/')) {
    const metadata = pageMetadata(path, docs);
    assert.equal(metadata.canonical, `https://koishell.com${path}`);
    assert.equal(
      metadata.markdownUrl,
      path === '/review-source' ? undefined : `${metadata.canonical}.md`,
    );
    assert.equal(metadata.describedBy, home.describedBy);
    assert.equal(metadata.noindex, false);
  }
  assert.deepEqual(pageMetadata('/playground', docs), {
    canonical: 'https://koishell.com/playground',
    describedBy: undefined,
    markdownUrl: undefined,
    noindex: true,
  });
  assert.equal(
    pageMetadata('/docs/install/?tracking=test', docs).canonical,
    'https://koishell.com/docs/install',
  );
  assert.equal(
    pageMetadata('/docs/guides/arrays', docs).markdownUrl,
    undefined,
  );
});

test('Markdown responses and deployment rules link back to the equivalent HTML pages', async () => {
  const docs = await getDocs();
  const responses = [
    { path: '/docs', response: await introduction() },
    { path: '/install', response: await installation() },
    { path: '/agents', response: agents() },
    ...(await getStaticPaths()).map((route) => ({
      path: route.props.htmlPath,
      response: document({ props: route.props }),
    })),
  ];
  const rules = await (await deploymentHeaders()).text();
  assert.equal(
    responses.length,
    publishedPagePaths(docs).filter(
      (path) => pageMetadata(path, docs).markdownUrl,
    ).length,
  );
  for (const { path, response } of responses) {
    assert.equal(response.headers.get('link'), markdownLink(path));
    assert.equal(
      markdownHeaders(path).Link,
      `<https://koishell.com${path}>; rel="canonical", <https://koishell.com/llms.txt>; rel="describedby"`,
    );
    assert.ok(rules.includes(`${path}.md\n  Link: ${markdownLink(path)}\n`));
  }
  assert.doesNotMatch(rules, /playground|\/skill\.md|\/index\.md/);
});

test('sitemap covers all published pages and excludes unfinished content', async () => {
  const xml = await (await sitemap()).text();
  for (const path of publishedPagePaths(await getDocs()))
    assert.ok(xml.includes(`<loc>https://koishell.com${path}</loc>`));
  assert.doesNotMatch(xml, /playground|guides\/arrays|404/);
});
