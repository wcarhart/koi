---
title: "__addarg"
description: "Define one flag, option, or positional argument in the current registration context."
layout: split
---

`__addarg DEST` registers a parseable argument in the current registration context (see [registration contexts](/docs/concepts/lifecycle#contexts-blocks-and-specs)). Use `__addarg` to define an argument that can be parsed by your function. `__addarg` statements must be used inside [registration blocks](/docs/concepts/lifecycle) and must be followed by a guarded [__parseargs](/docs/reference/parseargs) statement at the function level or a [__koirun](/docs/reference/koirun) statement at the root level.

## Usage

```text usage
__addarg DEST (-f|-o|-p) -d DESCRIPTION [-s SHORT] [-l LONG] [-r] [-D DEFAULT] [-n NAME]
```

## Arguments

| Parameter | Description |
| --- | --- |
| `DEST` | The destination Bash variable that will hold this argument's value. Reserved shell and koi variable names are rejected. |
| `-f`, `--flag` | Set kind to _flag_. Consumes no value and assigns `0` or `1` to `DEST` upon parse. |
| `-o`, `--option` | Set kind to _option_. Consumes the next single value and assigns it to `DEST` upon parse, except for `-h`/`--help`. |
| `-p`, `--positional` | Set kind to _positional_. Consumes a single positional value without an argument label and assigns it to `DEST` upon parse. |
| `-s`, `--short SHORT` | The one-letter spelling for the argument label, without a dash. `h` is reserved. |
| `-l`, `--long LONG` | The long spelling for the argument label, without dashes. `help` and some koi-internal strings are reserved. |
| `-d`, `--description DESCRIPTION` | The nonempty help text for the argument. |
| `-r`, `--required` | Require explicit presence when parsing. All arguments are optional by default. |
| `-D`, `--default DEFAULT` | The default value for optional options or positionals, including an empty string. If none is provided, the empty string will be used. Flags and required arguments cannot have defaults. |
| `-n`, `--display-name NAME` | The nonempty value placeholder used in generated help for an option or positional, such as `FILE` in `--output FILE`. Flags cannot have display names. |

Supply `DEST` first, followed by the declaration options in any order. Each option can be supplied only once, including when mixing short and long aliases. For example, using both `-d` and `--description` in the same declaration is an error.

Destination names must start with an ASCII letter or underscore and contain only ASCII letters, digits, or underscores. Names starting with `__koi_`, the variable `koi_status`, and reserved shell variable names such as `PATH` and `IFS` are rejected. Long spellings must start with an ASCII letter and contain only ASCII letters, digits, hyphens, or underscores. Short spellings must be one ASCII letter other than `h`.

Destinations, short spellings, and long spellings must each be unique within the registration context. Short and long spellings are case-sensitive and independent, so `-v` and `--v` can belong to different arguments.

Display names are uppercased in generated help. If you omit `-n`/`--display-name`, koi uses the long spelling when present, then falls back to the destination name. For example, an option with destination `output_file` and long spelling `output-file` uses `OUTPUT-FILE` as its value placeholder unless you set a display name with `-n FILE`.

## Return

| Status | Description |
| --- | --- |
| `0` | Valid argument declaration and registration success. |
| `2` | Invalid argument declaration, argument validation error, or registration failure. |

## Kind

Each argument you define with `__addarg` has a _kind_, either _flag_, _option_, or _positional_ (see [glossary](/docs/reference/glossary)). Only one kind can be used per registered argument, think of it as the argument's type or what action koi should take when parsing an argument. **Flags**, which you specify via `-f` or `--flag`, do not require an additional argument. **Options**, which you specify via `-o` or `--option`, consume the next token as their additional, required value (even if it starts with `-`, with exception for `-h`/`--help`). **Positionals**, which you specify via `-p` or `--positional`, do not require an argument label like `-a` or `--my-option` and consume the next value in the order the positionals are defined by `__addarg` calls.

Exactly one kind and a nonempty description are required. Flags and options need at least one short or long spelling, and you can supply both as aliases for the same argument. Koi only recognizes the spellings you declare. Positionals cannot have either spelling or share a context with child commands registered via [__addcommand](/docs/reference/addcommand).

See [arguments and values](/docs/concepts/arguments#recognizing-options) for flag clusters, repeated scalar values, and supported input forms.

## Standalone `--`

Koi supports the common Unix command-line convention of using `--` to end option recognition.

Use a standalone `--` to end flag and option recognition and supply positional values that start with dashes. For example, if your script declares a positional argument, `./myscript.sh -- -h` supplies the literal value `-h` without showing help. Subsequent tokens fill the remaining positional slots, including tokens such as `--help` that would otherwise request help.

An option waiting for a value consumes `--` as that value, so `./myscript.sh --output --` assigns `--` to the output option and continues recognizing flags and options afterward. In a [branch](/docs/reference/glossary#branch), a standalone `--` ends the parent's option recognition, and the next token still selects a child command. The child's parser handles the remaining tokens independently.

> [!NOTE] Optional positionals
> Optional positionals create a bit of complexity during parsing, since it's easy for the provided arguments to be ambiguous. Koi uses the following parsing rules for optional positionals:
> 1. Provided positional values fill the registered positional arguments from left to right.
> 2. All required positional arguments must be registered via `__addarg` before any optional positional arguments.
>
> This means you cannot skip a preceding optional positional and supply a later one, as doing so would create ambiguity. For example, with two optional `source` and `target` positionals, a single provided positional value will always fill `source` and leave `target` the empty string or its specified default value.

## Returns and assignment

`__addarg` returns `0` for valid argument declaration or `2` for invalid declaration. A single invalid argument declaration invalidates the entire [registration block](/docs/concepts/lifecycle) even if its individual status is ignored by Bash control flow. An invalid `__addarg` declaration may stop execution when `set -e` applies, but conditional calling contexts can suppress this behavior. Without applicable `errexit` or explicit error handling, execution continues with the block marked invalid (see [parsing and control flow](/docs/concepts/control-flow)). Destination variables are assigned value during successful parsing in [__parseargs](/docs/reference/parseargs), not at argument registration (see [using a guard](/docs/concepts/control-flow#the-parsing-boundary-and-required-guard)).

Successful parsing replaces previous destination values within the context. Omitted flags receive `0`, while omitted optional options and positionals receive their default or an empty string. An explicitly supplied empty string counts as present, including for required arguments. A value left over in `DEST` from an earlier call or context does not satisfy requiredness for its associated argument at parse time.

Destinations must be ordinary or exported scalar variables. Arrays, integers, readonly variables, and namerefs are rejected during parsing, even if registration succeeded. Declare destinations with `local` inside functions when you want to keep their values separate from callers. Intentional globals are also supported, and assignments follow Bash's dynamic scope (see [destination variables and scope](/docs/concepts/destinations)).

## Explore

Use the controls below to update the `__addarg` calls in the sample koi script.

<!-- koi:example -->

## Sample script

```bash
#!/usr/bin/env bash
source ./koi

main() {
    local name
    __addarg name -o -s n -l name -d 'Who to greet' -D 'world'
    __parseargs "$@" || return "$koi_status"

    printf '%s\n' "$name"
}

main "$@"
```

## Generated help via -h/--help

<!-- koi:include greet-help.txt -->
