import { copyIcon, ctaArrow, escapeHtml } from './html';

export type InstallMethod = {
  id: string;
  label: string;
} & ({ command: string } | { href: string; text: string });
export type InstallKind = 'koi' | 'bash';
export const installMethods: Record<InstallKind, InstallMethod[]> = {
  koi: [
    {
      id: 'homebrew',
      label: 'Homebrew',
      command: 'brew tap wcarhart/koi && brew install wcarhart/koi/koi',
    },
    { id: 'apt', label: 'apt', command: 'sudo apt install koi' },
    { id: 'pacman', label: 'pacman', command: 'sudo pacman -S koi' },
    { id: 'dnf', label: 'dnf', command: 'sudo dnf install koi' },
    { id: 'apk', label: 'apk', command: 'sudo apk add koi' },
    { id: 'mise', label: 'mise', command: 'mise use -g koi@latest' },
  ],
  bash: [
    {
      id: 'ubuntu-debian',
      label: 'Ubuntu/Debian',
      command: 'sudo apt-get install bash',
    },
    {
      id: 'fedora-rhel',
      label: 'Fedora/RHEL',
      command: 'sudo dnf install bash',
    },
    { id: 'windows', label: 'Windows 10/11', command: 'wsl --install' },
    { id: 'macos', label: 'macOS', command: 'brew install bash' },
  ],
};

export function installMarkdown(methods: InstallMethod[]): string {
  return methods
    .map((method) =>
      'command' in method
        ? `${method.label}:\n\n\`\`\`bash\n${method.command}\n\`\`\``
        : `${method.label}: [${method.text}](${method.href})`,
    )
    .join('\n\n');
}

export function renderInstallBox(
  methods: InstallMethod[],
  idPrefix: string,
  label = 'Installation method',
): string {
  const tabs = methods
    .map((method, index) => {
      const id = escapeHtml(`${idPrefix}-${method.id}`);
      return `<button id="${id}-tab" type="button" role="tab" aria-selected="${index === 0}" aria-controls="${id}" tabindex="${index === 0 ? 0 : -1}">${escapeHtml(method.label)}</button>`;
    })
    .join('');
  const panels = methods
    .map((method, index) => {
      const id = escapeHtml(`${idPrefix}-${method.id}`);
      const content =
        'command' in method
          ? `<div class="install-command code-block"><pre><code>${escapeHtml(method.command)}</code></pre>
          <button type="button" class="copy-button" data-copy-code aria-label="Copy ${escapeHtml(method.label)} command">${copyIcon}</button></div>`
          : `<a class="button" href="${escapeHtml(method.href)}" target="_blank" rel="noopener noreferrer">${escapeHtml(method.text)} ${ctaArrow}</a>`;
      return `<div id="${id}" class="install-panel" role="tabpanel" aria-labelledby="${id}-tab" tabindex="0"${index ? ' hidden' : ''}>${content}</div>`;
    })
    .join('');
  return `<div class="install-box" data-install-tabs><div class="install-tabs" role="tablist" aria-label="${escapeHtml(label)}">${tabs}</div><div class="install-panels">${panels}</div></div>`;
}
