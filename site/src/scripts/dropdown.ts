export interface DropdownOption {
  value: string;
  label: string;
  displayLabel?: string;
  prefix?: string;
  disabled?: boolean;
}
export interface DropdownController {
  setValue(value: string): void;
  setOptions(options: readonly DropdownOption[]): void;
  setDisabled(disabled: boolean): void;
  close(): void;
}
interface DropdownCallbacks {
  onOpen?: () => void;
  onChange?: (value: string) => void;
}

// Callers own selection side effects; delegated events also support dynamic options.
export function initDropdown(
  root: HTMLElement,
  { onOpen, onChange }: DropdownCallbacks = {},
): DropdownController {
  const trigger = root.querySelector<HTMLButtonElement>('.dropdown-trigger')!;
  const label = trigger.querySelector<HTMLElement>('span')!;
  const choices = root.querySelector<HTMLElement>('[role=listbox]')!;
  // Preserve component-scoped style attributes on dynamically created options.
  const optionTemplate = choices
    .querySelector<HTMLButtonElement>('[role=option]')!
    .cloneNode(false) as HTMLButtonElement;
  const options = () => [
    ...choices.querySelectorAll<HTMLButtonElement>('[role=option]'),
  ];
  const enabledOptions = () => options().filter((option) => !option.disabled);
  let value = options().find(
    (option) => option.getAttribute('aria-selected') === 'true',
  )?.dataset.value;
  const close = () => {
    choices.hidden = true;
    trigger.setAttribute('aria-expanded', 'false');
  };
  const setValue = (next: string) => {
    const selected = enabledOptions().find(
      (option) => option.dataset.value === next,
    );
    if (!selected) return;
    value = next;
    label.textContent =
      selected.dataset.displayLabel ?? selected.textContent!.trim();
    options().forEach((option) =>
      option.setAttribute('aria-selected', String(option === selected)),
    );
  };
  const setOptions = (entries: readonly DropdownOption[]) => {
    close();
    choices.replaceChildren();
    for (const entry of entries) {
      const option = optionTemplate.cloneNode(false) as HTMLButtonElement;
      option.removeAttribute('aria-label');
      option.removeAttribute('data-display-label');
      option.type = 'button';
      option.role = 'option';
      option.tabIndex = -1;
      option.disabled = !!entry.disabled;
      option.dataset.value = entry.value;
      if (entry.displayLabel) {
        option.dataset.displayLabel = entry.displayLabel;
        option.setAttribute('aria-label', entry.displayLabel);
      }
      if (entry.prefix !== undefined) {
        const prefix = document.createElement('span');
        prefix.className = 'command-branch-prefix';
        prefix.setAttribute('aria-hidden', 'true');
        prefix.textContent = entry.prefix;
        option.append(prefix, document.createTextNode(entry.label));
      } else option.textContent = entry.label;
      choices.append(option);
    }
    const enabled = entries.filter((entry) => !entry.disabled);
    if (enabled.length)
      setValue(
        enabled.some((entry) => entry.value === value)
          ? value!
          : enabled[0].value,
      );
  };
  trigger.addEventListener('click', () => {
    const opening = choices.hidden;
    onOpen?.();
    close();
    if (!opening) return;
    choices.hidden = false;
    trigger.setAttribute('aria-expanded', 'true');
    enabledOptions()
      .find((option) => option.getAttribute('aria-selected') === 'true')
      ?.focus();
  });
  choices.addEventListener('click', (event) => {
    const option = (event.target as Element).closest<HTMLButtonElement>(
      '[role=option]',
    );
    if (!option || option.disabled || !choices.contains(option)) return;
    setValue(option.dataset.value!);
    onChange?.(option.dataset.value!);
    close();
    trigger.focus();
  });
  trigger.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      if (choices.hidden) trigger.click();
    }
  });
  choices.addEventListener('keydown', (event) => {
    const items = enabledOptions();
    const index = items.indexOf(document.activeElement as HTMLButtonElement);
    if (
      ['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key) &&
      items.length
    ) {
      event.preventDefault();
      items[
        event.key === 'Home'
          ? 0
          : event.key === 'End'
            ? items.length - 1
            : (index + (event.key === 'ArrowDown' ? 1 : -1) + items.length) %
              items.length
      ].focus();
    } else if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      close();
      trigger.focus();
    } else if (event.key === 'Tab') close();
  });
  document.addEventListener('click', (event) => {
    if (!trigger.parentElement!.contains(event.target as Node)) close();
  });
  return {
    setValue,
    setOptions,
    setDisabled: (disabled) => {
      trigger.disabled = disabled;
    },
    close,
  };
}
