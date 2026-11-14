import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import matter from 'gray-matter';
import { Marked, type Token, type Tokens } from 'marked';
import GithubSlugger from 'github-slugger';
import { createHighlighter } from 'shiki';
import { copyIcon, escapeHtml } from './html';
import {
  installMethods,
  renderInstallBox,
  installMarkdown,
  type InstallKind,
} from './install';
import type { SearchEntry } from './search';
import { docsIndexes } from './docs-indexes';

declare const __KOI_REPO_ROOT__: string;
export const root =
  typeof __KOI_REPO_ROOT__ !== 'undefined'
    ? __KOI_REPO_ROOT__
    : fileURLToPath(new URL('../../../', import.meta.url));
export const docsRoot = path.join(root, 'docs');
export const exampleMarker = '<!-- koi:example -->';
export { copyIcon, escapeHtml } from './html';
export interface ManifestEntry {
  navTitle?: string;
  file: string;
  slug: string;
  group: string;
  interactive?: 'addarg' | 'help';
}
export interface Doc extends ManifestEntry {
  title: string;
  description: string;
  layout: 'article' | 'split';
  id: string;
  url: string;
  markdown: string;
  prose: string;
  example: string;
  headings: { title: string; id: string; fragment: string }[];
  search: SearchEntry[];
}
export function sectionId(slug: string): string {
  return `doc-${slug.replaceAll('/', '-') || 'introduction'}`;
}
export function sectionUrl(slug: string): string {
  return slug ? `/docs/${slug}` : '/docs';
}
export function cleanMarkdown(body: string): string {
  return (
    body
      .replaceAll(exampleMarker, '')
      .replace(/<!-- koi:install (koi|bash) -->/g, (_, kind: InstallKind) =>
        installMarkdown(installMethods[kind]),
      )
      .trim() + '\n'
  );
}
export function validateManifest(entries: ManifestEntry[]): void {
  const slugs = new Set<string>();
  const files = new Set<string>();
  const ids = new Set<string>();
  for (const entry of entries) {
    if (
      (entry.slug && !/^[a-z0-9-]+(?:\/[a-z0-9-]+)*$/.test(entry.slug)) ||
      slugs.has(entry.slug) ||
      ids.has(sectionId(entry.slug))
    )
      throw new Error(
        `Duplicate or invalid documentation route: ${entry.slug}`,
      );
    if (
      files.has(entry.file) ||
      !entry.file.endsWith('.md') ||
      entry.file.includes('..') ||
      path.isAbsolute(entry.file)
    )
      throw new Error(`Duplicate or invalid source: ${entry.file}`);
    if (!entry.group?.trim())
      throw new Error(`Missing navigation group: ${entry.file}`);
    if (entry.interactive && !['addarg', 'help'].includes(entry.interactive))
      throw new Error(`Unknown interactive component: ${entry.interactive}`);
    slugs.add(entry.slug);
    files.add(entry.file);
    ids.add(sectionId(entry.slug));
  }
}
const highlighter = createHighlighter({
  themes: ['github-light', 'github-dark'],
  langs: ['bash', 'text', 'json'],
});
export async function renderMarkdown(
  body: string,
  prefix: string,
  docLinks: Map<string, string> = new Map(),
  options: {
    copy?: boolean;
    route?: string;
    anchors?: boolean;
    slugger?: GithubSlugger;
  } = {},
): Promise<{
  html: string;
  headings: { title: string; id: string; fragment: string }[];
}> {
  const high = await highlighter;
  const slugger = options.slugger ?? new GithubSlugger();
  const headings: { title: string; id: string; fragment: string }[] = [];
  const md = new Marked({ gfm: true });
  md.use({
    renderer: {
      html({ text }: Tokens.HTML | Tokens.Tag) {
        return text.replace(
          /<!-- koi:install (koi|bash) -->/g,
          (_, kind: InstallKind) =>
            renderInstallBox(
              installMethods[kind],
              `${prefix || 'install'}-${kind}`,
              kind === 'bash'
                ? 'Bash installation platform'
                : 'Installation method',
            ),
        );
      },
      blockquote({ tokens }: Tokens.Blockquote) {
        const first = tokens[0];
        if (first?.type === 'paragraph') {
          const match = first.text.match(
            /^\[!(WARNING|NOTE|IMPORTANT)\]([^\n]*)(?:\n|$)/,
          );
          if (match) {
            const kind = match[1] === 'WARNING' ? 'warning' : 'information';
            const title =
              match[2].trim() ||
              (kind === 'warning' ? 'Warning' : 'Information');
            const titleTokens = md.Lexer.lexInline(title, md.defaults);
            const titleHtml = this.parser.parseInline(titleTokens);
            const titleText = this.parser.parseInline(
              titleTokens,
              this.parser.textRenderer,
            );
            const shape =
              kind === 'warning'
                ? '<path d="M10.3 3.9 2.6 17.2A2 2 0 0 0 4.3 20h15.4a2 2 0 0 0 1.7-2.8L13.7 3.9a2 2 0 0 0-3.4 0Z"/>'
                : '<circle cx="12" cy="12" r="9"/>';
            const icon = `<svg class="callout-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${shape}<path d="M12 8v5"/><circle cx="12" cy="16.5" r=".8" fill="currentColor" stroke="none"/></svg>`;
            const body = first.text.slice(match[0].length);
            const remaining = body
              ? [...md.lexer(body), ...tokens.slice(1)]
              : tokens.slice(1);
            return `<aside class="callout callout-${kind}" aria-label="${escapeHtml(titleText)}"><p class="callout-title">${icon}<span>${titleHtml}</span></p>${this.parser.parse(remaining)}</aside>`;
          }
        }
        return `<blockquote>${this.parser.parse(tokens)}</blockquote>`;
      },
      heading({ tokens, depth }: Tokens.Heading) {
        const title = tokens
          .map((t) => ('text' in t ? String(t.text) : ''))
          .join('');
        const fragment = slugger.slug(title);
        const id = `${prefix ? `${prefix}-` : ''}${fragment}`;
        if (options.anchors === false)
          return `<h${depth}>${this.parser.parseInline(tokens)}</h${depth}>`;
        headings.push({ title, id, fragment });
        return `<h${depth} id="${id}"${options.route ? ` data-fragment="${fragment}"` : ''}><a class="heading-anchor" href="${options.route ? `${options.route}#${fragment}` : `#${id}`}">${this.parser.parseInline(tokens)}</a></h${depth}>`;
      },
      code({ text, lang }: Tokens.Code) {
        const [language, ...metadata] = (lang || 'text').trim().split(/\s+/);
        const lineNumbers =
          metadata.some(
            (value) =>
              value === 'line-numbers' || value === 'line-numbers=true',
          ) && !metadata.includes('line-numbers=false');
        const html = high.codeToHtml(text, {
          lang: ['bash', 'sh', 'shell'].includes(language)
            ? 'bash'
            : language === 'json'
              ? 'json'
              : 'text',
          themes: { light: 'github-light', dark: 'github-dark' },
          transformers: lineNumbers
            ? [
                {
                  line(node, line) {
                    node.properties['data-line-number'] = line;
                  },
                },
              ]
            : [],
        });
        const copy =
          options.copy === false
            ? ''
            : `<button type="button" class="copy-button" data-copy-code aria-label="Copy code">${copyIcon}</button>`;
        return `<div class="code-block"><div class="code-label"><span>${escapeHtml(language)}</span>${copy}</div>${html}</div>`;
      },
      link({ href, title, tokens }: Tokens.Link) {
        const [base, hash] = href.split('#');
        const resolved = docLinks.get(base) || base || options.route || '';
        const target = hash ? `${resolved}#${hash}` : resolved;
        const destination = new URL(target, 'https://koishell.com');
        const external =
          ['http:', 'https:'].includes(destination.protocol) &&
          destination.origin !== 'https://koishell.com';
        return `<a href="${escapeHtml(target)}"${title ? ` title="${escapeHtml(title)}"` : ''}${external ? ' target="_blank" rel="noopener noreferrer"' : ''}>${this.parser.parseInline(tokens)}</a>`;
      },
    },
  });
  return { html: await md.parse(body), headings };
}
export function expandIncludes(body: string): string {
  return body.replace(
    /<!-- koi:include ([a-z0-9-]+\.(?:sh|txt))(?: (line-numbers(?:=(?:true|false))?))? -->/g,
    (_, file: string, metadata?: string) => {
      const source = path.join(docsRoot, 'examples', file);
      if (!existsSync(source))
        throw new Error(`Missing example include: ${file}`);
      return `\n\`\`\`${file.endsWith('.sh') ? 'bash' : 'text'}${metadata ? ` ${metadata}` : ''}\n${readFileSync(source, 'utf8').trimEnd()}\n\`\`\`\n`;
    },
  );
}
function plainText(markdown: string): string {
  return markdown
    .replace(/<!--[^]*?-->/g, '')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/[#*`>|]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}
let docsPromise: Promise<Doc[]> | undefined;
export function getDocs(): Promise<Doc[]> {
  return (docsPromise ??= loadDocs());
}
async function loadDocs(): Promise<Doc[]> {
  const entries = JSON.parse(
    readFileSync(path.join(docsRoot, 'navigation.json'), 'utf8'),
  ) as ManifestEntry[];
  validateManifest(entries);
  const docs: Doc[] = [];
  for (const entry of entries) {
    const { data, content } = matter(
      readFileSync(path.join(docsRoot, entry.file), 'utf8'),
    );
    if (
      typeof data.title !== 'string' ||
      !data.title ||
      typeof data.description !== 'string' ||
      !data.description ||
      !['article', 'split'].includes(data.layout) ||
      (data.draft !== undefined && typeof data.draft !== 'boolean')
    )
      throw new Error(`Invalid frontmatter: ${entry.file}`);
    if (data.draft) continue;
    const body = expandIncludes(content);
    const pieces = body.split(exampleMarker);
    if (
      pieces.length > 2 ||
      (data.layout === 'split' && pieces.length !== 2) ||
      (data.layout === 'article' && pieces.length !== 1)
    )
      throw new Error(`Layout marker mismatch: ${entry.file}`);
    const id = sectionId(entry.slug);
    const reference = entry.slug.startsWith('reference/');
    const slugger = new GithubSlugger();
    const prose = await renderMarkdown(pieces[0], id, new Map(), {
      route: sectionUrl(entry.slug),
      slugger,
    });
    const example = pieces[1]
      ? await renderMarkdown(pieces[1], `${id}-example`, new Map(), {
          anchors: !reference,
          route: sectionUrl(entry.slug),
          slugger,
        })
      : { html: '', headings: [] };
    const url = sectionUrl(entry.slug);
    const markdown = cleanMarkdown(body);
    const headings = [...prose.headings, ...example.headings];
    const search: SearchEntry[] = [
      {
        title: data.title,
        section: data.title,
        group: entry.group,
        url,
        text: plainText(markdown),
      },
    ];
    // Heading-level entries make long reference sections independently discoverable.
    const chunks = pieces[0].split(/^#{1,6}\s+.+$/m).slice(1);
    for (const [index, heading] of prose.headings.entries())
      search.push({
        title: heading.title,
        section: data.title,
        group: entry.group,
        url: `${url}#${heading.fragment}`,
        text: plainText(chunks[index] || markdown).slice(0, 1600),
      });
    docs.push({
      ...entry,
      title: data.title,
      description: data.description,
      layout: data.layout,
      id,
      url,
      markdown,
      prose: prose.html,
      example: example.html,
      headings,
      search,
    });
  }
  if (docs[0]?.slug !== '')
    throw new Error(
      'The first published section must be the /docs introduction.',
    );
  const allIds = new Set<string>();
  for (const doc of docs) {
    if (doc.interactive && doc.layout !== 'split')
      throw new Error(`Interactive sections need a split layout: ${doc.file}`);
    for (const id of [doc.id, ...doc.headings.map((heading) => heading.id)]) {
      if (allIds.has(id))
        throw new Error(`Duplicate document or heading ID: ${id}`);
      allIds.add(id);
    }
  }
  validateLinks(docs);
  return docs;
}
export function validateLinks(docs: Doc[]): void {
  const routes = new Map(
    docs.map((d) => [
      d.url,
      new Set([d.id, ...d.headings.flatMap((h) => [h.id, h.fragment])]),
    ]),
  );
  const standalone = new Set([
    '/',
    '/install',
    '/playground',
    '/agents',
    '/llms.txt',
    ...docsIndexes.map((index) => index.url),
  ]);
  for (const doc of docs) {
    const tokens = new Marked().lexer(doc.markdown);
    new Marked().walkTokens(tokens, (token: Token) => {
      if (token.type !== 'link' && token.type !== 'image') return;
      const href = (token as Tokens.Link).href;
      if (/^(https?:|mailto:)/.test(href)) return;
      if (href.startsWith('#')) {
        if (!routes.get(doc.url)?.has(href.slice(1)))
          throw new Error(`Broken heading link ${href} in ${doc.file}`);
        return;
      }
      const [route, hash] = href.split('#');
      if (routes.has(route)) {
        if (hash && !routes.get(route)!.has(hash))
          throw new Error(`Broken heading link ${href} in ${doc.file}`);
      } else if (
        !standalone.has(route) &&
        !existsSync(path.join(root, 'site/public', route))
      )
        throw new Error(`Broken internal link ${href} in ${doc.file}`);
    });
  }
}
export function exportMarkdown(doc: Doc): string {
  // Make root-relative Markdown destinations useful outside the site as well.
  const markdown = doc.markdown.replace(
    /\]\((\/(?!\/)[^\s)]*)(?:\s+"([^"]*)")?\)/g,
    (_match, url: string, title?: string) =>
      `](https://koishell.com${url}${title ? ` "${title}"` : ''})`,
  );
  return matter.stringify(markdown, {
    title: doc.title,
    subtitle: doc.description,
  });
}
