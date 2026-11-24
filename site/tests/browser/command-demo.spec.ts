import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import {
  openCommandTryIt,
  openArgumentTryIt,
  selectCommandHelp,
} from '../fixtures/try-it';

test('command demo has one canonical example, synchronized state, and persistent context', async ({
  page,
}) => {
  await page.goto('/docs/reference/add_command#see-it-in-action');
  const section = page.locator('#doc-reference-add_command');
  const prose = section.locator('.doc-prose');
  const example = section.locator('.doc-example');
  await expect(
    prose.getByRole('heading', { name: 'Sample CLI script' }),
  ).toHaveCount(0);
  await expect(
    prose.getByRole('heading', { name: 'Generated help via -h/--help' }),
  ).toHaveCount(0);
  await expect(prose.locator('[data-explorer="command"]')).toHaveCount(0);
  await expect(
    example.locator('[data-explorer-output="script"] code'),
  ).toHaveCount(1);
  await expect(
    example.locator('[data-explorer-output="help"] code'),
  ).toHaveCount(1);
  await expect(prose.locator('[data-try-it-callout]')).toContainText(
    'Experiment with commands, handlers, and nested subcommands using koi::add_command.',
  );
  const calloutButton = prose.getByRole('button', {
    name: 'Edit',
    exact: true,
  });
  await calloutButton.click();
  const dialog = page.locator('#try-addcommand');
  await expect(
    dialog.getByRole('heading', { name: 'Demo', exact: true }),
  ).toBeFocused();
  await expect(dialog.locator('.try-dialog-title p')).toHaveText(
    'koi::add_command',
  );
  await expect(dialog.locator('.try-dialog-preview p:empty')).toHaveCount(0);
  const pageScript = example.locator('[data-explorer-output="script"] code');
  const pageHelp = example.locator('[data-explorer-output="help"] code');
  const script = dialog.locator('[data-explorer-output="script"] code');
  const help = dialog.locator('[data-explorer-output="help"] code');
  const initial = await script.textContent();
  await selectCommandHelp(dialog, 'app config get -h');
  await expect(help).toContainText('Usage: app config get [-h]');
  await expect(pageHelp).toHaveText((await help.textContent())!);
  await dialog
    .getByRole('button', {
      name: 'Edit app > config > get command',
      exact: true,
    })
    .click();
  await dialog.getByLabel('Command name', { exact: true }).fill('read');
  await dialog
    .getByRole('button', { name: 'Save command', exact: true })
    .click();
  await expect(script).toContainText('koi::add_command read -f config_get');
  await expect(pageScript).toHaveText((await script.textContent())!);
  await expect(pageHelp).toHaveText((await help.textContent())!);
  await expect(help).toContainText('Usage: app config read [-h]');
  await dialog
    .getByRole('button', {
      name: 'Edit app > config > read command',
      exact: true,
    })
    .click();
  await dialog
    .getByLabel('Description', { exact: true })
    .fill('Discard this draft');
  await dialog.getByRole('button', { name: 'Close editor' }).click();
  await expect(calloutButton).toBeFocused();
  await openCommandTryIt(page);
  await expect(dialog.locator('form')).toBeHidden();
  await expect(
    dialog.locator('[data-command-help-selector] .dropdown-trigger'),
  ).toContainText('app config read -h');
  await expect(script).not.toContainText('Discard this draft');
  await expect(help).toContainText('Usage: app config read [-h]');
  await dialog
    .getByRole('button', {
      name: 'Edit app > config > read command',
      exact: true,
    })
    .click();
  await page.keyboard.press('Escape');
  await expect(dialog.locator('form')).toBeHidden();
  await expect(dialog).toBeVisible();
  await dialog.getByRole('button', { name: 'Reset commands' }).click();
  await expect(script).toHaveText(initial!);
  await expect(pageScript).toHaveText(initial!);
  await expect(pageHelp).toContainText('Usage: app [-h] COMMAND');
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(
    example.getByRole('button', { name: 'Edit', exact: true }),
  ).toBeFocused();
});

test('command modal reuses the established layout, footer, and theme behavior', async ({
  page,
  isMobile,
}, testInfo) => {
  await page.goto('/docs/reference/add_command');
  const dialog = await openCommandTryIt(page);
  const note = dialog.locator('.try-dialog-note');
  await expect(note).toContainText('This is a live demo of koi::add_command.');
  await expect(note).not.toContainText('koi::add_arg');
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
  await page.keyboard.press('/');
  await expect(page.locator('#search-dialog')).toBeHidden();
  for (const theme of ['light', 'dark']) {
    await page.evaluate(
      (theme) => (document.documentElement.dataset.theme = theme),
      theme,
    );
    const scan = await new AxeBuilder({ page })
      .include('#try-addcommand')
      .analyze();
    expect(scan.violations).toEqual([]);
    await dialog.screenshot({
      path: testInfo.outputPath(`command-demo-${theme}.png`),
    });
  }
  expect(
    await dialog.evaluate((node) => node.scrollWidth <= node.clientWidth),
  ).toBe(true);
  await dialog
    .locator('.try-dialog-preview [data-api-reference="koi::add_command"]')
    .first()
    .focus();
  await expect(dialog.locator('#api-reference-card')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(dialog.locator('#api-reference-card')).toBeHidden();
  await expect(dialog).toBeVisible();
});

test('command legacy anchors and static example work without JavaScript or duplicate IDs', async ({
  page,
  browser,
}) => {
  for (const fragment of [
    'explore',
    'sample-cli-script',
    'generated-help-via--h--help',
  ]) {
    await page.goto(`/docs/reference/add_command#${fragment}`);
    await expect(
      page.locator(`#doc-reference-add_command [data-fragment="${fragment}"]`),
    ).toBeInViewport();
  }
  const ids = await page
    .locator('[id]')
    .evaluateAll((nodes) => nodes.map((node) => node.id));
  expect(new Set(ids).size).toBe(ids.length);
  const context = await browser.newContext({ javaScriptEnabled: false });
  const plain = await context.newPage();
  await plain.goto('/docs/reference/add_command');
  const section = plain.locator('#doc-reference-add_command');
  await expect(
    section.locator('.doc-example [data-command-sample]'),
  ).toContainText('koi::add_command deploy');
  await expect(section.locator('.doc-prose')).not.toContainText(
    'Sample CLI script',
  );
  await expect(section.locator('[data-open-try]')).toHaveCount(0);
  await expect(section.locator('#try-addcommand')).toBeHidden();
  await context.close();
});

test('argument and command demos retain independent saved state', async ({
  page,
}) => {
  await page.goto('/docs/reference/add_arg');
  const argument = await openArgumentTryIt(page);
  await argument.getByRole('button', { name: 'Edit name argument' }).click();
  await argument.getByLabel('Destination variable').fill('recipient');
  await argument.getByRole('button', { name: 'Save argument' }).click();
  await argument.getByRole('button', { name: 'Close editor' }).click();
  const command = await openCommandTryIt(page);
  await selectCommandHelp(command, 'app config -h');
  await command.getByRole('button', { name: 'Close editor' }).click();
  await openArgumentTryIt(page);
  await expect(
    argument.locator('[data-explorer-output="script"] code'),
  ).toContainText('local recipient');
  await expect(argument.locator('.try-dialog-title p')).toHaveText(
    'koi::add_arg',
  );
  await argument.getByRole('button', { name: 'Close editor' }).click();
  await openCommandTryIt(page);
  await expect(
    command.locator('[data-explorer-output="help"] code'),
  ).toContainText('Usage: app config [-h] [COMMAND]');
});
