import { test, expect } from '@playwright/test';

test('array editor generates typed locals and ellipsis help, resets flags, and rejects invalid layouts', async ({
  page,
}) => {
  await page.goto('/docs/reference/add_arg');
  const explorer = page.locator('[data-argument-explorer]');
  const section = explorer.locator('xpath=ancestor::*[@data-doc-section][1]');
  await expect(explorer.locator('.argument-cardinality')).toHaveText('SCALAR');
  await explorer.getByRole('button', { name: 'Edit name argument' }).click();
  const cardinality = explorer.getByRole('button', { name: /^Cardinality/ });
  await cardinality.focus();
  await cardinality.press('ArrowDown');
  await expect(
    explorer.getByRole('option', { name: 'Scalar', exact: true }),
  ).toBeFocused();
  await page.keyboard.press('End');
  await expect(
    explorer.getByRole('option', { name: 'Array', exact: true }),
  ).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(
    explorer.getByRole('switch', { name: 'Use a default' }),
  ).toBeHidden();
  await expect(explorer.locator('[name=defaultValue]')).toHaveValue('');
  await explorer.getByRole('button', { name: 'Save argument' }).click();
  await expect(section.locator('.doc-example code').first()).toContainText(
    'local -a name',
  );
  await expect(section.locator('.doc-example code').first()).toContainText(
    '"${name[@]}"',
  );
  await expect(section.locator('.doc-example code').nth(1)).toContainText(
    '[-n NAME]...',
  );
  await expect(section.locator('.doc-example code').nth(1)).not.toContainText(
    '(repeatable)',
  );
  await expect(explorer.locator('.argument-cardinality')).toHaveText('ARRAY');
  await expect(section.locator('[data-argument-array]')).toHaveCount(0);
  await expect(section.locator('[data-argument-sample]')).toContainText(
    'name[$__koi_example_index]: $__koi_example_value',
  );
  await page.evaluate(() => {
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: async (text: string) => {
          document.body.dataset.copiedArray = text;
        },
      },
    });
  });
  await section.locator('.doc-example [data-copy-code]').first().click();
  await expect
    .poll(() => page.evaluate(() => document.body.dataset.copiedArray))
    .toContain('"${name[@]}"');
  await explorer.getByRole('button', { name: 'Edit name argument' }).click();
  await explorer.getByRole('button', { name: /^Kind/ }).click();
  await explorer.getByRole('option', { name: 'Flag', exact: true }).click();
  await expect(explorer.locator('[data-cardinality]')).toBeHidden();
  await explorer.getByRole('button', { name: /^Kind/ }).click();
  await explorer
    .getByRole('option', { name: 'Positional', exact: true })
    .click();
  await expect(
    explorer.getByRole('button', { name: /^Cardinality/ }),
  ).toContainText('Scalar');
  await explorer.getByRole('button', { name: 'Save argument' }).click();
  await explorer
    .getByRole('button', { name: 'Register an argument', exact: true })
    .click();
  await explorer.getByLabel('Destination variable').fill('files');
  await explorer.getByRole('button', { name: /^Kind/ }).click();
  await explorer
    .getByRole('option', { name: 'Positional', exact: true })
    .click();
  await explorer.getByRole('button', { name: /^Cardinality/ }).click();
  await explorer.getByRole('option', { name: 'Array', exact: true }).click();
  await explorer.getByLabel('Description', { exact: true }).fill('Files');
  await explorer.getByRole('button', { name: 'Save argument' }).click();
  await expect(explorer.getByLabel('Destination variable')).toHaveAttribute(
    'aria-invalid',
    'true',
  );
});

test('cardinality is published in navigation, markdown, and search while array guide stays planned', async ({
  page,
  request,
}) => {
  await page.goto('/docs/concepts/cardinality');
  await expect(page.locator('#doc-concepts-cardinality h1')).toContainText(
    'Scalars and arrays',
  );
  const markdown = await request.get('/docs/concepts/cardinality.md');
  expect(markdown.ok()).toBe(true);
  expect(await markdown.text()).toContain('- TODO:');
  const search = await request.get('/search.json');
  expect(await search.text()).toContain('/docs/concepts/cardinality');
  expect(await search.text()).not.toContain('/docs/guides/arrays');
});

test('reference API methods use mono navigation labels while glossary and conventions retain sans', async ({
  page,
  isMobile,
}) => {
  await page.goto('/docs/reference/add_arg');
  if (isMobile)
    await page.getByRole('button', { name: 'Open documentation menu' }).click();
  const nav = page.getByRole('navigation', { name: 'Documentation sections' });
  for (const name of ['koi::add_arg', 'koi::parse', 'koi::run']) {
    expect(
      await nav
        .getByRole('link', { name, exact: true })
        .evaluate((node) => getComputedStyle(node).fontFamily),
    ).toContain('Monaspace');
  }
  for (const name of ['Glossary', 'Conventions']) {
    expect(
      await nav
        .getByRole('link', { name, exact: true })
        .evaluate((node) => getComputedStyle(node).fontFamily),
    ).toContain('Satoshi');
  }
});

test('array cardinality hides the complete default row and scalar restores it', async ({
  page,
}) => {
  await page.goto('/docs/reference/add_arg');
  const explorer = page.locator('[data-argument-explorer]');
  await explorer.getByRole('button', { name: 'Edit name argument' }).click();
  await expect(explorer.locator('[data-default-control]')).toBeVisible();
  await explorer.getByRole('button', { name: /^Cardinality/ }).click();
  await explorer.getByRole('option', { name: 'Array', exact: true }).click();
  await expect(explorer.locator('[data-default-control]')).toBeHidden();
  await expect(explorer.locator('[name=defaultValue]')).toHaveValue('');
  await explorer.getByRole('button', { name: /^Cardinality/ }).click();
  await explorer.getByRole('option', { name: 'Scalar', exact: true }).click();
  await expect(explorer.locator('[data-default-control]')).toBeVisible();
  await expect(
    explorer.getByRole('switch', { name: 'Use a default' }),
  ).toHaveAttribute('aria-checked', 'false');
});

test('sample and help remain pinned until the argument card reaches the top', async ({
  page,
  isMobile,
}) => {
  test.skip(isMobile, 'Stacked examples do not use sticky positioning.');
  await page.goto('/docs/reference/add_arg');
  const explorer = page.locator('[data-argument-explorer]');
  const demo = page.locator('#doc-reference-add_arg .example-sticky');
  await expect
    .poll(() =>
      page
        .locator('#doc-reference-add_arg .doc-prose')
        .evaluate((node) => parseFloat(getComputedStyle(node).paddingBottom)),
    )
    .toBeGreaterThan(0);
  for (const cardinality of ['scalar', 'array']) {
    if (cardinality === 'array') {
      await explorer
        .getByRole('button', { name: 'Edit name argument' })
        .click();
      await explorer.getByRole('button', { name: /^Cardinality/ }).click();
      await explorer
        .getByRole('option', { name: 'Array', exact: true })
        .click();
      await explorer.getByRole('button', { name: 'Save argument' }).click();
      await expect(demo).toContainText('for __koi_example_value');
    }
    await page.evaluate(() => document.fonts.ready);
    for (const top of [120, 0]) {
      await explorer.evaluate(
        (node, target) =>
          window.scrollBy({
            top: node.getBoundingClientRect().top - target,
            behavior: 'instant',
          }),
        top,
      );
      await expect
        .poll(() =>
          demo.evaluate((node) => Math.round(node.getBoundingClientRect().top)),
        )
        .toBe(24);
    }
    await page.evaluate(() =>
      window.scrollBy({ top: 160, behavior: 'instant' }),
    );
    await expect
      .poll(() => demo.evaluate((node) => node.getBoundingClientRect().top))
      .toBeLessThan(24);
  }
});
