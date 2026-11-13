---
title: "__parseargs"
description: "Consume a function interface and decide whether local work should continue."
layout: article
---

```bash
__parseargs [--koi-error-on-duplicates] "$@" || return "$koi_status"
```

## Calling contract

`"$@"` forwards the function's arguments without losing boundaries. This function is supported **only inside application functions**. Script-level calls return `2` without consuming root registration; use a direct function entrypoint or `__koirun` instead.

The parser consumes the current block before validation, help, or child dispatch. Successful leaf parsing assigns destination variables. Help and errors skip assignments. Selecting a child must not run the parent's business logic too.

## Options and status

`--koi-error-on-duplicates` rejects repeated destinations instead of keeping the last scalar value. Its singular alias `--koi-error-on-duplicate` is also accepted. Administrative settings precede application arguments.

| Return | Meaning | Immediate guard uses |
| --- | --- | --- |
| `0` | Continue locally | No return needed |
| `1` | Help or dispatched child completed | `koi_status`, preserving success or the child's result |
| `2` | Error | `koi_status=2` |

Always use the documented guard. A helper cannot return from its caller on your behalf, and `set -e` is not a substitute.

See [registration and control flow](/docs/concepts/lifecycle) for the complete lifecycle.
