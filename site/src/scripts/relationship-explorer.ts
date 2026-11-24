import { getBuilderProfile } from '../lib/builder-profiles';
import type {
  GroupSettings,
  DependencySettings,
} from '../lib/interface-builders';
import { explorerPreview } from './explorer';
import { initDropdown } from './dropdown';

for (const explorer of document.querySelectorAll<HTMLElement>(
  '[data-explorer="group"], [data-explorer="dependency"]',
)) {
  const profile = getBuilderProfile(explorer.dataset.builderProfile);
  if (!profile) continue;
  const api = profile.interfaces;
  const group = explorer.dataset.explorer === 'group';
  const sample = group ? 'group' : 'dependency';
  const dialog = explorer.closest<HTMLDialogElement>('[data-try-dialog]');
  const updatePreview = explorerPreview(
    explorer,
    sample,
    dialog
      ? {
          previews: [
            ...explorer
              .closest('[data-doc-section]')!
              .querySelectorAll<HTMLElement>(`[data-${sample}-sample]`),
          ],
          reserveSpace: false,
        }
      : undefined,
  );
  let settings: GroupSettings = structuredClone(api.defaultGroup);
  let dependency: DependencySettings = structuredClone(api.defaultDependency);
  let present: string[] = [];
  const checks = [
    ...explorer.querySelectorAll<HTMLInputElement>('input[name="members"]'),
  ];
  const message = explorer.querySelector<HTMLElement>('[data-member-error]')!;
  const required = explorer.querySelector<HTMLButtonElement>(
    '[data-switch="required"]',
  );
  const singlePipe = explorer.querySelector<HTMLButtonElement>(
    '[data-switch="singlePipeForOr"]',
  );
  const dropdown = initDropdown(
    explorer.querySelector<HTMLElement>('[data-dropdown]')!,
    {
      onChange(value) {
        if (group) {
          settings.type = value as GroupSettings['type'];
          if (value === 'or') settings.required = true;
        } else {
          dependency.dependent = value;
          dependency.prerequisites = api.dependencyArguments
            .map((arg) => arg.destination)
            .filter((member) => member !== value);
        }
        message.textContent = '';
        render();
      },
    },
  );
  dialog?.addEventListener('try-it-close', () => dropdown.close());
  const render = () => {
    const members = group ? settings.members : dependency.prerequisites;
    for (const check of checks) {
      check.checked = members.includes(check.value);
      if (!group)
        check.closest('label')!.hidden = check.value === dependency.dependent;
      check.disabled = group
        ? check.checked && members.length <= 2
        : check.value === dependency.dependent ||
          (check.checked && members.length <= 1);
    }
    if (group) {
      required!.setAttribute('aria-checked', String(settings.required));
      required!.disabled = settings.type === 'or';
      explorer.querySelector<HTMLElement>('[data-required-note]')!.hidden =
        settings.type !== 'or';
      dropdown.setValue(settings.type);
      singlePipe!.setAttribute(
        'aria-checked',
        String(!!settings.singlePipeForOr),
      );
      const body = explorer.querySelector('[data-combinations]')!;
      body.replaceChildren();
      for (const combination of api.groupCombinations(settings)) {
        const row = document.createElement('tr');
        const flags = document.createElement('td');
        flags.className = 'argument-spelling';
        flags.textContent =
          combination.present.map((arg) => '--' + arg).join(' ') || 'None';
        const result = document.createElement('td');
        result.textContent = combination.valid ? 'Pass' : 'Fail';
        result.dataset.valid = String(combination.valid);
        row.append(flags, result);
        body.append(row);
      }
      updatePreview(api.groupScript(settings), api.groupHelp(settings));
    } else {
      dropdown.setOptions(
        api.dependencyArguments.map((arg) => ({
          value: arg.destination,
          label: '--' + arg.long,
        })),
      );
      dropdown.setValue(dependency.dependent);
      for (const button of explorer.querySelectorAll<HTMLButtonElement>(
        '[data-switch^="present-"]',
      ))
        button.setAttribute(
          'aria-checked',
          String(present.includes(button.name)),
        );
      explorer.querySelector('[data-invocation]')!.textContent = [
        'app.sh',
        ...api.dependencyTokens(present),
      ].join(' ');
      const errors = api.dependencyErrors(dependency);
      const result = explorer.querySelector<HTMLElement>(
        '[data-presence-result]',
      )!;
      if (errors.length) {
        message.textContent = errors.join(' ');
        result.textContent = 'Choose prerequisites to update the preview.';
        result.removeAttribute('data-valid');
        return;
      }
      const outcome = api.dependencyOutcome(dependency, present);
      result.textContent = outcome.stdout || outcome.stderr;
      explorer.querySelector<HTMLElement>(
        '[data-explorer-shell]',
      )!.dataset.valid = String(outcome.status === 0);
      updatePreview(
        api.dependencyScript(dependency),
        api.dependencyHelp(dependency),
      );
    }
  };
  for (const check of checks)
    check.addEventListener('change', () => {
      const members = checks
        .filter((field) => field.checked)
        .map((field) => field.value);
      const errors = group
        ? api.groupErrors({ ...settings, members })
        : api.dependencyErrors({ ...dependency, prerequisites: members });
      message.textContent = errors.join(' ');
      if (errors.length) {
        check.checked = !check.checked;
        return;
      }
      if (group) settings.members = members;
      else dependency.prerequisites = members;
      render();
    });
  required?.addEventListener('click', () => {
    settings.required = !settings.required;
    render();
  });
  singlePipe?.addEventListener('click', () => {
    settings.singlePipeForOr = !settings.singlePipeForOr;
    render();
  });
  for (const button of explorer.querySelectorAll<HTMLButtonElement>(
    '[data-switch^="present-"]',
  ))
    button.addEventListener('click', () => {
      present = present.includes(button.name)
        ? present.filter((arg) => arg !== button.name)
        : [...present, button.name];
      render();
    });
  explorer.querySelector('[data-reset]')!.addEventListener('click', () => {
    settings = structuredClone(api.defaultGroup);
    dependency = structuredClone(api.defaultDependency);
    present = [];
    message.textContent = '';
    dropdown.close();
    render();
  });
  render();
}
