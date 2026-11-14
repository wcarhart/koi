---
title: "__adddescription"
description: "Add a description to a directly-called function."
layout: article
---

`__adddescription TEXT` sets the help description for a directly called parsing function. Declare it inside the function's [registration block](/docs/concepts/lifecycle), before its guarded [__parseargs](/docs/reference/parseargs) call.

## Usage

```bash
__adddescription TEXT
```

`TEXT` is required and must be a single, nonempty string. Quote descriptions containing spaces, such as `__adddescription 'Show application status'`. There are no declaration options.

You can declare one description per registration block, alongside any [__addarg](/docs/reference/addarg) or [__addcommand](/docs/reference/addcommand) calls. The description is optional and is built again each time the function runs, just like its argument declarations.

For the root help menu, use [__koiconfig](/docs/reference/koiconfig) at script scope:

```bash
__koiconfig description 'Manage the application'
```

## Return

| Status | Description |
| --- | --- |
| `0` | Description registered successfully. |
| `2` | Called outside a function, missing or empty text, extra arguments, or a duplicate description. |

An invalid declaration reports an error and invalidates the entire [registration block](/docs/concepts/lifecycle), even if its return status is ignored. The guarded parse then returns with status `2`, including when help is requested.

## Help

Consider the following example script:

```bash
#!/usr/bin/env bash
source koi

main() {
    __parseargs "$@" || return "$koi_status"

    printf 'Ready\n'
}

main "$@"
```

Without `__adddescription`, direct-call help starts with usage line and omits a description. The root description set by `__koiconfig` applies only to root help and doesn't supply a fallback for functions. This is what you would see for `./status.sh --help`:

```text
Usage: status.sh [-h]

Options:
  -h, --help  Show this help
```

Now consider the same script with `__adddescription` usage:

```bash
#!/usr/bin/env bash
source koi

main() {
    __adddescription 'Show application status'
    __parseargs "$@" || return "$koi_status"

    printf 'Ready\n'
}

main "$@"
```

Now running `./status.sh --help` shows the description above the usage line:

```text
Show application status

Usage: status.sh [-h]

Options:
  -h, --help  Show this help
```

When koi routes a call through a registered command, it uses that command's [__addcommand](/docs/reference/addcommand) description instead. For example, replace the final `main "$@"` above with:

```bash
#!/usr/bin/env bash
source koi

main() {
    __adddescription 'Show application status'
    __parseargs "$@" || return "$koi_status"

    printf 'Ready\n'
}

__addcommand status --function main --description 'Check application readiness'
__koirun "$@"
```

Now koi registers `status` as a command, so `./status.sh status --help` shows:
```text
Check application readiness

Usage: status.sh status [-h]

Options:
  -h, --help  Show this help
```

And `./status.sh --help` would show (there's no introductory description because the script doesn't set `__koiconfig description`):

```text
Usage: status.sh [-h] COMMAND

Commands:
  status  Check application readiness
  help    Show this help

Options:
  -h, --help  Show this help
```

Calling `main --help` directly in place of `__koirun "$@"` would still show the function's help menu with the `Show application status` description. Each command can have its own description even when several commands share a handler. See [calls and command routing](/docs/concepts/routing#help-follows-the-call).

Help wraps descriptions to the configured width and preserves explicit line breaks. See [customizing the generated help](/docs/guides/help) for formatting settings.
