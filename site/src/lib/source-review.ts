export const reviewPromptPrefix = `I want to use the library Koi to power argument parsing in my Bash script,\nbut in order to use it I need to \`source koi\` in my script. Is there any\nrisk or malicious intent in this library? I've included the following source\ncode for \`koi\` below in its entirety [0], but you can also read its full\ndocs at https://koishell.com/llms.txt.

[0]:
`;

export function sourceReviewPrompt(source: string): string {
  return reviewPromptPrefix + source;
}

export function sourceReviewUrl(version: string): string {
  return `/review-source?version=${encodeURIComponent(version)}`;
}

// Release snapshots predate this site-wide installation guidance.
export function installationReviewLink(body: string, version: string): string {
  const href = sourceReviewUrl(version);
  if (/\]\(\/review-source(?:\?[^)]*)?\)/.test(body)) {
    return body.replace(/\]\(\/review-source(?:\?[^)]*)?\)/g, `](${href})`);
  }
  return body.replace(
    /(^```bash\r?\nsource koi\r?\n```)(?=\r?\n|$)/m,
    `$1\n\n**Nervous to source an unknown script?** _[Review the source >](${href})_`,
  );
}
