import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { openArgumentTryIt } from '../fixtures/try-it';

test('both Edit buttons open the same modal, retain saved edits, and restore focus', async ({
  page,
  isMobile,
}) => {
  await page.goto('/docs/reference/add_arg#try-it');
  const section = page.locator('#doc-reference-add_arg');
  const callout = section.locator('[data-try-it-callout]');
  await expect(
    callout.getByRole('heading', { name: 'See it in action' }),
  ).toBeVisible();
  await expect(callout).toContainText(
    'Experiment with flags, options, and positionals using koi::add_arg.',
  );
  await expect(section.locator('[data-open-try]')).toHaveCount(2);
  const edit = callout.getByRole('button', { name: 'Edit', exact: true });
  const sampleEdit = section.locator('.doc-example [data-open-try]');
  const svg = edit.locator('svg');
  expect(await svg.getAttribute('fill')).toBe('currentColor');
  expect(await svg.getAttribute('stroke')).toBe('none');
  const dialog = page.locator('#try-addarg');
  await expect(dialog).toBeHidden();
  if (!isMobile) {
    const fill = await edit.evaluate(
      (node) => getComputedStyle(node).backgroundColor,
    );
    const before = await edit.boundingBox();
    await edit.hover();
    await expect(edit).not.toHaveCSS('background-color', fill);
    expect(await edit.boundingBox()).toEqual(before);
    await expect(edit).toHaveCSS('transform', 'none');
  }
  await edit.click();
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('heading', { name: 'Demo' })).toBeFocused();
  await expect(section).not.toHaveClass(/has-explorer/);
  const pageScript = section.locator(
    '.doc-example [data-explorer-output="script"] code',
  );
  const modalScript = dialog.locator('[data-explorer-output="script"] code');
  const initial = await modalScript.textContent();
  await dialog.getByRole('button', { name: 'Edit name argument' }).click();
  await dialog.getByLabel('Destination variable').fill('recipient');
  await dialog.getByRole('button', { name: 'Save argument' }).click();
  await expect(modalScript).toContainText('local recipient');
  await expect(pageScript).toHaveText((await modalScript.textContent())!);
  await expect(dialog.locator('[data-explorer-output="help"] code')).toHaveText(
    (await section
      .locator('.doc-example [data-explorer-output="help"] code')
      .textContent())!,
  );
  await dialog.getByRole('button', { name: 'Edit recipient argument' }).click();
  await dialog.getByLabel('Destination variable').fill('discard_this');
  await dialog.getByRole('button', { name: 'Close editor' }).click();
  await expect(dialog).toBeHidden();
  await expect(edit).toBeFocused();
  await sampleEdit.click();
  await expect(dialog).toBeVisible();
  await expect(dialog.locator('[data-argument-list]')).toBeVisible();
  await expect(modalScript).not.toContainText('discard_this');
  await expect(modalScript).toContainText('local recipient');
  await dialog.getByRole('button', { name: 'Reset arguments' }).click();
  await expect(modalScript).toHaveText(initial!);
  await expect(pageScript).toHaveText(initial!);
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(sampleEdit).toBeFocused();
});

test('Escape closes dropdown, draft, then modal; search and background scrolling stay inactive', async ({
  page,
}) => {
  await page.goto('/docs/reference/add_arg');
  const dialog = await openArgumentTryIt(page);
  const originalY = await page.evaluate(() => scrollY);
  await page.keyboard.press('/');
  await expect(page.locator('#search-dialog')).toBeHidden();
  await dialog.getByRole('button', { name: 'Edit name argument' }).click();
  await dialog.getByRole('button', { name: /^Kind/ }).click();
  await page.keyboard.press('Escape');
  await expect(dialog.getByRole('listbox')).toBeHidden();
  await expect(dialog.locator('form')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(dialog.locator('form')).toBeHidden();
  await expect(dialog).toBeVisible();
  await dialog.getByRole('button', { name: 'Close editor' }).focus();
  await page.keyboard.press('Tab');
  expect(
    await page.evaluate(() => !!document.activeElement?.closest('#try-addarg')),
  ).toBe(true);
  await page.mouse.move(2, 2);
  await page.mouse.wheel(0, 500);
  await expect.poll(() => page.evaluate(() => scrollY)).toBe(originalY);
  await page.mouse.click(2, 2);
  await expect(dialog).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(page.locator('html')).not.toHaveClass(/try-dialog-open/);
  await expect.poll(() => page.evaluate(() => scrollY)).toBe(originalY);
});

test('modal panes fit the viewport, scroll correctly, and remain accessible in both themes', async ({
  page,
  isMobile,
}, testInfo) => {
  await page.goto('/docs/reference/add_arg');
  const dialog = await openArgumentTryIt(page);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const controller = dialog.locator('.try-dialog-controller');
  const preview = dialog.locator('.try-dialog-preview');
  const box = (await dialog.boundingBox())!;
  const viewport = page.viewportSize()!;
  expect(box.x).toBeGreaterThanOrEqual(7);
  expect(box.y).toBeGreaterThanOrEqual(7);
  expect(box.width).toBeGreaterThan(viewport.width - 40);
  expect(box.height).toBeGreaterThan(viewport.height - 40);
  const left = (await controller.boundingBox())!;
  const right = (await preview.boundingBox())!;
  if (isMobile) {
    expect(right.y).toBeGreaterThanOrEqual(left.y + left.height - 1);
    expect(Math.abs(right.x - left.x)).toBeLessThan(2);
    await dialog
      .locator('.try-dialog-body')
      .evaluate((node) => (node.scrollTop = node.scrollHeight));
  } else {
    expect(right.x).toBeGreaterThan(left.x);
    expect(Math.abs(right.y - left.y)).toBeLessThan(2);
    await preview.evaluate((node) => (node.scrollTop = node.scrollHeight));
    expect(await controller.evaluate((node) => node.scrollTop)).toBe(0);
  }
  await expect(
    dialog.getByRole('button', { name: 'Close editor' }),
  ).toBeInViewport();
  for (const theme of ['light', 'dark']) {
    await page.evaluate(
      (theme) => (document.documentElement.dataset.theme = theme),
      theme,
    );
    const scan = await new AxeBuilder({ page })
      .include('#try-addarg')
      .analyze();
    expect(scan.violations).toEqual([]);
    await dialog.screenshot({
      path: testInfo.outputPath(`try-it-${theme}.png`),
    });
    expect(
      await dialog.evaluate((node) => node.scrollWidth <= node.clientWidth),
    ).toBe(true);
  }
});

test('tablet layouts keep the controller within its pane', async ({ page }) => {
  await page.goto('/docs/reference/add_arg');
  const dialog = await openArgumentTryIt(page);
  const controller = dialog.locator('.try-dialog-controller');
  for (const width of [800, 1024]) {
    await page.setViewportSize({ width, height: 900 });
    expect(
      await controller.evaluate((node) => node.scrollWidth <= node.clientWidth),
    ).toBe(true);
    await dialog.getByRole('button', { name: 'Edit name argument' }).click();
    expect(
      await controller.evaluate((node) => node.scrollWidth <= node.clientWidth),
    ).toBe(true);
    await dialog.getByRole('button', { name: 'Cancel', exact: true }).click();
  }
});

test('modal code tooltips stay in the top layer, copy uses edited code, and links dismiss the modal', async ({
  page,
}) => {
  await page.goto('/docs/reference/add_arg');
  const dialog = await openArgumentTryIt(page);
  const trigger = dialog.locator('[data-api-reference="koi::add_arg"]').first();
  await trigger.focus();
  const card = dialog.locator('#api-reference-card');
  await expect(card).toBeVisible();
  await page.keyboard.press('Tab');
  await expect(
    card.getByRole('link', { name: 'Docs', exact: true }),
  ).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(card).toBeHidden();
  await expect(dialog).toBeVisible();
  await page.evaluate(() =>
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: async (text: string) => {
          document.body.dataset.tryCopied = text;
        },
      },
    }),
  );
  await dialog.locator('[data-copy-code]').first().click();
  await expect
    .poll(() => page.evaluate(() => document.body.dataset.tryCopied))
    .toContain('koi::add_arg name');
  await trigger.focus();
  await expect(card).toBeVisible();
  await card.getByRole('link', { name: 'Docs', exact: true }).click();
  await expect(dialog).toBeHidden();
  await expect(page.locator('#api-reference-card')).toBeHidden();
  await expect(page.locator('#doc-reference-add_arg h1')).toBeInViewport();
});

test('Try it stays readable without JavaScript and old Explore links resolve', async ({
  browser,
  page,
}) => {
  await page.goto('/docs/reference/add_arg#explore');
  await expect(
    page.locator('#doc-reference-add_arg [data-try-it-callout]'),
  ).toBeInViewport();
  const context = await browser.newContext({ javaScriptEnabled: false });
  const plain = await context.newPage();
  await plain.goto('/docs/reference/add_arg');
  await expect(
    plain.locator('#doc-reference-add_arg [data-try-it-callout]'),
  ).toContainText('Experiment with flags, options, and positionals');
  await expect(plain.locator('[data-open-try]')).toHaveCount(0);
  await expect(plain.locator('#try-addarg')).toBeHidden();
  await expect(
    plain.locator('#doc-reference-add_arg .doc-example'),
  ).toContainText('Who to greet');
  await context.close();
});

test('demo note pairs the grid mark with the copy and reuses the animated terminal link', async ({
  page,
  isMobile,
}) => {
  await page.goto('/docs/reference/add_arg');
  const dialog = await openArgumentTryIt(page);
  await expect(
    dialog.getByRole('heading', { name: 'Demo', exact: true }),
  ).toBeVisible();
  await expect(dialog.locator('.try-dialog-title p')).toHaveText(
    'koi::add_arg',
  );
  const note = dialog.locator('.try-dialog-note');
  await expect(note).toContainText(
    'This is a live demo of koi::add_arg. Use the controls above to play with the API and modify the sample script to the right in real time. Want to play with more koi APIs? Check out',
  );
  await note.scrollIntoViewIfNeeded();
  const mark = note.locator('.koi-mark');
  const image = mark.locator('img:visible');
  await expect(image).toHaveAttribute('src', /koi-grid(?:-dark)?\.svg$/);
  const logoBox = (await mark.boundingBox())!;
  const textBox = (await note.locator('p').boundingBox())!;
  expect(logoBox.x + logoBox.width).toBeLessThan(textBox.x);
  expect(logoBox.height).toBeGreaterThanOrEqual(textBox.height - 1);
  if (!isMobile) {
    const pane = (await dialog
      .locator('.try-dialog-controller')
      .boundingBox())!;
    const footer = (await note.boundingBox())!;
    expect(
      Math.abs(pane.y + pane.height - footer.y - footer.height - 24),
    ).toBeLessThan(2);
  }
  const terminal = note.getByRole('link', {
    name: 'the terminal',
    exact: true,
  });
  await expect(terminal).toHaveAttribute('href', '/playground');
  await expect(terminal.locator('.cta-arrow-shaft')).toHaveCSS('opacity', '0');
  if (!isMobile) {
    await terminal.hover();
    await expect(terminal.locator('.cta-arrow-shaft')).toHaveCSS(
      'opacity',
      '1',
    );
    await page.mouse.move(0, 0);
  }
  await terminal.focus();
  await page.keyboard.press('Tab');
  await page.keyboard.press('Shift+Tab');
  await expect(terminal.locator('.cta-arrow-shaft')).toHaveCSS('opacity', '1');
  await expect(terminal.locator('.cta-arrow-chevron')).toHaveCSS(
    'transform',
    'matrix(1, 0, 0, 1, 12, 0)',
  );
  await terminal.click();
  await expect(page).toHaveURL(/\/playground$/);
});
