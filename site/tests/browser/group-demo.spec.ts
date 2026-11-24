import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { openGroupTryIt } from '../fixtures/try-it';

test('group demo keeps one page example and synchronizes persistent settings with the modal', async ({
  page,
}) => {
  await page.goto('/docs/reference/add_group#see-it-in-action');
  const section = page.locator('#doc-reference-add_group');
  const prose = section.locator('.doc-prose');
  const example = section.locator('.doc-example');
  await expect(
    prose.getByRole('heading', { name: 'Example', exact: true }),
  ).toHaveCount(0);
  await expect(prose.locator('[data-explorer="group"]')).toHaveCount(0);
  await expect(prose.locator('[data-group-sample]')).toHaveCount(0);
  await expect(prose.locator('[data-try-it-callout]')).toContainText(
    'Experiment with argument groups and accepted combinations using koi::add_group.',
  );
  const calloutButton = prose.getByRole('button', {
    name: 'Edit',
    exact: true,
  });
  await calloutButton.click();
  const dialog = page.locator('#try-addgroup');
  await expect(
    dialog.getByRole('heading', { name: 'Demo', exact: true }),
  ).toBeFocused();
  await expect(dialog.locator('.try-dialog-title p')).toHaveText(
    'koi::add_group',
  );
  const script = dialog.locator('[data-explorer-output="script"] code');
  const help = dialog.locator('[data-explorer-output="help"] code');
  const pageScript = example.locator('[data-explorer-output="script"] code');
  const pageHelp = example.locator('[data-explorer-output="help"] code');
  await expect(pageScript).toHaveCount(1);
  await expect(pageHelp).toHaveCount(1);
  const initial = (await script.textContent())!;
  await dialog.getByRole('switch', { name: 'Required', exact: true }).click();
  await expect(script).toContainText(
    'koi::add_group --xor --required json yaml toml',
  );
  await expect(pageScript).toHaveText((await script.textContent())!);
  await expect(pageHelp).toHaveText((await help.textContent())!);
  await dialog.getByRole('button', { name: 'Close editor' }).click();
  await expect(calloutButton).toBeFocused();
  await openGroupTryIt(page);
  await expect(
    dialog.getByRole('switch', { name: 'Required', exact: true }),
  ).toHaveAttribute('aria-checked', 'true');
  const dropdown = dialog.getByRole('button', { name: /Group type/ });
  await dropdown.click();
  await page.keyboard.press('Escape');
  await expect(dropdown).toHaveAttribute('aria-expanded', 'false');
  await expect(dialog).toBeVisible();
  await expect(dropdown).toBeFocused();
  await dropdown.click();
  await dialog.getByRole('button', { name: 'Close editor' }).click();
  await openGroupTryIt(page);
  await expect(dropdown).toHaveAttribute('aria-expanded', 'false');
  await dialog.getByRole('button', { name: 'Reset group' }).click();
  await expect(script).toHaveText(initial);
  await expect(pageScript).toHaveText(initial);
  await expect(pageHelp).toHaveText((await help.textContent())!);
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(
    example.getByRole('button', { name: 'Edit', exact: true }),
  ).toBeFocused();
});

test('group modal reuses the shared layout and footer in both themes', async ({
  page,
  isMobile,
}, testInfo) => {
  await page.goto('/docs/reference/add_group');
  const dialog = await openGroupTryIt(page);
  const heading = dialog.locator('.builder-heading');
  const title = (await heading.locator('.argument-subtitle').boundingBox())!;
  const subtitle = (await heading
    .locator('.explorer-heading-subtitle')
    .boundingBox())!;
  const reset = (await heading
    .getByRole('button', { name: 'Reset group' })
    .boundingBox())!;
  const firstField = (await dialog
    .locator('#explorer-group-type-label')
    .boundingBox())!;
  expect(subtitle.y - title.y - title.height).toBeCloseTo(4, 0);
  expect(subtitle.y).toBeLessThan(reset.y + reset.height);
  expect(subtitle.x + subtitle.width).toBeLessThan(reset.x);
  expect(firstField.y - subtitle.y - subtitle.height).toBeGreaterThanOrEqual(
    24,
  );
  await expect(dialog.locator('.explorer-members-description')).toHaveText(
    'Groups must have at least two members',
  );
  await expect(dialog.locator('[data-rule-summary], caption')).toHaveCount(0);
  await expect(dialog).not.toContainText(
    'Updates the code and help. No commands are executed.',
  );
  const note = dialog.locator('.try-dialog-note');
  await expect(note).toContainText('This is a live demo of koi::add_group.');
  await expect(
    note.getByRole('link', { name: 'the terminal', exact: true }),
  ).toHaveAttribute('href', '/playground');
  expect((await note.textContent())!.trim().endsWith('.')).toBe(false);
  await expect(note.locator('img.koi-mark-light')).toHaveAttribute(
    'src',
    '/brand/koi-grid.svg',
  );
  const left = (await dialog.locator('.try-dialog-controller').boundingBox())!;
  const right = (await dialog.locator('.try-dialog-preview').boundingBox())!;
  if (isMobile)
    expect(right.y).toBeGreaterThanOrEqual(left.y + left.height - 1);
  else expect(right.x).toBeGreaterThanOrEqual(left.x + left.width - 1);
  for (const theme of ['light', 'dark']) {
    await page.evaluate(
      (theme) => (document.documentElement.dataset.theme = theme),
      theme,
    );
    const scan = await new AxeBuilder({ page })
      .include('#try-addgroup')
      .analyze();
    expect(scan.violations).toEqual([]);
    expect(
      await dialog.evaluate((node) => node.scrollWidth <= node.clientWidth),
    ).toBe(true);
    await dialog.screenshot({
      path: testInfo.outputPath(`group-demo-${theme}.png`),
    });
  }
  // Capture clipboard writes without depending on platform clipboard permissions.
  await page.evaluate(() =>
    Object.defineProperty(navigator, 'clipboard', {
      value: {
        writeText: async (text: string) => {
          document.body.dataset.groupCopied = text;
        },
      },
    }),
  );
  await dialog
    .locator('[data-explorer-output="script"] [data-copy-code]')
    .click();
  await expect
    .poll(() => page.evaluate(() => document.body.dataset.groupCopied))
    .toContain('koi::add_group --xor');
});

test('single-pipe OR formatting updates both previews, persists, and resets without changing group rules', async ({
  page,
}) => {
  await page.goto('/docs/reference/add_group');
  const dialog = await openGroupTryIt(page);
  const section = page.locator('#doc-reference-add_group');
  const toggle = dialog.getByRole('switch', {
    name: 'Use | for OR groups',
    exact: true,
  });
  const script = dialog.locator('[data-explorer-output="script"] code');
  const help = dialog.locator('[data-explorer-output="help"] code');
  const selectType = async (type: string) => {
    await dialog.getByRole('button', { name: /Group type/ }).click();
    await dialog
      .getByRole('option', { name: new RegExp(`^${type} —`) })
      .click();
  };
  await expect(toggle).toHaveAttribute('aria-checked', 'false');
  await expect(
    dialog.locator('#explorer-group-single-pipe-label code'),
  ).toHaveText('|');
  await selectType('OR');
  const results = await dialog.locator('td[data-valid]').allTextContents();
  await expect(help).toContainText('(--json || --yaml || --toml)');
  await toggle.focus();
  await page.keyboard.press('Space');
  await expect(toggle).toHaveAttribute('aria-checked', 'true');
  await expect(help).toContainText('(--json | --yaml | --toml)');
  await expect(script).toContainText(
    '    koi::config use-single-pipe-for-or-groups true',
  );
  expect(
    (await script.textContent())!.indexOf(
      'koi::config use-single-pipe-for-or-groups true',
    ),
  ).toBeGreaterThan((await script.textContent())!.indexOf('main() {'));
  expect(await dialog.locator('td[data-valid]').allTextContents()).toEqual(
    results,
  );
  await expect(
    section.locator('.doc-example [data-explorer-output="script"] code'),
  ).toHaveText((await script.textContent())!);
  await expect(
    section.locator('.doc-example [data-explorer-output="help"] code'),
  ).toHaveText((await help.textContent())!);
  await dialog.getByRole('button', { name: 'Close editor' }).click();
  await openGroupTryIt(page);
  await expect(toggle).toHaveAttribute('aria-checked', 'true');
  await selectType('AND');
  await expect(help).toContainText('(--json & --yaml & --toml)');
  await selectType('OR');
  await expect(help).toContainText('(--json | --yaml | --toml)');
  await toggle.click();
  await expect(help).toContainText('(--json || --yaml || --toml)');
  await expect(script).not.toContainText('use-single-pipe-for-or-groups');
  await toggle.click();
  await dialog.getByRole('button', { name: 'Reset group' }).click();
  await expect(toggle).toHaveAttribute('aria-checked', 'false');
  await expect(script).not.toContainText('use-single-pipe-for-or-groups');
  await selectType('OR');
  await expect(help).toContainText('(--json || --yaml || --toml)');
});

test('group legacy links and static examples survive without duplicate IDs', async ({
  page,
  browser,
}) => {
  for (const fragment of ['explore', 'example', 'see-it-in-action']) {
    await page.goto(`/docs/reference/add_group#${fragment}`);
    await expect(
      page.locator(`#doc-reference-add_group [data-fragment="${fragment}"]`),
    ).toBeInViewport();
  }
  const ids = await page
    .locator('[id]')
    .evaluateAll((nodes) => nodes.map((node) => node.id));
  expect(new Set(ids).size).toBe(ids.length);
  const context = await browser.newContext({ javaScriptEnabled: false });
  const plain = await context.newPage();
  await plain.goto('/docs/reference/add_group');
  const section = plain.locator('#doc-reference-add_group');
  await expect(
    section
      .locator('.doc-prose')
      .getByRole('heading', { name: 'Example', exact: true }),
  ).toHaveCount(0);
  await expect(section.locator('.doc-example')).toContainText(
    'koi::add_group --xor json yaml toml',
  );
  await expect(section.locator('.doc-example')).toContainText('Usage:');
  await expect(section.locator('[data-open-try]')).toHaveCount(0);
  await expect(section.locator('#try-addgroup')).toBeHidden();
  await context.close();
});
