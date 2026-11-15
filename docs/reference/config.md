---
title: "koi::config"
description: "Set script-wide koi metadata."
layout: article
---

`koi::config KEY VALUE` configures script-level metadata, like script name, root description, and help word-wrap width. Call it at script scope after sourcing koi, before [koi::run](/docs/reference/run) or your application's entrypoint function runs.

## Usage

```text usage
koi::config KEY VALUE
```

## Arguments

| Key | Value |
| --- | --- |
| `name` | The display name used in usage lines, help hints, and [user errors](/docs/reference/glossary#user-error). Help defaults to the script's filename without its directory path. User errors default to `koi`. |
| `description` | The description printed above the root help menu's usage line. Omitted by default. |
| `help-width` | The target line width for help descriptions, in characters, including indentation. Must be a positive integer. Defaults to `100`. |

Both `KEY` and `VALUE` are required. Supply one setting per call, and quote values containing spaces. Each key can be set only once, even if you supply the same value again. All values must be nonempty.

```bash
koi::config name infra
koi::config description 'Manage infrastructure'
koi::config help-width 80
```

Configuration stays in effect throughout the script, including direct function calls and nested commands. `koi::config` statements must come before `koi::run` but do not necessarily need to be within the root-level [registration block](/docs/concepts/lifecycle). `koi::config` cannot be used in functions, it's only supported at the script-level.

## Error prefixes

[User errors](/docs/reference/glossary#user-error) use the configured `name` across root parsing, routed commands, and direct function calls, e.g. `koi::config name my-script-name`. This allows you to brand your script or CLI so you don't need to expose that it's koi-powered. Without a provided `name`, user errors use the prefix `koi` and help uses the script's basename. [Author errors](/docs/reference/glossary#author-error) cannot be customized in this fashion. See [errors](/docs/concepts/errors).

For example, without a `koi::config name` statement:

```text
koi: missing required argument: 'environment'
```

And after `koi::config name my-script-name`:

```text
my-script-name: missing required argument: 'environment'
```

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

koi::config name infra
koi::config description 'Manage infrastructure'
koi::config help-width 80

deploy() {
    koi::parse "$@" || return "$koi_status"

    printf 'Deploying\n'
}

koi::add_command deploy --function deploy --description 'Deploy the application'
koi::run "$@"
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

The root description applies only to root help. Routed commands use their [koi::add_command](/docs/reference/add_command) descriptions, while directly called functions use [koi::add_description](/docs/reference/add_description). See [how help follows the call](/docs/concepts/routing#help-follows-the-call).

Help wraps descriptions at word boundaries and preserves explicit line breaks. Long words and argument labels can exceed `help-width`. The usage statement stays on one line.

Try the [help configuration builder](/docs/guides/help).
