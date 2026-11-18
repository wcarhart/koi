---
title: "koi::config"
description: "Configure koi policies at script- or function-scope."
layout: article
---

`koi::config` allows you to modify koi behavior and policies. Policies can be defined at the script-level or on a per-function basis. Set script-level settings prior to [koi::run](/docs/reference/run) and function-level setting prior to each function's [koi::parse](/docs/reference/parse).

## Usage

```text usage
koi::config KEY VALUE
```

## Arguments

| Key | Type | Default | Scope | Effect |
| --- | --- | --- | --- | --- |
| `name` | string | `koi` | Script only | Help naming and [user errors](/docs/reference/glossary#user-error) branding throughout the script. |
| `description` | string | ∅ | Script only | Root help description. |
| `help-width` | integer | `100` | Script only | The word-wrap width for all help menus. |
| `help-subcommand` | boolean | `true` | Script only | Support the builtin `help` subcommand where applicable throughout the routed command tree. Does not disable `-h`/`--help`. |
| `verbose-help` | boolean | `false` | Script only | Support `help --verbose` as the top command-level. Requires `help-subcommand true`. |
| `help-hints` | boolean | `false` | Script only | Append available hints to ordinary top command-level help. |
| `missing-command-message` | string | ∅ | Script only | The custom error text to print when no root command is selected, even when root options were supplied. No effect on positional roots or nested branches. |
| `help-on-unknown-commands` | boolean | `false` | Script only | Show help menu on unknown commands, e.g. `typo --help`. |
| `use-single-pipe-for-or-groups` | boolean | `false` | Script or function | In help menu usage lines, use a single pipe (`\|`) for inclusive OR in this context and routed descendants instead of the default (`\|\|`) |
| `ignore-unknown-positionals` | boolean | `false` | Script or function | Discard surplus positional values instead of erroring. |
| `error-on-scalar-duplicates` | boolean | `false` | Script or function | Reject repeated scalar options and flags. |

Both `KEY` and `VALUE` are required. Supply one setting per call and quote text containing spaces. Booleans accept exactly `true` and `false`. Empty values, unknown keys, wrong scopes, and repeated explicit keys are [author errors](/docs/reference/glossary#author-error), even when the repeated value is identical. Dependencies are checked when the complete spec is consumed, so declaration order does not matter.

## Scope and lifecycle

Script declaration scope does not necessarily imply script-wide effect, only at what level you can modify that policy via `koi::config`. For example, script-level duplicate checking and surplus-positional handling apply only to root parsing. Functions declare their own policies. Script identity and help width persist across direct calls and routing.

Function settings are consumed and cleared with that invocation's [spec](/docs/concepts/lifecycle), including after help or errors, same as with arguments in the spec. Each call rebuilds its settings. A function may declare configuration without declaring arguments. Configuration follows the same uninterrupted registration rules as argument declarations (see [completing a function's registration block](/docs/concepts/lifecycle#completing-a-functions-registration-block)).

```bash
koi::config name infra
koi::config verbose-help true

process() {
    local input
    koi::config error-on-scalar-duplicates true
    koi::config ignore-unknown-positionals true
    koi::add_arg input -p -r -d Input
    koi::parse "$@" || return "$koi_status"

    printf '%s\n' "$input"
}
```

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
| `2` | Unknown or repeated key, missing or invalid value, extra arguments, a key used in the wrong scope, or root registration already consumed. |

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
