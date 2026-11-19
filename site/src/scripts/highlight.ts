import { createHighlighterCore } from 'shiki/core';
import { createJavaScriptRegexEngine } from 'shiki/engine/javascript';
import { enhanceApiCode } from './api-code';

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
  const text = script.trimEnd();
  // A field's change event can repeat its input update; keep focused API names intact.
  if (code.textContent === text) {
    enhanceApiCode(code);
    return;
  }
  const high = await highlighter;
  if (versions.get(code) !== version) return;
  const template = document.createElement('template');
  template.innerHTML = high.codeToHtml(text, {
    lang: 'bash',
    themes: { light: 'github-light', dark: 'github-dark' },
  });
  code.replaceChildren(...template.content.querySelector('code')!.childNodes);
  enhanceApiCode(code);
}
