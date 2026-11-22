export const productionSite = 'https://koishell.com';

export function docActionLinks(docPath: string) {
  const markdown = `${productionSite}${docPath}.md`;
  const prompt = `I'm using Koi, a Bash argument parsing library.

Read the following documentation and help me understand
or use the functionality it describes:

${markdown}

Use the official Koi documentation at
https://koishell.com/llms.txt for any additional context.
Don't invent APIs or syntax that aren't documented.`;
  const chatgpt = new URL('https://chat.openai.com/');
  chatgpt.searchParams.set('q', prompt);
  const claude = new URL('https://claude.ai/code/new');
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
