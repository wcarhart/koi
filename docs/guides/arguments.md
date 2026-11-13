---
title: "Define flags, options, and positionals"
description: "Plan a function interface and handle its input values."
layout: article
---

> Authoring outline: documentation to be written.

## Start with a guarded function

- TODO: Walk through a complete function with local destinations, declarations, `__parseargs "$@" || return "$koi_status"`, and business logic; reuse existing example assets when writing the guide.
- TODO: Choose between flags, scalar options, and scalar positionals using [arguments and values](/docs/concepts/arguments-and-values); link exact parameters to [__addarg](/docs/reference/addarg).
- TODO: Choose short/long labels and help display names independently of Bash destinations.

## Requiredness, defaults, and repetition

- TODO: Show optional and required declarations, an empty default, and explicit empty input; link presence semantics to [parsing and control flow](/docs/concepts/parsing-and-control-flow).
- TODO: Put required positionals before optional ones and demonstrate left-to-right optional filling without skipping slots.
- TODO: Demonstrate repeated scalar options keeping the last value and `--koi-error-on-duplicates` rejecting duplicates across spellings; reserve arrays for future functionality.

## Pass literal values correctly

- TODO: Plan invocations preserving whitespace and empty values through quoting and `"$@"`.
- TODO: Demonstrate interleaving options with positional values, flags-only clusters, unknown-token errors, lone `-`, and `--` for dash-prefixed positional data.
- TODO: Explain options consuming dash-prefixed values except automatic `-h`/`--help`; show that equals and attached-value forms are unsupported.
- TODO: Link the [positional example](/docs/examples/positionals), help output, and common mistakes in [troubleshooting](/docs/guides/troubleshooting).
