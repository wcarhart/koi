---
title: "__koiconfig"
description: "Set script-wide display metadata before the entrypoint runs."
layout: article
---

```bash
__koiconfig KEY VALUE
```

| Key | Default | Value |
| --- | --- | --- |
| `name` | Script basename | Nonempty display name for usage, hints, and script-prefixed errors |
| `description` | None | Nonempty root description |
| `help-width` | `100` | Positive decimal integer, at most nine digits |

Call at script scope after sourcing koi and before consuming root registration or calling the application entrypoint. Settings apply throughout the script. Unknown keys, repeated keys, empty values, and function-scope calls fail with `2` and invalidate registration. Valid calls return `0`.

There is no configuration file or reset API. Re-sourcing preserves settings. Help wraps descriptions at word boundaries, preserves explicit line breaks, and may let long words exceed the configured width. Usage remains one line.

Try the [help configuration builder](/docs/guides/help).
