---
title: "Registration & control flow"
description: "Keep one uninterrupted declaration block inside each parsing function."
layout: article
---

A function's interface is built when its declarations execute. Keep preparation before the registration block, then declarations, then exactly one guarded parse, then business logic.

```bash
main() {
    local name
    __addarg name -o -s n -d 'Name'
    __parseargs "$@" || return "$koi_status"

    printf '%s\n' "$name"
}
```

## One block per function

`__adddescription`, `__addarg`, and `__addcommand` belong to the block. Conditional declarations are supported, but do not return early, abandon the block, or call another parsing function before closing it. Helpers that register another function's interface are unsupported.

A consumed block is discarded before help, validation outcomes, or child dispatch. Repeated direct calls build fresh interfaces.

## Parser result and caller result

| Parser return | Meaning | `koi_status` |
| --- | --- | --- |
| `0` | Continue into local business logic | `0` |
| `1` | Stop after help or child dispatch | `0` for help, or the child's status |
| `2` | Parsing or declaration error | `2` |

Read `koi_status` only in the immediate guard. It is transient and another parse can overwrite it.

## Two entrypoints

Call a function directly with `main "$@"`, or register root commands and call `__koirun "$@"` once. Root declarations belong to the runner, not to a parser moved inside a function. Re-sourcing the library does not reset the root lifecycle.

## Handle operation failures explicitly

Bash suppresses `errexit` in conditional calls, including child business logic dispatched from a guarded parser. Do not use `set -e` as your only error handling. Check meaningful operation failures explicitly.

Help executes preparation and registration code before it reaches the parser. Keep external side effects after successful parsing.
