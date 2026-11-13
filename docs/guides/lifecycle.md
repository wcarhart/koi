---
title: "Registration contexts and blocks"
description: "How declarations build an interface and parsing consumes it."
layout: article
---

> Authoring outline: documentation to be written.

## Contexts, blocks, and specs

- TODO: Define a registration context as the root or function invocation owning an interface; distinguish ownership from Bash variable scope and CLI option ownership.
- TODO: Define a registration block as the declarations closed by parsing, and a registration spec as the accumulated argument, command, description, and related metadata.
- TODO: Explain that defining a function does not build its spec: its declarations build the interface when they execute. Command registration exposes a handler without executing it.
- TODO: Identify `__adddescription`, `__addarg`, and `__addcommand` as function-block declarations; distinguish root `__koiconfig` settings from function declarations.

## Completing a function block

- TODO: Outline preparation, zero or more declarations, exactly one guarded `__parseargs`, then business logic; include a function with no explicit argument declarations.
- TODO: Explain that all functions share a pending registration buffer, separate from root registration. Function entry and return do not automatically create or clean up isolated specs.
- TODO: Define uninterrupted registration: allow conditional declarations, but never return early, omit parsing, interleave another parsing function, or delegate declarations to registration helpers.
- TODO: Plan incorrect/correct block diagrams and link symptoms to [troubleshooting](/docs/guides/troubleshooting).
- TODO: Explain repeated calls, nesting, and recursion when parsing functions are called before registration starts or after parsing completes.

## Consumption and assignment boundary

- TODO: Explain that `__parseargs` consumes and clears pending registration before finalization, help, input validation outcomes, or child dispatch; subsequent blocks start fresh, including after help or errors.
- TODO: Distinguish clearing the registration buffer from discarding the parser's consumed spec. There is no public spec cache or retained invocation history.
- TODO: Explain that declaration calls never initialize destinations; parsing checks input and destinations before assigning ordinary scalar values on success.
- TODO: Explain that help and ordinary parsing errors skip assignment in the current context; earlier ancestors may already have assigned their own values before dispatching to child help or a failing child.
- TODO: Explain that declaration failures invalidate the block even if an individual declaration status is ignored; valid later declarations do not repair it.
- TODO: Link presence, defaults, and parser outcomes to [parsing and control flow](/docs/concepts/parsing-and-control-flow).

## Two entrypoints

- TODO: Contrast a direct function entrypoint with script-scope declarations consumed by `__koirun`; moving a parser into a function does not make it consume root declarations.
- TODO: Explain script-scope sourcing, persistent root registration, and the separate function buffer even when koi was sourced inside a function.
- TODO: Explain that only `__koirun` consumes root registration, its first attempt consumes the lifecycle even on help/error, and later root declarations or runner calls fail. Re-sourcing does not reset it.
- TODO: Link invocation choices to [calls and command routing](/docs/guides/direct-calls).

## Parser result and caller result

- TODO: Introduce the required `__parseargs "$@" || return "$koi_status"` guard and link the full return-status contract to [parsing and control flow](/docs/concepts/parsing-and-control-flow).
