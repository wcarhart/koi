export interface DropdownController {
  setValue(value: string): void;
  setDisabled(disabled: boolean): void;
  close(): void;
}

interface DropdownCallbacks {
  onOpen?: () => void;
  onChange?: (value: string) => void;
}

// Initialize a rendered Dropdown; callers own selection side effects and menu coordination.
export function initDropdown(
  root: HTMLElement,
  { onOpen, onChange }: DropdownCallbacks = {},
): DropdownController {
  const trigger = root.querySelector<HTMLButtonElement>('.dropdown-trigger')!;
  const label = trigger.querySelector<HTMLElement>('span')!;
  const choices = root.querySelector<HTMLElement>('[role=listbox]')!;
  const options = [
    ...choices.querySelectorAll<HTMLButtonElement>('[role=option]'),
  ];
  const close = () => {
    choices.hidden = true;
    trigger.setAttribute('aria-expanded', 'false');
  };
  const setValue = (value: string) => {
    const selected = options.find((option) => option.dataset.value === value);
    if (!selected) return;
    label.textContent = selected.textContent!.trim();
    options.forEach((option) =>
      option.setAttribute('aria-selected', String(option === selected)),
    );
  };

  trigger.addEventListener('click', () => {
    const opening = choices.hidden;
    onOpen?.();
    close();
    if (!opening) return;
    choices.hidden = false;
    trigger.setAttribute('aria-expanded', 'true');
    options
      .find((option) => option.getAttribute('aria-selected') === 'true')!
      .focus();
  });
  options.forEach((option) =>
    option.addEventListener('click', () => {
      setValue(option.dataset.value!);
      onChange?.(option.dataset.value!);
      close();
      trigger.focus();
    }),
  );
  trigger.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      if (choices.hidden) trigger.click();
    }
  });
  choices.addEventListener('keydown', (event) => {
    const index = options.indexOf(document.activeElement as HTMLButtonElement);
    if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
      event.preventDefault();
      options[
        event.key === 'Home'
          ? 0
          : event.key === 'End'
            ? options.length - 1
            : (index + (event.key === 'ArrowDown' ? 1 : -1) + options.length) %
              options.length
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
    setDisabled: (disabled) => {
      trigger.disabled = disabled;
    },
    close,
  };
}
