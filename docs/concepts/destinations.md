---
title: "Destination variables and scope"
description: "Where parsed values are assigned under Bash dynamic scope."
layout: article
---

> Authoring outline: documentation to be written.

## Ordinary Bash destinations

- TODO: Explain that koi writes to named Bash variables rather than returning a result object; link assignment timing to [registration contexts and blocks](/docs/concepts/lifecycle).
- TODO: Explain destination identifiers versus CLI spellings and help display names; link allowed names and reserved names to [__addarg](/docs/reference/addarg).
- TODO: Explain the current plain/exported scalar destination requirement and rejection of incompatible attributes such as arrays, integers, readonly variables, and namerefs.

## Locals, globals, and dynamic scope

- TODO: Recommend declaring destinations with `local` before registration when isolation is intended; intentional globals remain supported.
- TODO: Explain Bash dynamic scope: assignment without a callee-local destination can reach an ancestor's visible local, or a global when no local shadows it.
- TODO: Plan paired caller/callee examples showing accidental mutation of an ancestor local and isolation through a callee's own `local` declaration.
- TODO: Explain repeated calls with independently declared locals and distinguish variable lifetime from the discarded registration spec.

## Visibility versus ownership

- TODO: Distinguish Bash variable visibility, registration context ownership, and the CLI context that recognizes each argument label.
- TODO: Explain that a child can see ancestor destination values without inheriting ancestor option spellings; child locals can shadow those destinations.
- TODO: Explain that sourcing permits intentional shell changes, while subshells and command substitution isolate changes; link practical patterns to [reusing parsing functions](/docs/guides/functions).
