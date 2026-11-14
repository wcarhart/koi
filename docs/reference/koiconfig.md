---
title: "__koiconfig"
description: "Set script-wide koi metadata."
layout: article
---

`__koiconfig KEY VALUE` configures script-level metadata, like script name, root description, and help word-wrap width. Call it at script scope after sourcing koi, before [__koirun](/docs/reference/koirun) or your application's entrypoint function runs.

## Usage

```text usage
__koiconfig KEY VALUE
```

## Arguments

| Key | Value |
| --- | --- |
| `name` | The display name used in usage lines, help hints, and script-prefixed errors. Defaults to the script's filename without its directory path. |
| `description` | The description printed above the root help menu's usage line. Omitted by default. |
| `help-width` | The target line width for help descriptions, in characters, including indentation. Must be a positive integer. Defaults to `100`. |

Both `KEY` and `VALUE` are required. Supply one setting per call, and quote values containing spaces. Each key can be set only once, even if you supply the same value again. All values must be nonempty.

```bash
__koiconfig name infra
__koiconfig description 'Manage infrastructure'
__koiconfig help-width 80
```

Configuration stays in effect throughout the script, including direct function calls and nested commands. `__koiconfig` statements must come before `__koirun` but do not necessarily need to be within the root-level [registration block](/docs/concepts/lifecycle). `__koiconfig` cannot be used in functions, it's only supported at the script-level.

## Return

| Status | Description |
| --- | --- |
| `0` | Setting applied successfully. |
| `2` | Unknown or repeated key, missing or invalid value, extra arguments, a call from inside a function, or root registration already consumed. |

## Help

Consider the following example script, locally named `~/app.sh`:

```bash
#!/usr/bin/env bash
source koi

__koiconfig name infra
__koiconfig description 'Manage infrastructure'
__koiconfig help-width 80

deploy() {
    __parseargs "$@" || return "$koi_status"

    printf 'Deploying\n'
}

__addcommand deploy --function deploy --description 'Deploy the application'
__koirun "$@"
```

Running `./app.sh --help` shows:

```text
Manage infrastructure

Usage: infra [-h] COMMAND

Commands:
  deploy  Deploy the application
  help    Show this help

Options:
  -h, --help  Show this help
```

The configured name also appears in child usage lines, so `./app.sh deploy --help` shows `Usage: infra deploy [-h]`. The script is still invoked as `app.sh`.

The root description applies only to root help. Routed commands use their [__addcommand](/docs/reference/addcommand) descriptions, while directly called functions use [__adddescription](/docs/reference/adddescription). See [how help follows the call](/docs/concepts/routing#help-follows-the-call).

Help wraps descriptions at word boundaries and preserves explicit line breaks. Long words and argument labels can exceed `help-width`. The usage statement stays on one line.

Try the [help configuration builder](/docs/guides/help).
