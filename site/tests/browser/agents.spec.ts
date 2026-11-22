import { agentPrompt } from '../../src/lib/agent-guidance';
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const source = agentPrompt;

test('homepage and shared navigation expose the agent guidance destinations', async ({
  page,
}) => {
  await page.goto('/');
  const heroLink = page.locator('.hero-agent-link');
  await expect(heroLink).toHaveText('LLM? Read llms.txt');
  await expect(
    heroLink.getByRole('link', { name: 'llms.txt' }),
  ).toHaveAttribute('href', '/llms.txt');
  const actions = page.locator('.header-actions');
  expect(
    await actions
      .locator('a,button')
      .evaluateAll((nodes) =>
        nodes.map((node) => node.getAttribute('aria-label')),
      ),
  ).toEqual([
    'GitHub repository',
    'See agent guidance',
    expect.stringMatching(/^Switch to .* mode$/),
  ]);
  const guidance = page.getByRole('link', {
    name: 'See agent guidance',
    exact: true,
  });
  await expect(guidance.locator('svg')).toHaveAttribute('fill', 'currentColor');
  await expect(guidance.locator('svg path')).toHaveCount(1);
  await guidance.click();
  await expect(page).toHaveURL('/agents');
  await expect(
    page.getByRole('heading', { name: 'Koi for agents', exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole('link', { name: 'llms.txt', exact: true }).first(),
  ).toHaveAttribute('href', '/llms.txt');
  expect(
    await page.evaluate(
      () =>
        document.documentElement.scrollWidth <=
        document.documentElement.clientWidth,
    ),
  ).toBe(true);
});

test('agent tooltip appears on hover and focus and dismisses with Escape', async ({
  page,
}) => {
  await page.goto('/');
  const link = page.getByRole('link', {
    name: 'See agent guidance',
    exact: true,
  });
  const tooltip = page.getByRole('tooltip');
  await link.hover();
  await expect(tooltip).toHaveText('See agent guidance');
  await expect(tooltip).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(tooltip).not.toBeVisible();
  await page.mouse.move(0, 0);
  await link.focus();
  await expect(tooltip).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(tooltip).not.toBeVisible();
  await page.keyboard.press('Tab');
  await expect(
    page.getByRole('button', { name: /Switch to .* mode/ }),
  ).toBeFocused();
});

test('agent page copies the project prompt and exposes a separate documentation index', async ({
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
  await page.goto('/agents');
  const code = page.locator('.agent-guidance-block code');
  expect(await code.textContent()).toBe(source);
  const raw = await page.request.get('/llms.txt');
  expect(raw.status()).toBe(200);
  expect(raw.headers()['content-type']).toContain('text/plain');
  expect(await raw.text()).toContain('# Koi\n');
  expect(await raw.text()).not.toBe(source);
  const button = page.getByRole('button', { name: 'Copy agent guidance' });
  await button.click();
  await expect(button).toHaveAttribute('data-copy-state', 'success');
  expect(
    await page.evaluate(() => (window as unknown as { copied: string }).copied),
  ).toBe(source);
  await expect(button).not.toHaveAttribute('data-copy-state', 'success');
  await page.evaluate(() => {
    navigator.clipboard.writeText = async () => {
      throw new Error('denied');
    };
  });
  await button.click();
  await expect(button).toHaveAttribute('data-copy-state', 'error');
  await expect(page.locator('#announcement')).toContainText('Copy failed');
  const sitemap = await page.request.get('/sitemap.xml');
  expect(await sitemap.text()).toContain('https://koishell.com/agents');
});

test('agent page and tooltip are accessible in light and dark themes', async ({
  page,
}) => {
  for (const theme of ['light', 'dark'] as const) {
    await page.emulateMedia({ colorScheme: theme });
    await page.goto('/agents');
    await page.evaluate(() => document.fonts.ready);
    await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
    await page.mouse.move(0, 0);
    const idleColor = await page
      .getByRole('navigation', { name: 'Main navigation' })
      .getByRole('link', { name: 'Install', exact: true })
      .evaluate((node) => getComputedStyle(node).color);
    const accentColor = await page.evaluate(() => {
      const probe = document.createElement('span');
      probe.style.color = 'var(--accent)';
      document.body.append(probe);
      const color = getComputedStyle(probe).color;
      probe.remove();
      return color;
    });
    for (const label of ['GitHub repository', 'See agent guidance']) {
      const icon = page
        .locator('.header-actions')
        .getByRole('link', { name: label, exact: true });
      await expect(icon).toHaveCSS('color', idleColor);
      await expect(icon.locator('svg')).toHaveCSS('fill', idleColor);
      await icon.hover();
      await expect(icon).toHaveCSS('color', accentColor);
      await expect(icon.locator('svg')).toHaveCSS('fill', accentColor);
      await page.mouse.move(0, 0);
      await icon.focus();
      await expect(icon).toHaveCSS('color', idleColor);
      await icon.blur();
    }
    const report = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze();
    expect(
      report.violations.map((v) => ({
        id: v.id,
        targets: v.nodes.map((n) => n.target),
      })),
    ).toEqual([]);
    await page
      .getByRole('link', { name: 'See agent guidance', exact: true })
      .focus();
    const tooltip = page.getByRole('tooltip');
    await expect(tooltip).toBeVisible();
    const box = (await tooltip.boundingBox())!;
    const width = await page.evaluate(
      () => document.documentElement.clientWidth,
    );
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(width);
    await page.keyboard.press('Escape');
    expect(
      await page.evaluate(
        () =>
          document.documentElement.scrollWidth <=
          document.documentElement.clientWidth,
      ),
    ).toBe(true);
  }
});

test('agent guidance is readable without JavaScript', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto('/agents');
  await expect(
    page.getByRole('heading', { name: 'Koi for agents' }),
  ).toBeVisible();
  expect(await page.locator('.agent-guidance-block code').textContent()).toBe(
    source,
  );
  await expect(
    page.getByRole('button', { name: 'Copy agent guidance' }),
  ).not.toBeVisible();
  await page
    .getByRole('link', { name: 'llms.txt', exact: true })
    .first()
    .click();
  await expect(page).toHaveURL('/llms.txt');
  await expect(page.locator('body')).toContainText('# Koi');
  await context.close();
});

test('hero places actions before a themed skill command with agent icons and inline copying', async ({
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
  for (const colorScheme of ['light', 'dark'] as const) {
    await page.emulateMedia({ colorScheme });
    await page.goto('/');
    await page.evaluate(() => document.fonts.ready);
    const install = page.locator('.hero-actions > .install-box');
    const buttons = page.locator('.hero-actions > .button-row');
    const skill = page.locator('.hero-skill-box');
    const installBounds = (await install.boundingBox())!;
    const buttonsBounds = (await buttons.boundingBox())!;
    const skillBounds = (await skill.boundingBox())!;
    const guidanceBounds = (await page
      .locator('.agent-skill-install')
      .boundingBox())!;
    expect(
      buttonsBounds.y - installBounds.y - installBounds.height,
    ).toBeCloseTo(12, 0);
    expect(
      guidanceBounds.y - buttonsBounds.y - buttonsBounds.height,
    ).toBeCloseTo(72, 0);
    expect(buttonsBounds.y).toBeGreaterThanOrEqual(
      installBounds.y + installBounds.height,
    );
    expect(skillBounds.y).toBeGreaterThan(
      buttonsBounds.y + buttonsBounds.height,
    );
    await expect(page.locator('.agent-skill-install > span')).toHaveText(
      'Using agents? See agent guidance',
    );
    await expect(
      page
        .locator('.agent-skill-install')
        .getByRole('link', { name: 'agent guidance' }),
    ).toHaveAttribute('href', '/agents');
    for (const name of [
      'Codex',
      'Claude Code',
      'OpenCode',
      'Cursor',
      'GitHub Copilot',
      'Antigravity',
      'Goose',
    ]) {
      await expect(skill.getByRole('img', { name, exact: true })).toBeVisible();
    }
    const installColor = await install.evaluate(
      (node) => getComputedStyle(node).backgroundColor,
    );
    await expect(skill).toHaveCSS('background-color', installColor);
    const copy = skill.getByRole('button', {
      name: 'Copy skill install command',
    });
    await page.mouse.move(0, 0);
    const installCopy = install.locator(
      '.install-panel:not([hidden]) .copy-button',
    );
    await expect(copy).toHaveCSS(
      'color',
      await installCopy.evaluate((node) => getComputedStyle(node).color),
    );
    const command = skill.locator('pre');
    await copy.scrollIntoViewIfNeeded();
    const commandBounds = (await command.boundingBox())!;
    const copyBounds = (await copy.boundingBox())!;
    expect(
      Math.abs(
        commandBounds.y +
          commandBounds.height / 2 -
          copyBounds.y -
          copyBounds.height / 2,
      ),
    ).toBeLessThan(1);
    await copy.click();
    expect(
      await page.evaluate(
        () => (window as unknown as { copied: string }).copied,
      ),
    ).toBe('npx skills add wcarhart/koi --skill koi -g');
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
});
