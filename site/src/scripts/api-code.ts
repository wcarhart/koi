import { apiMentions, type ApiReference } from '../lib/api-references';

let references: ApiReference[] | undefined;
export function getApiReferences(): ApiReference[] {
  return (references ??= JSON.parse(
    document.getElementById('api-references')?.textContent || '[]',
  ));
}

export function enhanceApiCode(root: ParentNode = document): void {
  const codes =
    root instanceof HTMLElement && root.matches('pre code')
      ? [root]
      : [...root.querySelectorAll<HTMLElement>('pre')].map(
          (pre) => pre.querySelector<HTMLElement>('code') || pre,
        );
  for (const code of codes) {
    // Process each highlighted line separately, preserving its numbering and colors.
    for (const line of code.querySelectorAll('.line').length
      ? code.querySelectorAll('.line')
      : [code]) {
      if (line.querySelector('[data-api-reference]')) continue;
      const walker = document.createTreeWalker(line, NodeFilter.SHOW_TEXT);
      const nodes: { node: Text; start: number; end: number }[] = [];
      let offset = 0;
      while (walker.nextNode()) {
        const node = walker.currentNode as Text;
        nodes.push({ node, start: offset, end: offset + node.length });
        offset += node.length;
      }
      // Work backwards so earlier text offsets remain valid after wrapping.
      for (const match of apiMentions(
        line.textContent || '',
        getApiReferences(),
      ).reverse()) {
        const start = match.index;
        const end = start + match[0].length;
        const first = nodes.find(
          (entry) => entry.start <= start && entry.end > start,
        )!;
        const last = nodes.find(
          (entry) => entry.start < end && entry.end >= end,
        )!;
        const range = document.createRange();
        range.setStart(first.node, start - first.start);
        range.setEnd(last.node, end - last.start);
        const trigger = document.createElement('a');
        trigger.href = getApiReferences().find(
          (reference) => reference.title === match[0],
        )!.url;
        trigger.className = 'api-code-trigger';
        trigger.dataset.apiReference = match[0];
        trigger.setAttribute('aria-haspopup', 'dialog');
        trigger.setAttribute('aria-expanded', 'false');
        trigger.append(range.extractContents());
        range.insertNode(trigger);
      }
    }
  }
}
