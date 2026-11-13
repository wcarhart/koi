import { createHighlighterCore } from 'shiki/core';
import { createJavaScriptRegexEngine } from 'shiki/engine/javascript';

const highlighter = createHighlighterCore({
  themes: [
    import('shiki/themes/github-light.mjs'),
    import('shiki/themes/github-dark.mjs'),
  ],
  langs: [import('shiki/langs/bash.mjs')],
  engine: createJavaScriptRegexEngine(),
});
const versions = new WeakMap<HTMLElement, number>();
export async function highlightScript(
  code: HTMLElement,
  script: string,
): Promise<void> {
  const version = (versions.get(code) || 0) + 1;
  versions.set(code, version);
  const high = await highlighter;
  if (versions.get(code) !== version) return;
  const template = document.createElement('template');
  template.innerHTML = high.codeToHtml(script.trimEnd(), {
    lang: 'bash',
    themes: { light: 'github-light', dark: 'github-dark' },
  });
  code.replaceChildren(...template.content.querySelector('code')!.childNodes);
}
