import { expect, type Page } from '@playwright/test';

export async function openArgumentTryIt(page: Page) {
  await page
    .locator('#doc-reference-add_arg .doc-example [data-open-try]')
    .click();
  const dialog = page.locator('#try-addarg');
  await expect(dialog).toBeVisible();
  return dialog;
}

export async function openCommandTryIt(page: Page) {
  await page
    .locator('#doc-reference-add_command .doc-example [data-open-try]')
    .click();
  const dialog = page.locator('#try-addcommand');
  await expect(dialog).toBeVisible();
  return dialog;
}

export async function openGroupTryIt(page: Page) {
  await page
    .locator('#doc-reference-add_group .doc-example [data-open-try]')
    .click();
  const dialog = page.locator('#try-addgroup');
  await expect(dialog).toBeVisible();
  return dialog;
}

export async function openDependencyTryIt(page: Page) {
  await page
    .locator('#doc-reference-add_dependency .doc-example [data-open-try]')
    .click();
  const dialog = page.locator('#try-adddependency');
  await expect(dialog).toBeVisible();
  return dialog;
}

export async function selectCommandHelp(
  container: import('@playwright/test').Locator,
  invocation: string,
) {
  const dropdown = container.locator('[data-command-help-selector]');
  await dropdown.getByRole('button', { name: /^Help for/ }).click();
  await dropdown.getByRole('option', { name: invocation, exact: true }).click();
}
export async function selectCommandParent(
  container: import('@playwright/test').Locator,
  path: string,
) {
  const dropdown = container.locator('.command-parent-picker');
  await dropdown.getByRole('button', { name: /^Parent command/ }).click();
  await dropdown.getByRole('option', { name: path, exact: true }).click();
}
