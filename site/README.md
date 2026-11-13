# koishell.com
This is the landing and docs site for koi. Its content is wholly separate from the koi Bash library and functionality.

## Local development
Use the Node version in `.node-version` and PNPM version in the root
`packageManager` field. Bash 5.2+ must be on `PATH` for executable example checks.

You need Node and PNPM as specified in [.node-version](../.node-version) and [package.json](../package.json), as well as Bash 5.2+ installed on the `PATH`.

From the repository root:
```bash
pnpm install --frozen-lockfile
pnpm dev
```

Also available:
```bash
pnpm format:check
pnpm check
pnpm test:site
pnpm test:examples
pnpm build
pnpm preview
```

To run browser and accessibility checks:
```bash
pnpm --filter @koi/site exec playwright install chromium
pnpm test:browser
```

## Authoring
All published docs prose lives in `docs/`. Use `docs/navigation.json` for the section order of `/docs`. Keep prose short and sweet, and _NEVER_ check in LLM generated documentation without rigorous human review.

Each section has frontmatter:
```yaml
---
title: 'Your section title'
description: 'One sentence introducing the section.'
layout: article
# draft: true
---
```

Other conventions:
* start body headings with `##`, not `#`
* use `article` for narrative docs (even with interleaved code blocks)
* use `draft: true` for draft docs
* use `split` for prose + code examples side-by-side

## Examples and builders
Use a reviewed fixture instead of copying a whole script into multiple pages:
```md
<!-- koi:include greet.sh -->
<!-- koi:include greet-help.txt -->
```
Includes only accept simple `.sh` and `.txt` filenames from `docs/examples/`. They become ordinary fenced code in both HTML and Markdown exports. The build **does not execute Markdown or includes**.

Line numbers are off by default. Add `line-numbers` after the language on a code fence to show them:

````md
```bash line-numbers
printf 'Hello, world!\n'
```
````

For included snippets, use `<!-- koi:include greet.sh line-numbers -->`. You can also use `line-numbers=true` or `line-numbers=false` on fences and includes to explicitly show or hide numbers. Numbering starts at 1 for each block and includes blank lines. Copying code copies only the source text.

The `addarg` and `help` manifest component identifiers attach code builders to split sections. Builders generate Bash text locally, never execute it, and keep the last valid script when controls are invalid. The first example code block must contain the matching default builder script.

## Deployment
Deployed via Netlify to koishell.com. See [netlify.toml](../netlify.toml).

## Agents
We want koishell.com to be well optimized for agents and LLM access. It's not unreasonable for human devs to just send their agent to the site. Ways we're promoting LLM access:
* `docs/llms.md` is the single plain-Markdown source for `/llms.txt`, which is the default entrypoint for LLMs accessing the site
* humans can also visit `/agents` for guidance
* all markdown content from `/docs` pages can be viewed raw by agents by appending the `.md` ending, e.g. `/docs/install` (human docs) --> `/docs/install.md` (agent docs)
* any docs content can be copied as markdown
