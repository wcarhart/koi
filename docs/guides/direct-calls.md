---
title: "Calls and command routing"
description: "How direct function calls and registered command paths execute."
layout: article
---

> Authoring outline: documentation to be written.

## Direct calls and entrypoints

- TODO: Explain that parsing functions remain ordinary Bash functions and do not need `__addcommand` registration for direct or function-to-function calls.
- TODO: Compare `main "$@"`, a custom entrypoint that prepares inputs and calls a parsing function, and root registration followed by `__koirun "$@"`.
- TODO: Distinguish root registration from function registration and link their lifecycle to [registration contexts and blocks](/docs/guides/lifecycle).
- TODO: Explain that direct calls use script-only usage text and fallback function descriptions, whereas routed calls use the selected CLI path and registered description.

## Explicit registration and incremental discovery

- TODO: Distinguish a CLI command name from its handler function; cover aliases sharing a handler and selected-alias help text.
- TODO: Explain that ambient functions are never discovered automatically and every registered handler must reach guarded parsing, including handlers with no custom arguments.
- TODO: Explain that a context initially knows only its immediate children; descendants become known as handlers execute their declarations. Verbose help traverses those handlers rather than reading a prebuilt global tree.

## Branches and leaves

- TODO: Define a branch as a context with application children and a leaf as one without them. Built-in help commands do not turn leaves into branches.
- TODO: Explain that a branch dispatches a selected child or shows help when no child is selected; it never continues into local business logic after parsing.
- TODO: Explain leaf continuation after successful parsing and the prohibition on positionals and application children in the same context.
- TODO: Distinguish runner-provided branch `help` commands from automatic `-h`/`--help`; direct calls outside the runner do not acquire built-in help commands.

## Argument ownership along a route

- TODO: Trace an invocation such as `app -v deploy -e staging`: root owns `-v`; the child receives everything after `deploy` and owns `-e`.
- TODO: Explain that parent spellings are not inherited and a child may reuse them; distinguish recognition of spellings from destination visibility under [Bash scope](/docs/concepts/destination-variables-and-scope).
- TODO: Explain forwarding boundaries, including `--`, and why routing to child help still requires valid ancestor arguments.
- TODO: Link complete task walkthroughs to [building an application](/docs/guides/commands) and [reusing parsing functions](/docs/guides/reuse-parsing-functions).
