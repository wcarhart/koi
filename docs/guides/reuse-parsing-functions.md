---
title: "Reuse parsing functions"
description: "Compose functions and choose an entrypoint without losing scope."
layout: article
---

> Authoring outline: documentation to be written.

## Call a parsing function directly

- TODO: Start from the existing [function-entrypoint example](/docs/examples/function-entrypoint); show a direct call with arguments, a help call, and repeated calls without command registration.
- TODO: Show a custom entrypoint that prepares inputs before calling a parsing function and forwards them with `"$@"`.
- TODO: Link direct/routed behavior to [calls and command routing](/docs/guides/direct-calls) and keep the standard parser guard in every parsing function.

## Compose functions safely

- TODO: Plan paired caller/callee examples with destinations declared locally for isolation; demonstrate intentional ancestor/global assignment separately.
- TODO: Call a parsing function before another block begins or after its parse completes; contrast this with unsupported interleaving or registration helpers.
- TODO: Show how callers propagate meaningful failure statuses and why a callee's successful help return does not automatically stop its caller's later work.
- TODO: Explain explicit business-operation failure handling in conditional calls and link [the control-flow contract](/docs/concepts/parsing-and-control-flow).

## Preserve changes when sourcing

- TODO: Plan a sourceable parsing function that intentionally changes the caller's directory or environment; explain why a subshell or command substitution would lose the change.
- TODO: Explain the supported Bash interpreter requirement and why a shebang does not choose the interpreter of sourced code.
- TODO: Use return-based function control flow for routine help/errors rather than exiting the caller's shell; avoid changing the caller's shell options merely to use koi.
- TODO: Explain why reusable direct-call functions can be invoked repeatedly, while the root runner is a once-per-library-initialization entrypoint and re-sourcing does not reset it.
