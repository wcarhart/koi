export const productionSite = 'https://koishell.com';
export const newChatUrls = {
  chatgpt: 'https://chat.openai.com/',
  claude: 'https://claude.ai/code/new',
};

export function docActionLinks(docPath: string) {
  const base = /^\/docs\/v\d+\.\d+\.\d+(?=\/|$)/.exec(docPath)?.[0];
  const index = base
    ? `${productionSite}${base}/llms.txt`
    : `${productionSite}/llms.txt`;
  const markdown = `${productionSite}${docPath}.md`;
  const prompt = `I'm using Koi, a Bash argument parsing library.

Read the following documentation and help me understand
or use the functionality it describes:

${markdown}

Use the official Koi documentation at
${index} for any additional context.
Don't invent APIs or syntax that aren't documented.`;
  const chatgpt = new URL(newChatUrls.chatgpt);
  chatgpt.searchParams.set('q', prompt);
  const claude = new URL(newChatUrls.claude);
  claude.searchParams.set('q', prompt);
  const issue = new URL('https://github.com/wcarhart/koi/issues/new');
  issue.searchParams.set('title', `Problem with ${docPath}`);
  issue.searchParams.set(
    'body',
    `I found a problem with koi or its documentation at [${docPath}](${productionSite}${docPath}).

<!-- Describe the issue with this documentation. -->`,
  );
  return {
    markdown,
    chatgpt: chatgpt.href,
    claude: claude.href,
    issue: issue.href,
  };
}
