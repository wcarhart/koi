---
title: "Build a command-line application"
description: "Register commands and route through nested handlers."
layout: article
---

> Authoring outline: documentation to be written.

## Register the root interface

- TODO: Start from a complete script using existing command examples; register root options and commands at script scope, then call `__koirun "$@"` once.
- TODO: Show command names, handler functions, descriptions, and aliases; link exact registration parameters to [__addcommand](/docs/reference/addcommand).
- TODO: Link the choice between a runner and a function entrypoint to [calls and command routing](/docs/guides/direct-calls).

## Add branches and leaves

- TODO: Build a branch that registers immediate children and closes with guarded parsing; every registered handler must reach its parse, even without custom arguments.
- TODO: Put business logic in leaf handlers and explain why a branch with no selected child shows help rather than performing a default action.
- TODO: Show deeper nesting, selected-alias help, and the prohibition on declaring positionals alongside application children.

## Route options and failures

- TODO: Trace valid and invalid parent-option placement, child option reuse, exact argument forwarding, and ancestor destination visibility.
- TODO: Show explicit business-operation failure handling and status propagation, linking the nested-dispatch `set -e` behavior to [parsing and control flow](/docs/concepts/parsing-and-control-flow).
- TODO: Plan invocations for root help, branch help, leaf help, a successful route, and a failing route, using [the nested-command example](/docs/examples/commands).
- TODO: Keep setup side effects out of help traversal; link help configuration to [customizing generated help](/docs/guides/help).
