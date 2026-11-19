import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('hero APIs open cards with reference metadata and working docs links', async ({
  page,
}, testInfo) => {
  await page.goto('/');
  const trigger = page
    .locator('.hero-terminal [data-api-reference="koi::add_arg"]')
    .first();
  const card = page.getByRole('dialog', { name: 'koi::add_arg', exact: true });
  if (testInfo.project.name === 'mobile') await trigger.focus();
  else await trigger.hover();
  await expect(card).toBeVisible();
  await expect(card).toContainText(
    'Define one flag, option, or positional argument in the current registration context.',
  );
  const link = card.getByRole('link', { name: 'Docs', exact: true });
  await expect(link).toHaveAttribute('href', '/docs/reference/add_arg');
  await expect(link.locator('.cta-arrow')).toHaveCount(1);
  await expect(link).toHaveCSS('border-radius', '50%');
  const geometry = await link.evaluate((button) => {
    const bounds = button.getBoundingClientRect();
    const paths = [...button.querySelectorAll('path')].map((path) =>
      path.getBoundingClientRect(),
    );
    return {
      width: bounds.width,
      height: bounds.height,
      dx:
        (Math.min(...paths.map((path) => path.left)) +
          Math.max(...paths.map((path) => path.right))) /
          2 -
        (bounds.left + bounds.width / 2),
      dy:
        (Math.min(...paths.map((path) => path.top)) +
          Math.max(...paths.map((path) => path.bottom))) /
          2 -
        (bounds.top + bounds.height / 2),
    };
  });
  expect(geometry.width).toBe(geometry.height);
  expect(Math.abs(geometry.dx)).toBeLessThan(0.1);
  expect(Math.abs(geometry.dy)).toBeLessThan(0.1);
  await expect(link.locator('.cta-arrow-shaft')).toHaveCSS('opacity', '1');
  await expect(link.locator('.cta-arrow-chevron')).toHaveCSS(
    'transform',
    'matrix(1, 0, 0, 1, 12, 0)',
  );
  await expect(link.locator('.cta-arrow-chevron')).toHaveCSS(
    'transition-duration',
    '0s',
  );
  if (testInfo.project.name !== 'mobile') {
    await link.hover();
    await page.waitForTimeout(250);
    await expect(card).toBeVisible();
    await expect(link.locator('.cta-arrow-shaft')).toHaveCSS('opacity', '1');
  }
  const bounds = await card.boundingBox();
  const viewport = page.viewportSize()!;
  expect(bounds!.x).toBeGreaterThanOrEqual(0);
  expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(viewport.width);
  expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(viewport.height);
  await link.click();
  await expect(page).toHaveURL(/\/docs\/reference\/add_arg$/);
});

test('cards support keyboard navigation, dismissal, and both documentation columns', async ({
  page,
}) => {
  await page.goto('/docs/reference/add_arg');
  const prose = page
    .locator('#doc-reference-add_arg .doc-prose [data-api-reference]')
    .first();
  const demo = page
    .locator('#doc-reference-add_arg .doc-example [data-api-reference]')
    .first();
  await expect(prose).toBeAttached();
  await expect(demo).toBeAttached();
  await expect(
    page.locator('.doc-prose :not(pre) > code [data-api-reference]'),
  ).toHaveCount(0);
  await prose.focus();
  const card = page.locator('#api-reference-card');
  await expect(card).toBeVisible();
  await page.keyboard.press('Tab');
  await expect(card.getByRole('link')).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(prose).toBeFocused();
  await expect(card).toBeHidden();
  await prose.evaluate((element) => (element as HTMLElement).blur());
  await prose.focus();
  await expect(card).toBeVisible();
  await page.locator('h1').last().click({ force: true });
  await expect(card).toBeHidden();
  await demo.focus();
  await expect(card).toBeVisible();
  await demo.evaluate((element) =>
    element.closest('pre')!.dispatchEvent(new Event('scroll')),
  );
  await expect(card).toBeHidden();
});

test('API enhancement preserves split syntax spans, plain code, inline code, and copied text', async ({
  page,
}) => {
  await page.route('**/playground', async (route) => {
    const response = await route.fetch();
    const html = await response.text();
    await route.fulfill({
      response,
      body: html.replace(
        '</main>',
        `<div id="api-fixture"><pre><code><span class="line"><span style="color:rgb(255, 0, 0)">koi::</span><span style="color:rgb(0, 0, 255)">parse</span> koi::parse koi::unknown koi::parse_extra</span></code></pre><pre><code># koi::parse\nprintf 'koi::add_arg'</code></pre><pre>koi::run</pre><code>koi::parse</code></div></main>`,
      ),
    });
  });
  await page.goto('/playground');
  const fixture = page.locator('#api-fixture');
  const codes = fixture.locator('pre code');
  await expect(fixture.locator('[data-api-reference]')).toHaveCount(5);
  await expect(fixture.locator('pre').last().getByRole('link')).toHaveText(
    'koi::run',
  );
  await expect(codes.first()).toHaveText(
    'koi::parse koi::parse koi::unknown koi::parse_extra',
  );
  await expect(codes.nth(1)).toHaveText("# koi::parse\nprintf 'koi::add_arg'");
  await expect(fixture.locator(':scope > code')).toHaveText('koi::parse');
  await expect(fixture.locator(':scope > code a')).toHaveCount(0);
  await expect(
    codes
      .first()
      .locator('[data-api-reference]')
      .first()
      .locator('[style]')
      .last(),
  ).toHaveCSS('color', 'rgb(0, 0, 255)');
  await codes.first().locator('[data-api-reference]').first().focus();
  await expect(page.locator('#api-reference-card')).toContainText(
    'Parse arguments inside a Bash function.',
  );
});

test('regenerated demo code retains API cards without duplicate triggers', async ({
  page,
}) => {
  await page.goto('/docs/guides/help');
  const input = page.locator('[data-builder="help"] [name="name"]');
  await input.fill('new-example');
  const output = page.locator('#doc-guides-help .doc-example');
  await expect(output).toContainText('new-example');
  const triggers = output.locator('[data-api-reference="koi::config"]');
  await expect(triggers.first()).toBeAttached();
  const count = await triggers.count();
  await input.fill('another-example');
  await expect(output).toContainText('another-example');
  await expect(triggers).toHaveCount(count);
  await expect(
    output.locator('[data-api-reference] [data-api-reference]'),
  ).toHaveCount(0);
  await triggers.first().focus();
  await expect(
    page.getByRole('dialog', { name: 'koi::config', exact: true }),
  ).toBeVisible();
});

test('cards remain accessible in both themes and dismiss when their code disappears', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  const trigger = page
    .locator('.hero-terminal [data-api-reference="koi::parse"]')
    .first();
  const card = page.locator('#api-reference-card');
  for (const theme of ['light', 'dark']) {
    await page
      .locator('html')
      .evaluate(
        (element, theme) => element.setAttribute('data-theme', theme),
        theme,
      );
    await trigger.focus();
    await expect(card).toBeVisible();
    await expect(trigger).toHaveAttribute('aria-expanded', 'true');
    await page.keyboard.press('Tab');
    await expect(card.getByRole('link')).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(card.getByRole('region')).toBeFocused();
    await page.keyboard.press('Shift+Tab');
    await expect(card.locator('.cta-arrow-shaft')).toHaveCSS('opacity', '1');
    await expect(card.locator('.cta-arrow-chevron')).toHaveCSS(
      'transform',
      'matrix(1, 0, 0, 1, 12, 0)',
    );
    const report = await new AxeBuilder({ page })
      .include('#api-reference-card')
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze();
    expect(report.violations).toEqual([]);
    await page.keyboard.press('Escape');
    await expect(card).toBeHidden();
    await expect(trigger).toHaveAttribute('aria-expanded', 'false');
    await trigger.evaluate((element) => (element as HTMLElement).blur());
  }
  await trigger.focus();
  await expect(card).toBeVisible();
  await trigger.evaluate((element) => element.remove());
  await expect(card).toBeHidden();
});

test('underlined API names navigate directly, including keyboard and touch activation', async ({
  page,
}, testInfo) => {
  await page.goto('/');
  const trigger = page
    .locator('.hero-terminal [data-api-reference="koi::parse"]')
    .first();
  await expect(trigger).toHaveAttribute('href', '/docs/reference/parse');
  if (testInfo.project.name === 'mobile') await trigger.tap();
  else await trigger.click();
  await expect(page).toHaveURL(/\/docs\/reference\/parse$/);
  const prose = page
    .locator(
      '#doc-reference-parse .doc-prose [data-api-reference="koi::config"]',
    )
    .first();
  await prose.focus();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/docs\/reference\/config$/);
});

test('each card reuses its reference usage with horizontal scrolling and a top-right docs arrow', async ({
  page,
}) => {
  await page.goto('/docs/reference/add_arg');
  for (const name of [
    'add_arg',
    'add_command',
    'add_validator',
    'add_group',
    'add_dependency',
    'parse',
    'config',
    'run',
  ]) {
    const section = page.locator(`#doc-reference-${name}`);
    const source = section
      .locator('.doc-prose .code-block')
      .filter({ has: page.locator('.code-label span', { hasText: /^Usage$/ }) })
      .first();
    const trigger = source.locator('[data-api-reference]').first();
    await trigger.focus();
    const card = page.getByRole('dialog', {
      name: `koi::${name}`,
      exact: true,
    });
    await expect(card).toBeVisible();
    const usage = card.locator('pre');
    await expect(card.locator('.api-reference-usage-label')).toHaveText(
      'USAGE',
    );
    await expect(card.locator('.api-reference-usage-label')).toHaveCSS(
      'font-size',
      '9px',
    );
    await expect(usage).toHaveCSS('font-size', '11px');
    await expect(usage).toHaveText(
      (await source.locator('pre').textContent())!,
    );
    await expect(usage.locator('[style*="--shiki-dark"]')).not.toHaveCount(0);
    await expect(
      card.locator('.code-label, [data-copy-code], [data-api-reference]'),
    ).toHaveCount(0);
    if (name === 'add_arg') {
      expect(
        await usage.evaluate(
          (element) => element.scrollWidth > element.clientWidth,
        ),
      ).toBe(true);
      await usage.evaluate((element) => {
        element.scrollLeft = 100;
      });
      expect(
        await usage.evaluate((element) => element.scrollLeft),
      ).toBeGreaterThan(0);
    }
    const button = await card
      .getByRole('link', { name: 'Docs', exact: true })
      .boundingBox();
    const box = (await card.boundingBox())!;
    expect(
      Math.abs(box.x + box.width - button!.x - button!.width - 19),
    ).toBeLessThan(2);
    expect(button!.y).toBeLessThan((await usage.boundingBox())!.y);
    expect(Math.abs(button!.y - box.y - 19)).toBeLessThan(2);
    await expect(
      card.getByRole('link', { name: 'Docs', exact: true }),
    ).toHaveText('');
  }
});

test('crossing the gap between adjacent API lines and the card keeps the original API', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name === 'mobile', 'Pointer path regression');
  await page.route('**/playground', async (route) => {
    const response = await route.fetch();
    const html = await response.text();
    await route.fulfill({
      response,
      body: html.replace(
        '</main>',
        `<pre id="adjacent-apis" style="position:fixed;top:180px;left:40px;z-index:1;font:14px/22px monospace"><code>koi::add_arg name -o -s n -l name -d 'Who to greet' -D 'world'\nkoi::parse "$@" || return "$koi_status"</code></pre></main>`,
      ),
    });
  });
  await page.goto('/playground');
  const first = page.locator(
    '#adjacent-apis [data-api-reference="koi::add_arg"]',
  );
  const second = page.locator(
    '#adjacent-apis [data-api-reference="koi::parse"]',
  );
  const card = page.getByRole('dialog', { name: 'koi::add_arg', exact: true });
  await first.hover();
  await expect(card).toBeVisible();
  const start = (await first.boundingBox())!;
  const end = (await card.boundingBox())!;
  const x = start.x + start.width / 2;
  await page.mouse.move(x, start.y + start.height + 4, { steps: 6 });
  await page.waitForTimeout(250);
  await expect(card).toBeVisible();
  await page.mouse.move(x, end.y + 20, { steps: 6 });
  await expect(card).toBeVisible();
  await card.getByRole('link', { name: 'Docs', exact: true }).hover();
  await expect(card).toBeVisible();
  await page.mouse.move(10, 100);
  await expect(card).toBeHidden();
  await second.hover();
  await expect(
    page.getByRole('dialog', { name: 'koi::parse', exact: true }),
  ).toBeVisible();
});
