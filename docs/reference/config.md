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
| `description` | string | ∅ | Script or function | Root help description at script scope, direct-call help description inside a function. |
| `epilog` | string | ∅ | Script or function | Closing text below the current context's help menu. |
| `help-width` | integer | `100` | Script only | The word-wrap width for all help menus. |
| `author-error-location` | boolean | `true` | Script only | Append an application source location to [author errors](/docs/reference/glossary#author-error) throughout the script when available. |
| `help-subcommand` | boolean | `true` | Script only | Support the builtin `help` subcommand where applicable throughout the routed command tree. Does not disable `-h`/`--help`. |
| `verbose-help` | boolean | `false` | Script only | Support root `help -v` / `help --verbose`. Requires `help-subcommand true`. |
| `help-hints` | boolean | `false` | Script only | Append available hints to ordinary top command-level help. |
| `missing-command` | enum | `continue` | Function only | With available children commands but no selected child (see [branch](/docs/reference/glossary#branch)), continue (`continue`) after parsing, show help (`help`), or report an error (`error`). No effect on [leaves](/docs/reference/glossary#leaf). |
| `missing-command-message` | string | ∅ | Script only | The custom error text to print when no root command is selected, even when root options were supplied. No effect on positional roots or nested branches. |
| `help-on-unknown-commands` | boolean | `false` | Script only | Show help menu on unknown commands, e.g. `typo --help`. |
| `use-single-pipe-for-or-groups` | boolean | `false` | Script or function | In help menu usage lines, use a single pipe (`\|`) for inclusive OR in this context and routed descendants instead of the default (`\|\|`) |
| `ignore-unknown-positionals` | boolean | `false` | Script or function | Discard surplus positional values instead of erroring. |
| `error-on-scalar-duplicates` | boolean | `false` | Script or function | Reject repeated scalar options and flags. |

Both `KEY` and `VALUE` are required. Supply one setting per call and quote text containing spaces. Booleans accept exactly `true` and `false`; `missing-command` accepts exactly `continue`, `help`, or `error`. Empty values, unknown keys, wrong scopes, and repeated explicit keys are [author errors](/docs/reference/glossary#author-error), even when the repeated value is identical. Dependencies are checked when the complete spec is consumed, so declaration order does not matter.

## Scope and lifecycle

Script declaration scope does not necessarily imply script-wide effect, only at what level you can modify that policy via `koi::config`. For example, script-level duplicate checking and surplus-positional handling apply only to root parsing. Functions declare their own policies. Script identity, help width, and author-error locations persist across direct calls and routing.

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

## Missing child commands

Functions with registered children commands (aka [branches](/docs/concepts/routing#branches-and-leaves)) continue into their own business logic when no child is selected by default. Configure the function's registration block to change that behavior:

```bash
deploy() {
    koi::config missing-command help
    koi::add_command app -f deploy_app -d 'Deploy the application'
    koi::parse "$@" || return "$koi_status"
}
```

| Value | No child selected | Parser return | `koi_status` |
| --- | --- | --- | --- |
| `continue` | Parse arguments, then continue after the [guard](/docs/concepts/control-flow#the-parsing-boundary-and-required-guard) (default) | `0` | `0` |
| `help` | Show the function's help without validation or assignment | `1` | `0` |
| `error` | Report `missing required command` without validation or assignment | `2` | `2` |

## Function descriptions

Use `koi::config` to declare a nonempty description inside the function's registration block:

```bash
status() {
    koi::config description 'Show application status'
    koi::parse "$@" || return "$koi_status"

    printf 'Ready\n'
}

status --help
```

When you register a command via [koi::add_command](/docs/reference/add_command), you provided a description via `-d` that koi will use in help menus. However, when using [directly called functions](/docs/concepts/routing#direct-calls-and-entrypoints), your function won't have a description by default. You can add one for use in help menus via `koi::config description DESC`.

## Help epilogs

Use `koi::config epilog TEXT` to place free-form closing text below a help menu. By default epilogs are disabled unless provided. Each function's help menu can have its own epilog, which is separate from the script's epilog.

```bash
koi::config epilog 'For examples, visit https://example.com/docs.'

deploy() {
    koi::config epilog 'Deployments require an authenticated session.'
    koi::parse "$@" || return "$koi_status"

    printf 'Deploying\n'
}
```

## Error prefixes

[User errors](/docs/reference/glossary#user-error) use the configured `name` across root parsing, routed commands, and direct function calls, e.g. `koi::config name my-script-name`. This allows you to brand your script or CLI so you don't need to expose that it's koi-powered. Without a provided `name`, user errors use the prefix `koi` and help uses the script's basename. [Author errors](/docs/reference/glossary#author-error) cannot be customized in this fashion. See [errors](/docs/concepts/errors).

Author errors include a source location by default when Bash provides one. Use `koi::config author-error-location false` at script scope to keep author errors. This setting does not change user errors.

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
koi::config epilog 'For examples, visit https://example.com/docs.'

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

For examples, visit https://example.com/docs.
```

The configured name also appears in child usage lines, so `./app.sh deploy --help` shows `Usage: infra deploy [-h]`. The script is still invoked as `app.sh`.

The script-level description applies only to root help. Directly called functions use their own `koi::config description` text, if declared. During routing, the selected [koi::add_command](/docs/reference/add_command) description takes precedence. See [how help follows the call](/docs/concepts/routing#help-follows-the-call).

Help wraps descriptions at word boundaries and preserves explicit line breaks. Long words and argument labels can exceed `help-width`. The usage statement stays on one line.

Try the [help configuration builder](/docs/guides/help).
