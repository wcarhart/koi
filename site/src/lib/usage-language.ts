import type { LanguageRegistration } from 'shiki';

// Usage notation shares a few Bash expressions without being executable Bash.
export const usageLanguage: LanguageRegistration = {
  name: 'koi-usage',
  scopeName: 'source.koi-usage',
  patterns: [
    { match: '\\b__[A-Za-z_][A-Za-z0-9_]*\\b', name: 'entity.name.function' },
    { match: '\\|\\|', name: 'keyword.operator.logical' },
    { match: '\\breturn\\b', name: 'keyword.control' },
    {
      begin: '"',
      end: '"',
      name: 'string.quoted.double',
      patterns: [{ include: '#variable' }],
    },
    { include: '#variable' },
    {
      match: '(?<![\\w-])--?[A-Za-z][A-Za-z0-9_-]*',
      name: 'variable.parameter',
    },
    { match: '\\b[A-Z][A-Z0-9_]*\\b', name: 'constant.other' },
    { match: '[\\[\\]()|]', name: 'punctuation.definition.usage' },
  ],
  repository: {
    variable: {
      match: '\\$(?:[A-Za-z_][A-Za-z0-9_]*|[@*?]|\\{[A-Za-z_][A-Za-z0-9_]*\\})',
      name: 'variable',
    },
  },
};
