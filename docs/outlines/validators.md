---
title: "Validators"
description: "Unpublished authoring outline."
layout: article
draft: true
---

TODO for human authoring:

- Introduce `koi::add_validator` after an option or positional in the same block. Flags and cross-context destinations are invalid.
- Show the four builtin selectors and their lexical/path contracts. Whitespace is nonempty. Integers allow signs, leading zeros, and arbitrary length. Path checks follow symlinks and do not check permissions.
- Show `-f`/`--function` and optional nonempty `-m`/`--message`. Explain one selector per call and duplicate/unknown parameter errors.
- Explain one literal callback argument, statuses 0/1/2–255, silent predicates, and explicit operational failure returns. Conditional invocation suppresses `set -e`.
- Explain argument, element, then validator order, repeated checks, and first-failure short circuit.
- Cover final scalar values, independent array elements, omission, explicit empty values, explicit defaults, and supplied values replacing defaults.
- Explain pre-assignment validation, destination preservation, user rejection versus author default/callback errors, and value-free diagnostics.
- Keep the existing parse guard. Explain callback existence checks during help/inspection without predicate execution, and metadata retention.
- Link to the published reference and executable example. Keep this guide unpublished until human authoring.
