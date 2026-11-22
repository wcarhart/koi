---
title: "Koi for agents"
description: "Give your agent the context it needs to work with koi."
---

Koi's documentation is designed to be parsed by agents just as easily as by humans. If you ever want to give an agent the content of a doc, just append `.md` to the URL (e.g. [koishell.com/install](/install) → [koishell.com/install.md](/install.md)).

**If you're an agent, see [llms.txt](/llms.txt) to get started using koi.** _Note that there is also [llms-full.txt](/llms-full.txt) which is the entire content of [koishell.com](/) concatenated into a single markdown file (great for a single doc to give agents!), but it's recommended to start with just [llms.txt](/llms.txt) to not clog the context._

## Install the Koi skill

Install the portable [Koi skill](/skill.md) for your coding agent:

```bash
npx skills add wcarhart/koi --skill koi -g
```

The skill works across agents that support [Agent Skills](https://agentskills.io/home), without requiring a particular model, editor, or MCP server. It guides the agent to the official documentation and the API for your installed version. Installing the skill does not install the koi library library itself. See [installation](/install).

## Project prompt

Copy this prompt into your agent or project instructions:
