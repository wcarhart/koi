import type { LanguageRegistration } from 'shiki';

// In a shell transcript, only lines beginning with "$ " are commands.
export const shellLanguage: LanguageRegistration = {
  name: 'koi-shell',
  scopeName: 'text.koi-shell',
  repository: {},
  patterns: [
    {
      begin: '^(\\$) ',
      beginCaptures: { 1: { name: 'punctuation.definition.prompt' } },
      end: '$',
      patterns: [{ include: 'source.shell' }],
    },
  ],
};
