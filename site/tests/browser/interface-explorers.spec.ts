import {
  openCommandTryIt,
  openGroupTryIt,
  openDependencyTryIt,
  selectCommandHelp,
  selectCommandParent,
} from '../fixtures/try-it';
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('group explorer updates relationships, enforces membership, and resets', async ({
  page,
}) => {
  await page.goto('/docs/reference/add_group#explore');
  const section = page.locator('#doc-reference-add_group');
  const dialog = await openGroupTryIt(page);
  const explorer = dialog.locator('[data-explorer="group"]');
  const script = section.locator(
    '.doc-example [data-explorer-output="script"] code',
  );
  const help = section.locator(
    '.doc-example [data-explorer-output="help"] code',
  );
  await expect(script).toContainText('koi::add_group --xor json yaml toml');
  await expect(explorer.locator('tbody tr')).toHaveCount(8);
  await expect(explorer.locator('td[data-valid="true"]')).toHaveCount(4);
  await explorer.getByRole('switch', { name: 'Required', exact: true }).click();
  await expect(explorer.locator('td[data-valid="true"]')).toHaveCount(3);
  await explorer.getByRole('button', { name: /Group type/ }).click();
  await explorer.getByRole('option', { name: /^OR —/ }).click();
  const requiredNote = explorer.locator('[data-required-note]');
  const memberNote = explorer.locator('.explorer-members-description');
  await expect(requiredNote).toHaveText('OR groups are always required');
  await expect(requiredNote).toBeVisible();
  const typography = (node: Element) => {
    const style = getComputedStyle(node);
    return [style.fontFamily, style.fontSize, style.lineHeight, style.color];
  };
  expect(await requiredNote.evaluate(typography)).toEqual(
    await memberNote.evaluate(typography),
  );
  const requiredRow = (await explorer
    .getByRole('switch', { name: 'Required', exact: true })
    .locator('..')
    .boundingBox())!;
  const noteBox = (await requiredNote.boundingBox())!;
  expect(noteBox.y - requiredRow.y - requiredRow.height).toBeCloseTo(4, 0);
  const legend = (await explorer
    .locator('.explorer-members legend')
    .boundingBox())!;
  expect(legend.x).toBeCloseTo((await memberNote.boundingBox())!.x, 0);
  await expect(
    explorer.getByRole('switch', { name: 'Required', exact: true }),
  ).toBeDisabled();
  await expect(explorer.locator('td[data-valid="true"]')).toHaveCount(7);
  await expect(help).toContainText('(--json || --yaml || --toml)');
  await explorer.getByRole('button', { name: /Group type/ }).click();
  await explorer.getByRole('option', { name: /AND —/ }).click();
  await expect(requiredNote).toBeHidden();
  await expect(explorer.locator('td[data-valid="true"]')).toHaveCount(1);
  await explorer.getByRole('switch', { name: 'Required', exact: true }).click();
  await expect(explorer.locator('td[data-valid="true"]')).toHaveCount(2);
  await explorer.getByLabel('--toml', { exact: true }).uncheck();
  await expect(explorer.locator('tbody tr')).toHaveCount(4);
  await expect(explorer.getByLabel('--yaml', { exact: true })).toBeDisabled();
  await expect(explorer.getByLabel('--json', { exact: true })).toBeDisabled();
  await expect(explorer.getByLabel('--toml', { exact: true })).toBeEnabled();
  await expect(explorer.locator('[data-member-error]')).toBeEmpty();
  await expect(script).toContainText('koi::add_group --and json yaml');
  await explorer.getByLabel('--toml', { exact: true }).check();
  await expect(explorer.getByRole('checkbox', { disabled: false })).toHaveCount(
    3,
  );
  await explorer.getByLabel('--yaml', { exact: true }).uncheck();
  await expect(explorer.getByLabel('--json', { exact: true })).toBeDisabled();
  await expect(explorer.getByLabel('--toml', { exact: true })).toBeDisabled();
  await expect(explorer.getByLabel('--yaml', { exact: true })).toBeEnabled();
  await explorer.getByRole('button', { name: 'Reset group' }).click();
  await expect(explorer.getByRole('checkbox', { disabled: false })).toHaveCount(
    3,
  );
  await expect(explorer.locator('tbody tr')).toHaveCount(8);
  await expect(explorer.locator('[data-member-error]')).toBeEmpty();
  await expect(script).toContainText('koi::add_group --xor json yaml toml');
});

test('dependency explorer resets prerequisites, excludes the dependent, and previews real output', async ({
  page,
}) => {
  await page.goto('/docs/reference/add_dependency#explore');
  const section = page.locator('#doc-reference-add_dependency');
  const dialog = await openDependencyTryIt(page);
  const explorer = dialog.locator('[data-explorer="dependency"]');
  const script = section.locator(
    '.doc-example [data-explorer-output="script"] code',
  );
  const help = section.locator(
    '.doc-example [data-explorer-output="help"] code',
  );
  const result = explorer.locator('[data-presence-result]');
  await expect(result).toHaveText('upload: 0 token: account:');
  await expect(explorer.getByRole('checkbox')).toHaveCount(2);
  await expect(
    explorer.getByRole('checkbox', { name: '--upload', exact: true }),
  ).toHaveCount(0);
  await explorer.getByRole('switch', { name: 'Supply --upload' }).click();
  await expect(result).toHaveText("app.sh: 'upload' requires 'token'");
  await explorer.getByRole('switch', { name: 'Supply --token' }).click();
  await expect(result).toHaveText("app.sh: 'upload' requires 'account'");
  await explorer.getByRole('switch', { name: 'Supply --account' }).click();
  await expect(result).toHaveText(
    'upload: 1 token: demo-token account: demo-account',
  );
  await expect(explorer.locator('[data-invocation]')).toContainText(
    '--token demo-token --account demo-account',
  );
  await explorer
    .getByRole('checkbox', { name: '--account', exact: true })
    .uncheck();
  await expect(
    explorer.getByRole('checkbox', { name: '--token', exact: true }),
  ).toBeDisabled();
  for (const dependent of ['token', 'account', 'upload']) {
    await explorer.getByRole('button', { name: /Dependent argument/ }).click();
    await expect(explorer.getByRole('option', { disabled: false })).toHaveCount(
      3,
    );
    await explorer
      .getByRole('option', { name: '--' + dependent, exact: true })
      .click();
    await expect(explorer.getByRole('checkbox')).toHaveCount(2);
    await expect(
      explorer.getByRole('checkbox', { name: '--' + dependent, exact: true }),
    ).toHaveCount(0);
    await expect(explorer.getByRole('checkbox', { checked: true })).toHaveCount(
      2,
    );
    await expect(
      explorer.getByRole('checkbox', { disabled: false }),
    ).toHaveCount(2);
    const others = ['upload', 'token', 'account'].filter(
      (arg) => arg !== dependent,
    );
    await expect(script).toContainText(
      `koi::add_dependency ${dependent} --requires ${others.join(' ')}`,
    );
    await expect(help).toContainText(
      `--${dependent} requires --${others.join(' and --')}`,
    );
    await explorer
      .getByRole('checkbox', { name: '--' + others[1], exact: true })
      .uncheck();
    await expect(
      explorer.getByRole('checkbox', { name: '--' + others[0], exact: true }),
    ).toBeDisabled();
    await expect(explorer.locator('[data-member-error]')).toBeEmpty();
  }
  // Reselecting the same dependent resets both prerequisites too.
  await explorer.getByRole('button', { name: /Dependent argument/ }).click();
  await explorer.getByRole('option', { name: '--upload', exact: true }).click();
  await expect(explorer.getByRole('checkbox', { checked: true })).toHaveCount(
    2,
  );
  await explorer.getByRole('button', { name: 'Reset dependency' }).click();
  await expect(script).toContainText(
    'koi::add_dependency upload --requires token account',
  );
  await expect(explorer.getByRole('checkbox', { checked: true })).toHaveCount(
    2,
  );
  await expect(result).toHaveText('upload: 0 token: account:');
  await expect(
    explorer.getByRole('switch', { name: 'Supply --token' }),
  ).toHaveAttribute('aria-checked', 'false');
});

test('command tree supports nested edits, validation, cancellation, removal and context help', async ({
  page,
}) => {
  await page.goto('/docs/reference/add_command#explore');
  const dialog = await openCommandTryIt(page);
  const explorer = dialog.locator('[data-explorer="command"]');
  const script = dialog.locator('[data-explorer-output="script"] code');
  const help = dialog.locator('[data-explorer-output="help"] code');
  await selectCommandHelp(dialog, 'app config -h');
  await expect(help).toContainText('Usage: app config [-h] [COMMAND]');
  await explorer
    .getByRole('button', { name: 'Register a command', exact: true })
    .click();
  await explorer.getByRole('button', { name: 'Save command' }).click();
  await expect(
    explorer.getByLabel('Command name', { exact: true }),
  ).toHaveAttribute('aria-invalid', 'true');
  await selectCommandParent(dialog, 'app > config');
  await explorer.getByLabel('Command name', { exact: true }).fill('get');
  await explorer
    .getByLabel('Handler function', { exact: true })
    .fill('config_get');
  await explorer.getByLabel('Description', { exact: true }).fill('New command');
  await explorer.getByRole('button', { name: 'Save command' }).click();
  await expect(
    explorer.getByLabel('Command name', { exact: true }),
  ).toHaveAttribute('aria-invalid', 'true');
  await explorer.getByLabel('Command name', { exact: true }).fill('list');
  await explorer
    .getByLabel('Handler function', { exact: true })
    .fill('config_list');
  await explorer.getByRole('button', { name: 'Save command' }).click();
  await expect(
    explorer.getByRole('button', {
      name: 'Edit app > config > list command',
      exact: true,
    }),
  ).toBeFocused();
  await selectCommandHelp(dialog, 'app config list -h');
  await expect(help).toContainText('Usage: app config list [-h]');
  await expect(script).toContainText(
    "koi::add_command list -f config_list -d 'New command'",
  );
  await explorer
    .getByRole('button', { name: 'Edit app > config command', exact: true })
    .click();
  await explorer.getByLabel('Command name', { exact: true }).fill('settings');
  await explorer.getByRole('button', { name: 'Save command' }).click();
  await expect(help).toContainText('Usage: app settings list [-h]');
  await expect(explorer.locator('[data-invocation]')).toHaveCount(0);
  await explorer
    .getByRole('button', {
      name: 'Edit app > settings > list command',
      exact: true,
    })
    .click();
  await explorer
    .getByLabel('Description', { exact: true })
    .fill('Discard this');
  await page.keyboard.press('Escape');
  await expect(script).not.toContainText('Discard this');
  await explorer
    .getByRole('button', {
      name: 'Delete app > settings command and its children',
      exact: true,
    })
    .click();
  await expect(help).toContainText('Usage: app [-h] COMMAND');
  await expect(script).not.toContainText('config_list');
  await explorer.getByRole('button', { name: 'Reset commands' }).click();
  await expect(
    explorer.getByRole('button', {
      name: 'Edit app > config command',
      exact: true,
    }),
  ).toHaveCount(1);
});

for (const kind of ['group', 'dependency', 'command']) {
  test(`${kind} explorer is accessible, responsive, and shares argument styles`, async ({
    page,
  }, testInfo) => {
    await page.goto(`/docs/reference/add_${kind}#explore`);
    if (kind === 'command') await openCommandTryIt(page);
    if (kind === 'group') await openGroupTryIt(page);
    if (kind === 'dependency') await openDependencyTryIt(page);
    const explorer = page.locator(`[data-explorer="${kind}"]`);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    for (const theme of ['light', 'dark']) {
      await page.evaluate(
        (theme) => (document.documentElement.dataset.theme = theme),
        theme,
      );
      await explorer.scrollIntoViewIfNeeded();
      const scan = await new AxeBuilder({ page })
        .include(`[data-explorer="${kind}"]`)
        .analyze();
      expect(scan.violations).toEqual([]);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      const argument = page.locator('[data-argument-explorer] [data-reset]');
      const properties = (element: Element) => {
        const style = getComputedStyle(element);
        return [
          style.borderRadius,
          style.padding,
          style.backgroundColor,
          style.borderTopColor,
        ];
      };
      expect(
        await explorer.locator('[data-reset]').evaluate(properties),
      ).toEqual(await argument.evaluate(properties));
      await explorer.screenshot({
        path: testInfo.outputPath(`${kind}-${theme}.png`),
      });
    }
  });
}

test('explorers stay independent and update copyable previews', async ({
  page,
  context,
  isMobile,
}) => {
  await page.goto('/docs/reference/add_group#explore');
  const groupDialog = await openGroupTryIt(page);
  const group = page.locator('[data-explorer="group"]');
  const dependency = page.locator('[data-explorer="dependency"]');
  const dependencyScript = page
    .locator('[data-dependency-sample] code')
    .first();
  const before = await dependencyScript.textContent();
  await group.getByRole('switch', { name: 'Required', exact: true }).click();
  expect(await dependencyScript.textContent()).toBe(before);
  await groupDialog.getByRole('button', { name: 'Close editor' }).click();
  await openCommandTryIt(page);
  await selectCommandHelp(page.locator('#try-addcommand'), 'app config get -h');
  await expect(
    dependency.locator('[data-switch="present-upload"]'),
  ).toHaveAttribute('aria-checked', 'false');
  if (!isMobile) {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    const sample = page.locator('#try-addcommand [data-command-sample]');
    const copy = sample
      .locator('.code-block')
      .first()
      .getByRole('button', { name: /Copy/ });
    await copy.click();
    expect(await page.evaluate(() => navigator.clipboard.readText())).toContain(
      'koi::add_command config',
    );
  }
});
