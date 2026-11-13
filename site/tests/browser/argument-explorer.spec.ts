import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('argument collection adds all kinds, validates drafts, and keeps highlighted outputs in sync', async ({
  page,
}, testInfo) => {
  await page.goto('/docs/reference/addarg#explore');
  const section = page.locator('#doc-reference-addarg');
  const explorer = section.locator('[data-argument-explorer]');
  const code = section.locator('.doc-example code').first();
  const help = section.locator('.doc-example code').nth(1);
  await expect(explorer.locator('.argument-row')).toHaveCount(1);
  await expect(help).toContainText('Who to greet (default: world)');
  await explorer
    .getByRole('button', { name: 'Register an argument', exact: true })
    .click();
  await explorer.getByRole('button', { name: 'Save argument' }).click();
  await expect(
    explorer.getByLabel('Description', { exact: false }),
  ).toHaveAttribute('aria-invalid', 'true');
  await expect(explorer.getByLabel('Destination variable')).toHaveAttribute(
    'aria-invalid',
    'true',
  );
  await expect(explorer.locator('.builder-error')).toHaveCount(0);
  await explorer.getByLabel('Destination variable').fill('verbose');
  await expect(explorer.getByLabel('Destination variable')).not.toHaveAttribute(
    'aria-invalid',
  );
  await expect(
    explorer.getByLabel('Description', { exact: false }),
  ).toHaveAttribute('aria-invalid', 'true');
  await explorer
    .getByLabel('Description', { exact: false })
    .fill('Print progress');
  await explorer.getByRole('button', { name: 'Save argument' }).click();
  await expect(explorer.getByLabel('Short name')).toHaveAttribute(
    'aria-invalid',
    'true',
  );
  await expect(explorer.getByLabel('Long name')).toHaveAttribute(
    'aria-invalid',
    'true',
  );
  await explorer.getByLabel('Short name').fill('n');
  await expect(explorer.getByLabel('Short name')).not.toHaveAttribute(
    'aria-invalid',
  );
  await expect(explorer.getByLabel('Long name')).not.toHaveAttribute(
    'aria-invalid',
  );
  await explorer.getByRole('button', { name: 'Save argument' }).click();
  await expect(explorer.getByLabel('Short name')).toHaveAttribute(
    'aria-invalid',
    'true',
  );
  await expect(explorer.getByLabel('Short name')).toHaveAttribute(
    'aria-description',
    'Each short must be unique.',
  );
  await explorer.getByLabel('Short name').fill('v');
  await explorer.getByRole('button', { name: 'Save argument' }).click();
  await expect(explorer.locator('.argument-row')).toHaveCount(2);
  await expect(code).toContainText('__addarg verbose -f -s v');
  await expect(help).toContainText('-v');
  await expect(help).toContainText('Print progress');
  await explorer
    .getByRole('button', { name: 'Register an argument', exact: true })
    .click();
  await explorer.getByLabel('Destination variable').fill('output');
  const kind = explorer.getByRole('button', { name: 'Kind' });
  await kind.focus();
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
  await explorer.getByLabel('Long name').fill('output');
  await explorer.getByRole('switch', { name: 'Use a default' }).click();
  await explorer
    .getByLabel('Description', { exact: false })
    .fill('Output file');
  await explorer.getByRole('button', { name: 'Save argument' }).click();
  await expect(explorer.getByLabel('Default value')).toHaveAttribute(
    'aria-invalid',
    'true',
  );
  await explorer.getByLabel('Default value').fill("it's $HOME");
  await explorer.getByLabel('Display name').fill('file');
  await explorer.getByRole('button', { name: 'Save argument' }).click();
  await expect(code).toContainText('__addarg output -o -l output');
  await expect(help).toContainText('--output FILE');
  await explorer
    .getByRole('button', { name: 'Register an argument', exact: true })
    .click();
  await explorer.getByLabel('Destination variable').fill('source');
  await kind.click();
  await explorer.getByRole('option', { name: 'Positional' }).click();
  await explorer
    .getByLabel('Description', { exact: false })
    .fill('Source file');
  await explorer.getByRole('switch', { name: 'Required', exact: true }).click();
  await explorer.getByRole('button', { name: 'Save argument' }).click();
  await expect(explorer.locator('.argument-row')).toHaveCount(4);
  const badges = await explorer
    .locator('.argument-kind')
    .evaluateAll((nodes) =>
      nodes.map((node) => node.getBoundingClientRect().x),
    );
  expect(new Set(badges).size).toBe(1);
  const labels = await explorer
    .locator('.argument-spelling')
    .evaluateAll((nodes) => nodes.map((node) => node.getBoundingClientRect()));
  expect(new Set(labels.map((label) => label.x)).size).toBe(1);
  expect(badges[0]).toBeGreaterThan(labels[0].x + labels[0].width);
  await expect(explorer.locator('.argument-row').last()).toHaveText(
    'sourcePOSITIONAL',
  );
  const firstRow = explorer.locator('.argument-rows li').first();
  const rowBounds = (await firstRow.boundingBox())!;
  const deleteBounds = (await firstRow
    .getByRole('button', { name: 'Delete name argument' })
    .boundingBox())!;
  expect(
    rowBounds.x + rowBounds.width - 4 - deleteBounds.x - deleteBounds.width,
  ).toBeGreaterThanOrEqual(8);

  if (testInfo.project.name === 'chromium') {
    await firstRow.locator('.argument-row').hover();
    const fill = await firstRow.evaluate((node) => {
      const style = getComputedStyle(node, '::before');
      return {
        background: style.backgroundColor,
        top: style.top,
        right: style.right,
        bottom: style.bottom,
        left: style.left,
      };
    });
    expect(fill.background).not.toBe('rgba(0, 0, 0, 0)');
    expect([fill.top, fill.right, fill.bottom, fill.left]).toEqual([
      '4px',
      '4px',
      '4px',
      '4px',
    ]);
    const remove = firstRow.getByRole('button', {
      name: 'Delete name argument',
    });
    const restingBackground = await explorer.evaluate(
      (node) => getComputedStyle(node).backgroundColor,
    );
    await expect(remove).toHaveCSS('background-color', restingBackground);
    await remove.hover();
    await expect(remove).not.toHaveCSS('background-color', restingBackground);
    expect(
      await firstRow.evaluate(
        (node) => getComputedStyle(node, '::before').backgroundColor,
      ),
    ).toBe('rgba(0, 0, 0, 0)');
    await expect(remove).not.toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
    await firstRow.locator('.argument-row').hover();
    await expect(remove).toHaveCSS('background-color', restingBackground);
    expect(
      await firstRow.evaluate(
        (node) => getComputedStyle(node, '::before').backgroundColor,
      ),
    ).not.toBe('rgba(0, 0, 0, 0)');
  }

  await expect(code).toContainText('local name verbose output source');
  await expect(help).toContainText('Positionals:');
  await expect(help).toContainText('Source file (required)');
  await expect(code.locator('span[style]')).not.toHaveCount(0);
  await expect(section.locator('.doc-example h2 a')).toHaveCount(0);
  for (const theme of ['light', 'dark']) {
    await page.evaluate(
      (theme) => (document.documentElement.dataset.theme = theme),
      theme,
    );
    await explorer.scrollIntoViewIfNeeded();
    await explorer.screenshot({
      path: testInfo.outputPath(`arguments-${theme}.png`),
    });
    await explorer
      .getByRole('button', { name: 'Edit output argument' })
      .click();
    await explorer.screenshot({
      path: testInfo.outputPath(`editor-${theme}.png`),
    });
    const scan = await new AxeBuilder({ page })
      .include('[data-argument-explorer]')
      .analyze();
    expect(scan.violations).toEqual([]);
    await page.keyboard.press('Escape');
  }
  await explorer.getByRole('button', { name: 'Reset arguments' }).click();
  await expect(explorer.locator('.argument-row')).toHaveCount(1);
  await explorer.getByRole('button', { name: 'Delete name argument' }).click();
  await expect(explorer.locator('.argument-row')).toHaveCount(0);
  await expect(code).not.toContainText('__addarg');
  await expect(code).not.toContainText('local ');
  await expect(help).toHaveText(
    'Usage: greet.sh [-h]\n\nOptions:\n  -h, --help  Show this help',
  );
  await expect(
    explorer.getByRole('button', { name: 'Register an argument', exact: true }),
  ).toBeFocused();
  await explorer.getByRole('button', { name: 'Reset arguments' }).click();
  await expect(explorer.locator('.argument-row')).toHaveCount(1);
  await expect(code).not.toContainText('__addarg output');
  await expect(help).not.toContainText('Positionals:');
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

test('shared reference fragments stay within their owning route', async ({
  page,
}) => {
  for (const route of ['addarg', 'addcommand', 'koirun', 'koiconfig']) {
    await page.goto(`/docs/reference/${route}#options`);
    const heading = page.locator(`#doc-reference-${route}-options`);
    await expect(heading).toBeInViewport();
    await heading.getByRole('link').click();
    await expect(page).toHaveURL(
      new RegExp(`/docs/reference/${route}#options$`),
    );
    await page.reload();
    await expect(heading).toBeInViewport();
  }
});

test('editing either spelling clears their paired errors without clearing unrelated fields', async ({
  page,
}) => {
  await page.goto('/docs/reference/addarg#explore');
  const explorer = page.locator('[data-argument-explorer]');
  await explorer
    .getByRole('button', { name: 'Register an argument', exact: true })
    .click();
  await explorer.getByRole('button', { name: 'Save argument' }).click();
  await explorer.getByLabel('Long name').fill('verbose');
  for (const label of ['Short name', 'Long name']) {
    await expect(explorer.getByLabel(label)).not.toHaveAttribute(
      'aria-invalid',
    );
    await expect(explorer.getByLabel(label)).not.toHaveAttribute(
      'aria-description',
    );
  }
  await expect(explorer.getByLabel('Destination variable')).toHaveAttribute(
    'aria-invalid',
    'true',
  );
  await expect(
    explorer.getByLabel('Description', { exact: false }),
  ).toHaveAttribute('aria-invalid', 'true');
});
