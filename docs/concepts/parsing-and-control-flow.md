---
title: "Parsing and control flow"
description: "Why guarded parsing controls help, errors, and dispatch."
layout: article
---

> Authoring outline: documentation to be written.

## The parsing boundary and required guard

- TODO: Trace preparation → registration → guarded parsing → business logic and explain why an ordinary helper cannot return from its caller.
- TODO: Explain the exact required form `__parseargs "$@" || return "$koi_status"`; a bare parse and a guard hidden in another function cannot implement the caller's control flow.
- TODO: Link the block lifecycle and assignment timing to [registration contexts and blocks](/docs/guides/lifecycle).

## Parser result and caller result

- TODO: Document parser return `0` as continue locally with `koi_status=0`, `1` as stop after help/dispatch, and `2` as an error with `koi_status=2`.
- TODO: Explain that help sets `koi_status=0`, while dispatch sets it to the child's actual status; parser return `1` is a control signal, not necessarily failure.
- TODO: Show why `|| return $?` turns successful help into failure and loses child results. Read transient `koi_status` only in the immediate guard.
- TODO: Explain that the guard exits the current function, not every ancestor; application callers must propagate failures or stop their own work explicitly when needed.
- TODO: Contrast the runner's final status with parser control signals: `__koirun` returns `0` for help and terminal parsing, so code after it cannot distinguish those outcomes. Prefer a guarded function entrypoint for local business logic.

## Presence, values, and defaults

- TODO: Explain explicit presence separately from value: an empty string is supplied input, and an old destination value does not satisfy requiredness.
- TODO: Explain optional/required arguments, fresh defaults on successful parsing, absent flags assigning `0`, and absent optional scalar values assigning their default or an empty string.
- TODO: Explain required arguments cannot have defaults, required positionals precede optional ones, and optional positional slots cannot be skipped implicitly.
- TODO: Explain repeated scalar options keeping the last value by default and optional duplicate rejection; do not imply repeated inputs create arrays.

## Help executes application code

- TODO: Explain that detailed help executes preparation and registration code before reaching the parser; keep external side effects after guarded parsing.
- TODO: Explain that help bypasses current-context presence checks and assignments but not invalid declarations/layouts; routed child help can still require valid ancestors.
- TODO: Explain that verbose help traverses handlers and can repeat pre-parse effects; inspection is not passive analysis or a sandbox.
- TODO: Link the pre-parse side-effect mistake to [troubleshooting](/docs/guides/troubleshooting) and configuration tasks to [customizing help](/docs/guides/help).

## Errexit and application failures

- TODO: Explain why `set -e` is not a replacement for the parser guard and why a parse used as the left side of `||` runs in a conditional context.
- TODO: Explain Bash suppression of `errexit` inside conditionally invoked functions, including nested handlers dispatched by `__parseargs`.
- TODO: Contrast unconditional root runner dispatch, which preserves normal `errexit` behavior unless its caller also invokes it conditionally.
- TODO: Plan an explicit failure-handling example in business logic and explain that declaration failures may stop execution only where `errexit` applies.
- TODO: Explain source-safe return control flow: koi does not exit the sourcing shell for routine help/errors, but application `exit` calls and applicable shell options still affect the caller.
