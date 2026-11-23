import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { sourceReviewPrompt } from '../../src/lib/source-review';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'clipboard', {
      value: {
        writeText: async (text: string) => {
          (window as unknown as { copied: string }).copied = text;
        },
      },
    });
  });
});

test('installation links retain their version and animate as text links', async ({
  page,
  request,
}) => {
  for (const path of [
    '/install',
    '/docs/install',
    ...(process.env.KOI_TEST_VERSIONS ? ['/docs/v2.0.4/install'] : []),
  ]) {
    await page.goto(path);
    const link = page.locator(
      path.startsWith('/docs') ? '#doc-install .text-cta' : 'main .text-cta',
    );
    await expect(link).toHaveCount(1);
    const href = (await link.getAttribute('href'))!;
    const version = new URL(href, 'https://koishell.com').searchParams.get(
      'version',
    )!;
    if (path === '/docs/install') expect(version).toBe('unreleased');
    if (path === '/docs/v2.0.4/install') expect(version).toBe('v2.0.4');
    if (path === '/install' && process.env.KOI_TEST_VERSIONS)
      expect(version).toBe('v2.1.0');
    await expect(link.locator('..')).toHaveJSProperty('tagName', 'EM');
    expect(
      await link.evaluate((node) =>
        node
          .closest('p')!
          .previousElementSibling!.classList.contains('code-block'),
      ),
    ).toBe(true);
    await link.focus();
    await expect(link.locator('.cta-arrow-shaft')).toHaveCSS('opacity', '1');
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await expect(link.locator('.cta-arrow-shaft')).toHaveCSS('opacity', '0');
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    const markdown = await (await request.get(path + '.md')).text();
    expect(markdown).toContain('https://koishell.com' + href);
    await link.click();
    await expect(page).toHaveURL(href);
    await expect(page.locator('.version-label')).toHaveText(
      version === 'unreleased' ? 'Unreleased' : version,
    );
    const source = await (await request.get(`/versions/${version}/koi`)).text();
    await expect
      .poll(() => page.locator('.review-prompt code').textContent())
      .toBe(sourceReviewPrompt(source));
  }
});

test('Copy copies the complete prompt while provider actions only open chats', async ({
  page,
  request,
}) => {
  await page.goto('/review-source?version=unreleased');
  const source = await (await request.get('/versions/unreleased/koi')).text();
  const prompt = sourceReviewPrompt(source);
  const code = page.locator('.review-prompt code');
  await expect.poll(() => code.textContent()).toBe(prompt);
  const copy = page.getByRole('button', {
    name: 'Copy review prompt',
    exact: true,
  });
  await copy.click();
  await expect(copy).toHaveAttribute('data-copy-state', 'success');
  expect(
    await page.evaluate(() => (window as unknown as { copied: string }).copied),
  ).toBe(prompt);
  await page.evaluate(() => {
    (window as unknown as { copied: string }).copied = 'unchanged';
    document.getElementById('announcement')!.textContent = '';
    window.open = (url, target, features) => {
      (window as unknown as { opened: unknown[] }).opened = [
        url,
        target,
        features,
      ];
      return null;
    };
  });
  for (const [name, url] of [
    ['ChatGPT', 'https://chat.openai.com/'],
    ['Claude', 'https://claude.ai/code/new'],
  ]) {
    await page
      .getByRole('button', {
        name: `Open ${name}`,
        exact: true,
      })
      .click();
    expect(
      await page.evaluate(
        () => (window as unknown as { opened: unknown[] }).opened,
      ),
    ).toEqual([url, '_blank', 'noopener,noreferrer']);
    expect(
      await page.evaluate(
        () => (window as unknown as { copied: string }).copied,
      ),
    ).toBe('unchanged');
    await expect(page.locator('[data-review-status]')).toBeEmpty();
    await expect(page.locator('#announcement')).toBeEmpty();
  }
  await page.evaluate(() => {
    navigator.clipboard.writeText = async () => {
      throw new Error('denied');
    };
  });
  await page.getByRole('button', { name: 'Open Claude', exact: true }).click();
  await expect(page.locator('[data-review-status]')).toBeEmpty();
  await expect(page.locator('#announcement')).toBeEmpty();
  await copy.click();
  await expect(copy).toHaveAttribute('data-copy-state', 'error');
});

test('version loading handles failures, literal source, retries, history, and invalid IDs', async ({
  page,
}) => {
  await page.goto('/review-source');
  const defaultVersion = await page
    .locator('.review-source')
    .getAttribute('data-default-version');
  const alternate = defaultVersion === 'unreleased' ? 'v2.0.4' : 'unreleased';
  // Local builds may have only Unreleased; exercise the fetch path with a catalog entry.
  test.skip(
    defaultVersion === 'unreleased',
    'Historical versions are covered by pnpm test:versions.',
  );
  let succeed = false;
  const literal =
    '\n<script>window.bad = true</script>\n\ttrailing spaces  \n\n';
  await page.route(`/versions/${alternate}/koi`, async (route) => {
    if (!succeed) await route.fulfill({ status: 503, body: 'Unavailable' });
    else await route.fulfill({ contentType: 'text/plain', body: literal });
  });
  await page.locator('.version-trigger').click();
  await expect(page.locator('[data-version-id="v1.x"]')).toHaveCount(0);
  await page.locator(`[data-version-id="${alternate}"]`).click();
  await expect(page.locator('[data-review-status]')).toContainText(
    'Could not load',
  );
  await expect(page.locator('.review-prompt pre')).toBeHidden();
  await expect(
    page.getByRole('button', { name: 'Copy review prompt', exact: true }),
  ).toBeDisabled();
  succeed = true;
  await page.getByRole('button', { name: 'Retry', exact: true }).click();
  await expect
    .poll(() => page.locator('.review-prompt code').textContent())
    .toBe(sourceReviewPrompt(literal));
  expect(
    await page.evaluate(() => (window as unknown as { bad?: boolean }).bad),
  ).toBeUndefined();
  await page.goBack();
  await expect(page.locator('.version-label')).toHaveText(defaultVersion!);
  await page.goForward();
  await expect(page.locator('.version-label')).toHaveText('Unreleased');
  await page.goto('/review-source?version=v1.2.1');
  await expect(page.locator('.version-label')).toHaveText(defaultVersion!);
  await expect(page).toHaveURL(`/review-source?version=${defaultVersion}`);
});

test('review page fits mobile and remains accessible in both themes', async ({
  page,
}) => {
  for (const colorScheme of ['light', 'dark'] as const) {
    await page.emulateMedia({ colorScheme });
    await page.goto('/review-source');
    await expect(
      page.getByRole('heading', { name: 'Review the source', exact: true }),
    ).toBeVisible();
    await expect(page.locator('.review-prompt pre')).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    const selector = page.locator('.version-trigger');
    await selector.focus();
    await selector.press('ArrowDown');
    await expect(page.locator('.version-options')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(selector).toBeFocused();
    expect(
      (
        await new AxeBuilder({ page })
          .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
          .analyze()
      ).violations,
    ).toEqual([]);
  }
});
