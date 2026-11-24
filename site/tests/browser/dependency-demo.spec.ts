import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { openDependencyTryIt, openGroupTryIt } from '../fixtures/try-it';

test('dependency demo synchronizes its single page example and preserves state across both entry points', async ({
  page,
}) => {
  await page.goto('/docs/reference/add_dependency#see-it-in-action');
  const section = page.locator('#doc-reference-add_dependency');
  const prose = section.locator('.doc-prose');
  const example = section.locator('.doc-example');
  await expect(
    prose.locator('[data-explorer="dependency"], [data-dependency-sample]'),
  ).toHaveCount(0);
  await expect(prose.locator('[data-try-it-callout]')).toContainText(
    'Experiment with dependent arguments and prerequisites using koi::add_dependency.',
  );
  const callout = prose.getByRole('button', { name: 'Edit', exact: true });
  await callout.click();
  const dialog = page.locator('#try-adddependency');
  await expect(
    dialog.getByRole('heading', { name: 'Demo', exact: true }),
  ).toBeFocused();
  await expect(dialog.locator('.try-dialog-title p')).toHaveText(
    'koi::add_dependency',
  );
  const script = dialog.locator('[data-explorer-output="script"] code');
  const help = dialog.locator('[data-explorer-output="help"] code');
  const pageScript = example.locator('[data-explorer-output="script"] code');
  const pageHelp = example.locator('[data-explorer-output="help"] code');
  await expect(pageScript).toHaveCount(1);
  await expect(pageHelp).toHaveCount(1);
  const initial = (await script.textContent())!;
  await dialog.getByRole('button', { name: /Dependent argument/ }).click();
  await dialog.getByRole('option', { name: '--token', exact: true }).click();
  await dialog.getByRole('switch', { name: 'Supply --token' }).click();
  await expect(script).toContainText(
    'koi::add_dependency token --requires upload account',
  );
  await expect(dialog.locator('[data-presence-result]')).toHaveText(
    "app.sh: 'token' requires 'upload'",
  );
  await expect(pageScript).toHaveText((await script.textContent())!);
  await expect(pageHelp).toHaveText((await help.textContent())!);
  await dialog.getByRole('button', { name: 'Close editor' }).click();
  await expect(callout).toBeFocused();
  const group = await openGroupTryIt(page);
  await expect(
    group.locator('[data-explorer-output="script"] code'),
  ).toContainText('koi::add_group --xor json yaml toml');
  await group.getByRole('button', { name: 'Close editor' }).click();
  await openDependencyTryIt(page);
  await expect(dialog.locator('[data-presence-result]')).toHaveText(
    "app.sh: 'token' requires 'upload'",
  );
  await expect(
    dialog.getByRole('switch', { name: 'Supply --token' }),
  ).toHaveAttribute('aria-checked', 'true');
  const dropdown = dialog.getByRole('button', { name: /Dependent argument/ });
  await dropdown.click();
  await page.keyboard.press('Escape');
  await expect(dropdown).toBeFocused();
  await expect(dialog).toBeVisible();
  await dropdown.click();
  await dialog.getByRole('button', { name: 'Close editor' }).click();
  await openDependencyTryIt(page);
  await expect(dropdown).toHaveAttribute('aria-expanded', 'false');
  await dialog.getByRole('button', { name: 'Reset dependency' }).click();
  await expect(script).toHaveText(initial);
  await expect(pageScript).toHaveText(initial);
  await expect(dialog.locator('[data-presence-result]')).toHaveText(
    'upload: 0 token: account:',
  );
  await expect(
    dialog.getByRole('switch', { name: 'Supply --token' }),
  ).toHaveAttribute('aria-checked', 'false');
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(
    example.getByRole('button', { name: 'Edit', exact: true }),
  ).toBeFocused();
});

test('dependency modal shares the group layout, helper styling, footer, and shell output', async ({
  page,
  isMobile,
}, testInfo) => {
  await page.goto('/docs/reference/add_dependency');
  const dialog = await openDependencyTryIt(page);
  const heading = dialog.locator('.builder-heading');
  await expect(heading.locator('.explorer-heading-subtitle')).toHaveText(
    'Choose which arguments require other arguments.',
  );
  const title = (await heading.locator('.argument-subtitle').boundingBox())!;
  const subtitle = (await heading
    .locator('.explorer-heading-subtitle')
    .boundingBox())!;
  const reset = (await heading
    .getByRole('button', { name: 'Reset dependency' })
    .boundingBox())!;
  expect(subtitle.y - title.y - title.height).toBeCloseTo(4, 0);
  expect(subtitle.y).toBeLessThan(reset.y + reset.height);
  const memberNote = dialog.locator('.explorer-members-description');
  await expect(memberNote).toHaveText(
    'Dependencies must have at least one prerequisite',
  );
  expect(
    (await dialog.locator('.explorer-members legend').boundingBox())!.x,
  ).toBeCloseTo((await memberNote.boundingBox())!.x, 0);
  await expect(dialog).not.toContainText(
    'Updates the code and help. No commands are executed.',
  );
  const helper = dialog
    .locator('.explorer-description')
    .filter({ hasText: 'Toggle which arguments are explicitly supplied' });
  const previewHeading = dialog.getByRole('heading', {
    name: 'Preview',
    exact: true,
  });
  const previewBox = (await previewHeading.boundingBox())!;
  expect(
    (await helper.boundingBox())!.y - previewBox.y - previewBox.height,
  ).toBeCloseTo(4, 0);
  expect(
    await helper.evaluate((node) => getComputedStyle(node).fontFamily),
  ).toBe(
    await memberNote.evaluate((node) => getComputedStyle(node).fontFamily),
  );
  const note = dialog.locator('.try-dialog-note');
  await expect(note).toContainText(
    'This is a live demo of koi::add_dependency.',
  );
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
  await dialog
    .getByRole('checkbox', { name: '--account', exact: true })
    .uncheck();
  await expect(
    dialog.getByRole('checkbox', { name: '--token', exact: true }),
  ).toBeDisabled();
  await dialog.getByRole('button', { name: /Dependent argument/ }).click();
  await expect(dialog.getByRole('option', { disabled: false })).toHaveCount(3);
  await page.keyboard.press('Home');
  await page.keyboard.press('ArrowDown');
  await expect(
    dialog.getByRole('option', { name: '--token', exact: true }),
  ).toBeFocused();
  await page.keyboard.press('Escape');
  const shell = dialog.locator('[data-explorer-shell]');
  const output = shell.locator('[data-presence-result]');
  await expect(shell.locator('.explorer-shell-prompt')).toHaveText('$');
  const switchSpelling = dialog.locator(
    '#explorer-dependency-present-upload-label .argument-spelling',
  );
  expect(
    await switchSpelling.evaluate((node) => getComputedStyle(node).fontFamily),
  ).toContain('Monaspace');
  for (const theme of ['light', 'dark']) {
    await page.evaluate(
      (theme) => (document.documentElement.dataset.theme = theme),
      theme,
    );
    expect(
      (await new AxeBuilder({ page }).include('#try-adddependency').analyze())
        .violations,
    ).toEqual([]);
    expect(
      await dialog.evaluate((node) => node.scrollWidth <= node.clientWidth),
    ).toBe(true);
    const inputColor = await shell
      .locator('.explorer-shell-command')
      .evaluate((node) => getComputedStyle(node).color);
    expect(inputColor).toBe(
      theme === 'dark' ? 'rgb(255, 255, 255)' : 'rgb(46, 36, 53)',
    );
    const validBorder = await shell.evaluate(
      (node) => getComputedStyle(node).borderColor,
    );
    await expect(shell).toHaveAttribute('data-valid', 'true');
    await expect(output).toHaveCSS(
      'color',
      theme === 'dark' ? 'rgb(184, 176, 191)' : 'rgb(107, 97, 113)',
    );
    await dialog.screenshot({
      path: testInfo.outputPath(`dependency-demo-${theme}.png`),
    });
    await dialog.getByRole('switch', { name: 'Supply --upload' }).click();
    await expect(shell).toHaveAttribute('data-valid', 'false');
    await expect(output).toHaveText("app.sh: 'upload' requires 'token'");
    await expect(shell).not.toHaveCSS('border-color', validBorder);
    await dialog.screenshot({
      path: testInfo.outputPath(`dependency-error-${theme}.png`),
    });
    await dialog.getByRole('switch', { name: 'Supply --upload' }).click();
  }
  await page.evaluate(() =>
    Object.defineProperty(navigator, 'clipboard', {
      value: {
        writeText: async (text: string) => {
          document.body.dataset.dependencyCopied = text;
        },
      },
    }),
  );
  await dialog
    .locator('[data-explorer-output="script"] [data-copy-code]')
    .click();
  await expect
    .poll(() => page.evaluate(() => document.body.dataset.dependencyCopied))
    .toContain('koi::add_dependency upload --requires token');
});

test('dependency legacy links and static examples work without JavaScript or duplicate IDs', async ({
  page,
  browser,
}) => {
  for (const fragment of ['explore', 'see-it-in-action']) {
    await page.goto(`/docs/reference/add_dependency#${fragment}`);
    await expect(
      page.locator(
        `#doc-reference-add_dependency [data-fragment="${fragment}"]`,
      ),
    ).toBeInViewport();
  }
  const ids = await page
    .locator('[id]')
    .evaluateAll((nodes) => nodes.map((node) => node.id));
  expect(new Set(ids).size).toBe(ids.length);
  const context = await browser.newContext({ javaScriptEnabled: false });
  const plain = await context.newPage();
  await plain.goto('/docs/reference/add_dependency');
  const section = plain.locator('#doc-reference-add_dependency');
  await expect(section.locator('.doc-example')).toContainText(
    'koi::add_dependency upload --requires token account',
  );
  await expect(section.locator('.doc-example')).toContainText('Dependencies:');
  await expect(section.locator('[data-open-try]')).toHaveCount(0);
  await expect(section.locator('#try-adddependency')).toBeHidden();
  await context.close();
});
