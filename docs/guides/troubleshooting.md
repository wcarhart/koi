---
title: "Troubleshoot common mistakes"
description: "Diagnose guard, registration, routing, and scope mistakes."
layout: article
---

> Authoring outline: documentation to be written.

## Always guard parsing

- TODO: Contrast bare `__parseargs "$@"` with `__parseargs "$@" || return "$koi_status"`; show business logic continuing after help or a parsing error without the guard.
- TODO: Explain why the guard must be in the owning function rather than hidden in a helper; link [parsing and control flow](/docs/concepts/parsing-and-control-flow).

## Preserve the caller result

- TODO: Contrast `|| return $?` with `|| return "$koi_status"`; show successful help returning failure with the wrong guard and child statuses being lost.
- TODO: Explain transient `koi_status` and why the guard must read it immediately.

## Close every function block exactly once

- TODO: Plan an incorrect handler that registers arguments but never parses, paired with a handler ending its block in exactly one guarded parse.
- TODO: Cover registered handlers with no explicit arguments, abandoned declarations affecting later parses, and lack of guaranteed dedicated diagnostics for misuse.

## Keep registration uninterrupted

- TODO: Show incorrect early return, an interleaved parsing helper, and a helper that contributes declarations to its caller; pair each with declarations kept in the owner and nested parsing moved before the block or after its parse.
- TODO: Contrast unsupported interruption with supported conditional declarations; link the shared pending buffer in [registration contexts and blocks](/docs/guides/lifecycle).

## Declare locals for isolation

- TODO: Show an undeclared callee destination overwriting an ancestor local or global; correct it with a callee-local declaration before registration.
- TODO: Distinguish intentional global destinations from accidental leakage and link [destination variables and scope](/docs/concepts/destination-variables-and-scope).

## Move business effects after parsing

- TODO: Plan an incorrect example that performs a file operation before parsing and therefore performs it during `--help`; pair it with the operation moved after guarded parsing.
- TODO: Explain that preparation and registration execute for detailed help, and verbose help visits multiple handlers; help traversal is not a sandbox.

## Handle operation failures explicitly

- TODO: Show a failed business operation followed by an unintended later operation under conditional calling despite `set -e`; pair it with an explicit failure check and return.
- TODO: Cover conditional function calls and nested child dispatch suppressing `errexit`, versus unconditional root dispatch preserving normal behavior unless its caller is conditional.

## Put parent options before the child

- TODO: Compare `app -v deploy -e staging` with placing root-only `-v` after `deploy`; show that the child receives it and may reject it or assign a different meaning.
- TODO: Explain that seeing a parent's destination value does not mean inheriting its labels; link [calls and command routing](/docs/guides/direct-calls).

## Run the root entrypoint once

- TODO: Show a second `__koirun` call, late root registration, and an attempted reset by re-sourcing; explain why each fails to establish a fresh root lifecycle.
- TODO: Explain consumption on the first attempt even after help/error, contrast repeatable direct function calls, and link [__koirun](/docs/reference/koirun).
