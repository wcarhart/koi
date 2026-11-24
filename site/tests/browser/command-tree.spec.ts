import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import {
  openCommandTryIt,
  selectCommandHelp,
  selectCommandParent,
} from '../fixtures/try-it';

test('tree rows edit commands, offer only delete actions, and reparent complete branches', async ({
  page,
}) => {
  await page.goto('/docs/reference/add_command');
  const dialog = await openCommandTryIt(page);
  const tree = dialog.locator('[data-command-tree]');
  await expect(tree.locator('li')).toHaveText([
    'app',
    '├── deploy',
    '└── config',
    '    ├── get',
    '    └── set',
  ]);
  await expect(tree.getByRole('button', { name: /Add child/ })).toHaveCount(0);
  await expect(tree.locator('button')).toHaveCount(8);
  for (const removed of [
    'Select a command to preview its help.',
    'Updates the code and help. No commands are executed.',
    'Each command in this sample has its own handler function.',
  ])
    await expect(dialog).not.toContainText(removed);
  await expect(dialog.locator('[data-invocation]')).toHaveCount(0);
  const help = dialog.locator('[data-explorer-output="help"] code');
  await selectCommandHelp(dialog, 'app config get -h');
  await dialog
    .getByRole('button', { name: 'Edit app > config command', exact: true })
    .click();
  const parent = dialog.locator('.command-parent-picker');
  await parent.getByRole('button', { name: /^Parent command/ }).click();
  await expect(parent.getByRole('option')).toHaveCount(2);
  await expect(
    parent.getByRole('option', { name: 'app > config', exact: true }),
  ).toHaveCount(0);
  await parent
    .getByRole('option', { name: 'app > deploy', exact: true })
    .click();
  await dialog.getByRole('button', { name: 'Save command' }).click();
  await expect(
    tree.getByRole('button', {
      name: 'Edit app > deploy > config > get command',
      exact: true,
    }),
  ).toBeVisible();
  await expect(help).toContainText('Usage: app deploy config get [-h]');
  await dialog
    .getByRole('button', {
      name: 'Edit app > deploy > config > get command',
      exact: true,
    })
    .click();
  await expect(
    parent.getByRole('button', { name: /^Parent command/ }),
  ).toContainText('app > deploy > config');
  await parent.getByRole('button', { name: /^Parent command/ }).click();
  await page.keyboard.press('Escape');
  await expect(dialog.locator('form')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(dialog.locator('form')).toBeHidden();
  await expect(dialog).toBeVisible();
  await tree
    .getByRole('button', {
      name: 'Delete app > deploy command and its children',
      exact: true,
    })
    .click();
  await expect(tree.locator('li')).toHaveText(['app']);
  await expect(help).toContainText('Usage: app [-h]');
  await expect(
    dialog.locator('[data-explorer-output="script"] code'),
  ).toHaveText(
    '#!/usr/bin/env bash\nsource koi\n\nkoi::config name app\n\nkoi::run "$@"',
  );
});

test('Add uses the parent picker and enabled demo flags persist until disabled', async ({
  page,
}) => {
  // Deterministic randomness makes any accidental reroll observable.
  await page.addInitScript(() => {
    let count = 0;
    Math.random = () => (++count % 3) / 3;
  });
  await page.goto('/docs/reference/add_command');
  const dialog = await openCommandTryIt(page);
  await dialog
    .getByRole('button', { name: 'Register a command', exact: true })
    .click();
  await expect(
    dialog.locator('.command-parent-picker .dropdown-trigger'),
  ).toContainText('app');
  await dialog.getByLabel('Command name', { exact: true }).fill('status');
  await selectCommandParent(dialog, 'app > config > get');
  await dialog
    .getByLabel('Handler function', { exact: true })
    .fill('show_status');
  await dialog.getByLabel('Description', { exact: true }).fill('Show status');
  await dialog
    .getByRole('switch', { name: 'Include demo arguments', exact: true })
    .click();
  await dialog.getByRole('button', { name: 'Save command' }).click();
  const script = dialog.locator('[data-explorer-output="script"] code');
  const saved = (await script.textContent())!;
  const flags = saved.match(/koi::add_arg (force|quiet|debug) /g)!;
  expect(flags.length).toBeGreaterThanOrEqual(1);
  expect(flags.length).toBeLessThanOrEqual(3);
  await selectCommandHelp(dialog, 'app config get status -h');
  for (const declaration of flags)
    await expect(
      dialog.locator('[data-explorer-output="help"] code'),
    ).toContainText('--' + declaration.trim().split(' ').at(-1));
  await dialog
    .getByRole('button', {
      name: 'Edit app > config > get > status command',
      exact: true,
    })
    .click();
  await expect(
    dialog.getByRole('switch', { name: 'Include demo arguments', exact: true }),
  ).toHaveAttribute('aria-checked', 'true');
  await dialog.getByRole('button', { name: 'Save command' }).click();
  await expect(script).toHaveText(saved);
  await dialog.getByRole('button', { name: 'Close editor' }).click();
  await openCommandTryIt(page);
  await expect(script).toHaveText(saved);
  await dialog
    .getByRole('button', {
      name: 'Edit app > config > get > status command',
      exact: true,
    })
    .click();
  await dialog
    .getByRole('switch', { name: 'Include demo arguments', exact: true })
    .click();
  await dialog.getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(script).toHaveText(saved);
  await dialog
    .getByRole('button', {
      name: 'Edit app > config > get > status command',
      exact: true,
    })
    .click();
  await dialog
    .getByRole('switch', { name: 'Include demo arguments', exact: true })
    .click();
  await dialog.getByRole('button', { name: 'Save command' }).click();
  await expect(script).not.toContainText('koi::add_arg');
  await expect(
    dialog.locator('[data-explorer-output="help"] code'),
  ).not.toContainText('--force');
});

test('help dropdowns mirror all command paths while row editing leaves the preview selected', async ({
  page,
}) => {
  await page.goto('/docs/reference/add_command');
  const section = page.locator('#doc-reference-add_command');
  const inline = section.locator('.doc-example');
  await selectCommandHelp(inline, 'app config set -h');
  const dialog = await openCommandTryIt(page);
  await expect(
    dialog.locator('[data-command-help-selector] .dropdown-trigger'),
  ).toContainText('app config set -h');
  await dialog
    .locator('[data-command-help-selector]')
    .getByRole('button', { name: /^Help for/ })
    .click();
  await expect(
    dialog.locator('[data-command-help-selector] [role=option]'),
  ).toHaveText([
    'app -h',
    'app deploy -h',
    'app config -h',
    'app config get -h',
    'app config set -h',
  ]);
  await page.keyboard.press('Escape');
  await dialog
    .getByRole('button', { name: 'Edit app > deploy command', exact: true })
    .click();
  await expect(
    dialog.locator('[data-command-help-selector] .dropdown-trigger'),
  ).toContainText('app config set -h');
  await dialog.getByRole('button', { name: 'Cancel', exact: true }).click();
  await dialog.getByRole('button', { name: 'Reset commands' }).click();
  await expect(
    dialog.locator('[data-command-help-selector] .dropdown-trigger'),
  ).toContainText('app -h');
  const ids = await page
    .locator('[id]')
    .evaluateAll((nodes) => nodes.map((node) => node.id));
  expect(new Set(ids).size).toBe(ids.length);
});

test('tree and parent options use theme foreground on hover and keyboard focus', async ({
  page,
  isMobile,
}, testInfo) => {
  await page.goto('/docs/reference/add_command');
  const dialog = await openCommandTryIt(page);
  for (const theme of ['light', 'dark']) {
    await page.evaluate(
      (theme) => (document.documentElement.dataset.theme = theme),
      theme,
    );
    const row = dialog.getByRole('button', {
      name: 'Edit app > deploy command',
      exact: true,
    });
    await page.mouse.move(0, 0);
    await row.evaluate((node) => node.blur());
    const idle = await row.evaluate((node) => getComputedStyle(node).color);
    if (!isMobile) {
      await row.hover();
      await expect(row).not.toHaveCSS('color', idle);
    }
    await row.click();
    const parent = dialog.locator('.command-parent-picker');
    await parent.getByRole('button', { name: /^Parent command/ }).click();
    const option = parent.getByRole('option', {
      name: 'app > config',
      exact: true,
    });
    await page.keyboard.press('Home');
    await page.keyboard.press('ArrowDown');
    await expect(option).toBeFocused();
    await expect(option).toHaveCSS('display', 'block');
    await expect(option).toHaveCSS('padding-top', '10px');
    const foreground = await dialog.evaluate(
      (node) => getComputedStyle(node).color,
    );
    await expect(option).toHaveCSS('color', foreground);
    const scan = await new AxeBuilder({ page })
      .include('#try-addcommand')
      .analyze();
    expect(scan.violations).toEqual([]);
    await dialog.screenshot({
      path: testInfo.outputPath(`tree-parent-${theme}.png`),
    });
    await page.keyboard.press('Escape');
    await dialog.getByRole('button', { name: 'Cancel', exact: true }).click();
    await page.mouse.move(0, 0);
  }
});

test('command row and delete hover fills are mutually exclusive', async ({
  page,
  isMobile,
}) => {
  test.skip(isMobile, 'Hover requires a pointer.');
  await page.goto('/docs/reference/add_command');
  const dialog = await openCommandTryIt(page);
  const edit = dialog.getByRole('button', {
    name: 'Edit app > config > set command',
    exact: true,
  });
  const row = edit.locator('..');
  const remove = row.getByRole('button', {
    name: 'Delete app > config > set command',
    exact: true,
  });
  for (const theme of ['light', 'dark']) {
    await page.evaluate(
      (theme) => (document.documentElement.dataset.theme = theme),
      theme,
    );
    const resting = await remove.evaluate(
      (node) => getComputedStyle(node).backgroundColor,
    );
    await edit.hover();
    expect(
      await row.evaluate(
        (node) => getComputedStyle(node, '::before').backgroundColor,
      ),
    ).not.toBe('rgba(0, 0, 0, 0)');
    await expect(remove).toHaveCSS('background-color', resting);
    const rowBounds = (await row.boundingBox())!;
    const deleteBounds = (await remove.boundingBox())!;
    expect(deleteBounds.x + deleteBounds.width).toBeLessThanOrEqual(
      rowBounds.x + rowBounds.width,
    );
    await remove.hover();
    expect(
      await row.evaluate(
        (node) => getComputedStyle(node, '::before').backgroundColor,
      ),
    ).toBe('rgba(0, 0, 0, 0)');
    await expect(remove).not.toHaveCSS('background-color', resting);
    await edit.hover();
    await expect(remove).toHaveCSS('background-color', resting);
  }
});

test('demo-arguments hint supports hover and focus without toggling the switch', async ({
  page,
  isMobile,
}) => {
  await page.goto('/docs/reference/add_command');
  const dialog = await openCommandTryIt(page);
  await dialog
    .getByRole('button', { name: 'Edit app > deploy command', exact: true })
    .click();
  const toggle = dialog.getByRole('switch', {
    name: 'Include demo arguments',
    exact: true,
  });
  const hint = dialog.getByRole('button', {
    name: 'About Include demo arguments',
    exact: true,
  });
  const tooltip = dialog.getByRole('tooltip');
  await expect(tooltip).toBeHidden();
  if (!isMobile) await hint.hover();
  else await hint.click();
  await expect(tooltip).toBeVisible();
  await expect(tooltip).toHaveText(
    'Configure a few random flag arguments with this command so you can see how the generated help changes.',
  );
  await expect(hint).toHaveCSS('border-radius', '50%');
  await expect(toggle).toHaveAttribute('aria-checked', 'false');
  await page.mouse.move(0, 0);
  await hint.focus();
  await expect(tooltip).toBeVisible();
  await expect(toggle).toHaveAttribute('aria-checked', 'false');
});

test('command handlers may be reused by another command', async ({ page }) => {
  await page.goto('/docs/reference/add_command');
  const dialog = await openCommandTryIt(page);
  await dialog
    .getByRole('button', {
      name: 'Edit app > config > set command',
      exact: true,
    })
    .click();
  await dialog
    .getByLabel('Handler function', { exact: true })
    .fill('config_get');
  await dialog.getByRole('button', { name: 'Save command' }).click();
  await expect(dialog.locator('form')).toBeHidden();
  const script = dialog.locator('[data-explorer-output="script"] code');
  await expect(script).toContainText(
    "koi::add_command set -f config_get -d 'Write configuration'",
  );
  expect((await script.textContent())!.split('config_get() {').length - 1).toBe(
    1,
  );
  await selectCommandHelp(dialog, 'app config set -h');
  await expect(
    dialog.locator('[data-explorer-output="help"] code'),
  ).toContainText('Write configuration');
});

test('a reused branch handler shares its arguments and subcommands', async ({
  page,
}) => {
  await page.goto('/docs/reference/add_command');
  const dialog = await openCommandTryIt(page);
  await dialog
    .getByRole('button', { name: 'Register a command', exact: true })
    .click();
  await dialog.getByLabel('Command name', { exact: true }).fill('settings');
  await dialog.getByLabel('Handler function', { exact: true }).fill('config');
  await dialog
    .getByLabel('Description', { exact: true })
    .fill('Settings alias');
  await dialog.getByRole('button', { name: 'Save command' }).click();
  await expect(
    dialog.getByRole('button', {
      name: 'Edit app > settings > get command',
      exact: true,
    }),
  ).toBeVisible();
  await dialog
    .getByRole('button', {
      name: 'Edit app > settings > get command',
      exact: true,
    })
    .click();
  await dialog.getByLabel('Command name', { exact: true }).fill('read');
  await dialog
    .getByRole('switch', { name: 'Include demo arguments', exact: true })
    .click();
  await dialog.getByRole('button', { name: 'Save command' }).click();
  await expect(
    dialog.getByRole('button', {
      name: 'Edit app > config > read command',
      exact: true,
    }),
  ).toBeVisible();
  await selectCommandHelp(dialog, 'app config read -h');
  const help = (await dialog
    .locator('[data-explorer-output="help"] code')
    .textContent())!;
  await selectCommandHelp(dialog, 'app settings read -h');
  await expect(dialog.locator('[data-explorer-output="help"] code')).toHaveText(
    help.replace('app config read', 'app settings read'),
  );
  await dialog
    .getByRole('button', {
      name: 'Delete app > settings > read command',
      exact: true,
    })
    .click();
  await expect(
    dialog.getByRole('button', {
      name: 'Edit app > config > read command',
      exact: true,
    }),
  ).toHaveCount(0);
});
