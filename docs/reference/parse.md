---
title: "koi::parse"
description: "Parse arguments inside a Bash function."
layout: article
---

`koi::parse` closes a function's [registration block](/docs/concepts/lifecycle), parses its arguments, and assigns values to its [destination variables](/docs/concepts/destinations). If the function has child commands, it also [dispatches](/docs/concepts/routing) the selected child. Use it inside application functions, including handlers registered with [koi::add_command](/docs/reference/add_command). At script scope, use [koi::run](/docs/reference/run) instead.

## Usage

```text usage
koi::parse [--koi-use-single-pipe-for-or-groups] [--koi-ignore-unknown-positionals] [--koi-error-on-scalar-duplicates] "$@" || return "$koi_status"
```

Always include `|| return "$koi_status"`, even when the function declares no custom arguments (see [control flow](/docs/concepts/control-flow)). This guard returns from your function after help, a parsing error, or child dispatch, keeping those outcomes from reaching the function's business logic. Forward arguments with `"$@"` to preserve token boundaries, including empty strings and values containing whitespace.

> [!WARNING] Never use bare `koi::parse`
>
> Always use `koi::parse "$@"` with `|| return "$koi_status"`, e.g. `koi::parse "$@" || return "$koi_status"`. `koi::parse "$@"` alone is unsupported and dangerous, and will cause koi to malfunction. See [control flow](/docs/concepts/control-flow) for why that's the case.

## Arguments

| Parameter | Description |
| --- | --- |
| `--koi-error-on-scalar-duplicates` | Reject repeated scalar options and flags within the current context. Arrays are exempt. |
| `--koi-ignore-unknown-positionals` | Ignore and discard remaining unknown positional values instead of returning an error. Unknown positionals will cause an error by default. |
| `--koi-use-single-pipe-for-or-groups` | Display inclusive OR groups with `\|` instead of `\|\|`. |
| `"$@"` | The function arguments to parse, such as flags, option values, positionals, or a child command and its arguments. |

## Repeated flags and scalar options

By default, repeated scalar options keep their last value and repeated flags remain `1`. With `--koi-error-on-scalar-duplicates`, both are errors, including when callers mix short and long labels for the same argument. For example, `-n Will --name Ada` repeats the argument if `-n` and `--name` are its labels. Array options accumulate values even with duplicate checking enabled. Put the setting before `"$@"`:

```bash
koi::parse --koi-error-on-scalar-duplicates "$@" || return "$koi_status"
```

This setting applies only to the current parser and does not carry into child commands. See [arguments and values](/docs/concepts/arguments#recognizing-options) for supported input forms, flag clusters, and the `--` separator.

## Unknown positional values

By default when koi encounters more positionals than are registered in a [context](/docs/concepts/lifecycle) it will return an error. You can customize this behavior with `--koi-ignore-unknown-positionals`, which will tell koi to ignore and discard surplus positional values rather than error.

For example, consider a scenario where you have a single registered positional argument and the arguments `source.txt extra.txt` are provided. By default, parsing `extra.txt` would produce an error. If you use `--koi-ignore-unknown-positionals`, koi would still assign `source.txt` to the first positional destination and then ignore `extra.txt`. 

```bash
koi::parse --koi-ignore-unknown-positionals "$@" || return "$koi_status"
```

Note that `--koi-ignore-unknown-positionals` only impacts the associated `koi::parse` and is not inherited in dispatched children, nested calls, or later invocations.

## Return

| Outcome | Parser return | `koi_status` |
| --- | --- | --- |
| Successful local parsing | `0` | `0` |
| Help | `1` | `0` |
| Child dispatch | `1` | Child's exit status |
| Registration or parsing error | `2` | `2` |

The parser's return code decides whether the guard runs, while `$koi_status` supplies the status your function should return. Koi sets `$koi_status` for you. Subsequent parses can overwrite `$koi_status`. See [parsing and control flow](/docs/concepts/control-flow#parser-result-and-caller-result).

A function with child commands dispatches or shows help when no child is selected, so code after its guard never runs. The parent must parse successfully before dispatching, even if the child requests help. See [calls and command routing](/docs/concepts/routing).

## Validation

When [koi::add_validator](/docs/reference/add_validator) is used to register [validators](/docs/reference/glossary#validator) for options or positionals (flags cannot be validated), the associated validator(s) will run for each argument after parsing and all destination-type checks but before any destination assignment or child dispatch. Koi ships with a few builtin validators but you can register your own custom function as a validator using [koi::add_validator --function](/docs/reference/add_validator). Validation rejections at parse are [user errors](/docs/reference/glossary#user-error). Validators do not run when help is requested.

## Assignment and help

Successful parsing replaces every [destination](/docs/concepts/destinations) in the current context. Omitted flags receive `0`, while omitted optional scalar options and positionals receive their default or an empty string. Required arguments need explicit input on each call (explicitly supplied empty string counts as present).

Arrays replace the complete destination on success. Optional arrays omitted from input become empty when assigned. Required arrays need one explicitly supplied value. See [cardinality](/docs/reference/add_arg#cardinality) for positional layout and accumulation.

Help prints to `stdout` and skips required-input checks and destination assignments. Invalid declarations, invalid positional layouts, and missing child handlers still prevent help. Code before the guarded parse executes during help too, so keep operations with side effects after the guard. Again, see [control flow](/docs/concepts/control-flow) for the full nuance here.

The parser consumes and clears the [registration block](/docs/concepts/lifecycle) before validation, help, or dispatch. Each call must build its own block, including calls after help or errors. `koi::parse` is not supported at the script-level, you should only use it in functions.

## Example

```bash
#!/usr/bin/env bash
source koi

# Greet someone by name
# Usage: greet "$@"
#   $@  arguments to parse, including optional -n/--name NAME
greet() {
    local name
    koi::add_arg name --option --short n --long name --default world --description 'Who to greet'
    koi::parse "$@" || return "$koi_status"

    printf 'Hello, %s!\n' "$name"
}

greet "$@"
```

Running `./greet.sh --name Will` prints `Hello, Will!`, while `./greet.sh --help` shows help and returns successfully without printing a greeting. An unknown option reports an error on standard error and returns `2`.
