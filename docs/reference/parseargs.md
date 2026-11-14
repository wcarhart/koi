---
title: "__parseargs"
description: "Parse arguments inside a Bash function."
layout: article
---

`__parseargs` closes a function's [registration block](/docs/concepts/lifecycle), parses its arguments, and assigns values to its [destination variables](/docs/concepts/destinations). If the function has child commands, it also [dispatches](/docs/concepts/routing) the selected child. Use it inside application functions, including handlers registered with [__addcommand](/docs/reference/addcommand). At script scope, use [__koirun](/docs/reference/koirun) instead.

## Usage

```text usage
__parseargs [--koi-error-on-duplicates] "$@" || return "$koi_status"
```

Always include `|| return "$koi_status"`, even when the function declares no custom arguments (see [control flow](/docs/concepts/control-flow)). This guard returns from your function after help, a parsing error, or child dispatch, keeping those outcomes from reaching the function's business logic. Forward arguments with `"$@"` to preserve token boundaries, including empty strings and values containing whitespace.

> [!WARNING] Never use bare `__parseargs`
>
> Always use `__parseargs "$@"` with `|| return "$koi_status"`, e.g. `__parseargs "$@" || return "$koi_status"`. `__parseargs "$@"` alone is unsupported and dangerous, and will cause koi to malfunction. See [control flow](/docs/concepts/control-flow) for why that's the case.

## Arguments

| Parameter | Description |
| --- | --- |
| `--koi-error-on-duplicates` | Reject repeated occurrences of an argument within the current context. |
| `"$@"` | The function arguments to parse, such as flags, option values, positionals, or a child command and its arguments. |

By default, repeated scalar options keep their last value and repeated flags remain `1`. With `--koi-error-on-duplicates`, both are errors, including when callers mix short and long labels for the same argument. For example, `-n Will --name Ada` repeats the argument if `-n` and `--name` are its labels. Put the setting before `"$@"`:

```bash
__parseargs --koi-error-on-duplicates "$@" || return "$koi_status"
```

This setting applies only to the current parser and does not carry into child commands. See [arguments and values](/docs/concepts/arguments#recognizing-options) for supported input forms, flag clusters, and the `--` separator.

## Return

| Outcome | Parser return | `koi_status` |
| --- | --- | --- |
| Successful local parsing | `0` | `0` |
| Help | `1` | `0` |
| Child dispatch | `1` | Child's exit status |
| Registration or parsing error | `2` | `2` |

The parser's return code decides whether the guard runs, while `$koi_status` supplies the status your function should return. Koi sets `$koi_status` for you. Subsequent parses can overwrite `$koi_status`. See [parsing and control flow](/docs/concepts/control-flow#parser-result-and-caller-result).

A function with child commands dispatches or shows help when no child is selected, so code after its guard never runs. The parent must parse successfully before dispatching, even if the child requests help. See [calls and command routing](/docs/concepts/routing).

## Assignment and help

Successful parsing replaces every [destination](/docs/concepts/destinations) in the current context. Omitted flags receive `0`, while omitted optional options and positionals receive their default or an empty string. Required arguments need explicit input on each call (explicitly supplied empty string counts as present).

Help prints to `stdout` and skips required-input checks and destination assignments. Invalid declarations, invalid positional layouts, and missing child handlers still prevent help. Code before the guarded parse executes during help too, so keep operations with side effects after the guard. Again, see [control flow](/docs/concepts/control-flow) for the full nuance here.

The parser consumes and clears the [registration block](/docs/concepts/lifecycle) before validation, help, or dispatch. Each call must build its own block, including calls after help or errors. `__parseargs` is not supported at the script-level, you should only use it in functions.

## Example

```bash
#!/usr/bin/env bash
source koi

# Greet someone by name
# Usage: greet "$@"
#   $@  arguments to parse, including optional -n/--name NAME
greet() {
    local name
    __addarg name --option --short n --long name --default world --description 'Who to greet'
    __parseargs "$@" || return "$koi_status"

    printf 'Hello, %s!\n' "$name"
}

greet "$@"
```

Running `./greet.sh --name Will` prints `Hello, Will!`, while `./greet.sh --help` shows help and returns successfully without printing a greeting. An unknown option reports an error on standard error and returns `2`.
