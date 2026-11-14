import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
import type { DropdownController } from '../../src/scripts/dropdown';

const controllerSource = ts.transpileModule(
  readFileSync(
    new URL('../../src/scripts/dropdown.ts', import.meta.url),
    'utf8',
  ),
  {
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2022,
    },
  },
).outputText;

test('generic dropdowns work outside the explorer with independent selection, focus, and styling', async ({
  page,
}) => {
  await page.goto('/docs/reference/add_arg');
  await page.evaluate(async (source) => {
    const url = URL.createObjectURL(
      new Blob([source], { type: 'text/javascript' }),
    );
    const { initDropdown } = await import(url);
    URL.revokeObjectURL(url);
    const fixture = document.createElement('div');
    fixture.style.cssText =
      'position:fixed;top:20px;left:20px;width:280px;padding:20px;z-index:1000;background:var(--surface)';
    const template = document.querySelector('#argument-kind')!.outerHTML;
    const controls: Record<string, DropdownController> = {};
    for (const id of ['standalone-one', 'standalone-two']) {
      fixture.insertAdjacentHTML(
        'beforeend',
        template.replaceAll('argument-kind', id),
      );
      const root = fixture.lastElementChild as HTMLElement;
      root.querySelector('[data-value=option]')!.textContent =
        'Mixed CASE label';
      root.dataset.changes = '0';
      root.style.marginBottom = '160px';
      controls[id] = initDropdown(root, {
        onOpen: () =>
          Object.values(controls).forEach((control) => control.close()),
        onChange: (value: string) => {
          root.dataset.changes = String(Number(root.dataset.changes) + 1);
          root.dataset.lastValue = value;
        },
      });
    }
    document.body.append(fixture);
    (
      window as typeof window & { dropdownControls: typeof controls }
    ).dropdownControls = controls;
    controls['standalone-one'].setValue('option');
    controls['standalone-two'].setDisabled(true);
  }, controllerSource);

  const first = page.locator('#standalone-one');
  const second = page.locator('#standalone-two');
  const trigger = first.getByRole('button', { name: /^Kind/ });
  await expect(trigger).toContainText('Mixed CASE label');
  await expect(first).toHaveAttribute('data-changes', '0');
  await expect(second.getByRole('button', { name: /^Kind/ })).toBeDisabled();
  await expect(first.getByRole('listbox')).toBeHidden();
  await trigger.press('ArrowUp');
  await expect(
    first.getByRole('option', { name: 'Mixed CASE label' }),
  ).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(first).toHaveAttribute('data-changes', '1');
  await expect(first).toHaveAttribute('data-last-value', 'option');
  await expect(trigger).toBeFocused();

  await trigger.click();
  await page.keyboard.press('End');
  await expect(first.getByRole('option', { name: 'Positional' })).toBeFocused();
  await page.keyboard.press('ArrowDown');
  await expect(first.getByRole('option', { name: 'Flag' })).toBeFocused();
  await page.keyboard.press('ArrowUp');
  await expect(first.getByRole('option', { name: 'Positional' })).toBeFocused();
  await page.keyboard.press('Home');
  await expect(first.getByRole('option', { name: 'Flag' })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(first.getByRole('listbox')).toBeHidden();
  await expect(trigger).toBeFocused();
  await expect(first).toHaveAttribute('data-changes', '1');

  await page.evaluate(() => {
    const controls = (
      window as typeof window & {
        dropdownControls: Record<string, DropdownController>;
      }
    ).dropdownControls;
    controls['standalone-two'].setDisabled(false);
  });
  await trigger.click();
  await second.getByRole('button', { name: /^Kind/ }).click();
  await expect(first.getByRole('listbox')).toBeHidden();
  await expect(second.getByRole('option', { name: 'Flag' })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(second.getByRole('listbox')).toBeHidden();
  await trigger.click();
  await page.mouse.click(
    page.viewportSize()!.width - 10,
    page.viewportSize()!.height - 10,
  );
  await expect(first.getByRole('listbox')).toBeHidden();
  await expect(first).toHaveAttribute('data-changes', '1');

  for (const theme of ['light', 'dark']) {
    await page.evaluate(
      (value) => (document.documentElement.dataset.theme = value),
      theme,
    );
    await trigger.focus();
    await trigger.press('ArrowDown');
    await page.keyboard.press('Escape');
    expect(
      await trigger.evaluate((node) => ({
        radius: getComputedStyle(node).borderRadius,
        offset: getComputedStyle(node).outlineOffset,
        font: getComputedStyle(node).fontFamily,
      })),
    ).toMatchObject({ radius: '6px', offset: '3px' });
    expect(
      await trigger.evaluate((node) => getComputedStyle(node).fontFamily),
    ).toContain('Monaspace');
    await trigger.press('ArrowDown');
    expect(
      await first
        .getByRole('listbox')
        .evaluate((node) => getComputedStyle(node).position),
    ).toBe('absolute');
    await page.keyboard.press('Escape');
  }
  const ids = await page
    .locator('[id]')
    .evaluateAll((nodes) => nodes.map((node) => node.id));
  expect(new Set(ids).size).toBe(ids.length);
});
