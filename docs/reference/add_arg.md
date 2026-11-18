---
title: "koi::add_arg"
description: "Define one flag, option, or positional argument in the current registration context."
layout: split
---

`koi::add_arg` registers a parseable argument in the current registration context (see [registration contexts](/docs/concepts/lifecycle#contexts-blocks-and-specs)). Use `koi::add_arg` to define an argument that can be parsed by your function. `koi::add_arg` statements must be used inside [registration blocks](/docs/concepts/lifecycle) and must be followed by a guarded [koi::parse](/docs/reference/parse) statement at the function level or a [koi::run](/docs/reference/run) statement at the root level.

## Usage

```text usage
koi::add_arg DEST (-f|-o|-p) -d DESCRIPTION [-s SHORT] [-l LONG] [-S|-a] [-r] [-D DEFAULT] [-n NAME]
```

## Arguments

| Parameter | Description |
| --- | --- |
| `DEST` | The destination Bash variable that will hold this argument's value. Reserved shell and koi variable names are rejected. |
| `-f`, `--flag` | Set kind to _flag_. Consumes no value and assigns `0` or `1` to `DEST` upon parse. |
| `-o`, `--option` | Set kind to _option_. Consumes the next single value and assigns it to `DEST` upon parse, except for `-h`/`--help`. |
| `-p`, `--positional` | Set kind to _positional_. Consumes positional values without an argument label and assigns it to `DEST` upon parse. |
| `-S`, `--scalar` | Store only one value when parsing an option or positional. This is the default behavior for options and positionals. Cannot be used with flags. |
| `-a`, `--array` | Accumulate values in an indexed array when parsing options or positionals. Options consume one value per occurrence, positionals consume remaining positional values. Cannot be used with flags. |
| `-s`, `--short SHORT` | The one-letter spelling for the argument label, without a dash. `h` is reserved. |
| `-l`, `--long LONG` | The long spelling for the argument label, without dashes. `help` is reserved. |
| `-d`, `--description DESCRIPTION` | The nonempty help text for the argument. |
| `-r`, `--required` | Require explicit presence when parsing. All arguments are optional by default. |
| `-D`, `--default DEFAULT` | The default value for optional scalar options or positionals, including an empty string. If none is provided, the empty string will be used. Flags, arrays, and required arguments cannot have defaults. |
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

Each argument you define with `koi::add_arg` has a _kind_, either _flag_, _option_, or _positional_ (see [glossary](/docs/reference/glossary#kind)). Only one kind can be used per registered argument, think of it as the argument's type or what action koi should take when parsing an argument. **Flags**, which you specify via `-f` or `--flag`, do not require an additional argument. **Options**, which you specify via `-o` or `--option`, consume the next token as their additional, required value (even if it starts with `-`, with exception for `-h`/`--help`). **Positionals**, which you specify via `-p` or `--positional`, do not require an argument label like `-a` or `--my-option` and consume the next value in the order the positionals are defined by `koi::add_arg` calls.

Exactly one kind and a nonempty description are required. Flags and options need at least one short or long spelling, and you can supply both as aliases for the same argument. Koi only recognizes the spellings you declare. Positionals cannot have either spelling or share a context with child commands registered via [koi::add_command](/docs/reference/add_command).

See [arguments and values](/docs/concepts/arguments#recognizing-options) for flag clusters, repeated scalar values, and supported input forms.

## Cardinality

Some argument kinds can also have [cardinality](/docs/reference/glossary#cardinality), specifically options and positionals (flags do not have cardinality). Cardinality means how many values the [destination](/docs/reference/glossary#destination) can hold, either a single value (scalar) or an array of values (see [scalars and arrays](/docs/concepts/cardinality)). Use `-S`/`--scalar` or `-a`/`--array` to specify an argument's cardinality. Repeating or mixing cardinality modifiers for a single argument is not supported. By default with no cardinality explicitly specified, options and positionals are scalar. `-a`/`--array` and `-D`/`--default` cannot be used together.

When repeated, scalar options and flags keep their last value by default (this behavior can be configured in [koi::parse](/docs/reference/parse)). For example, `--include a --include b` would assign `b`. In contrast, array options accumulate one element per occurrence in input order across registered argument labels. For example, `--include a --include b` would assign `(a b)`. Identical values are never deduplicated in arrays upon parse.

A context can have at most one positional array to avoid parsing ambiguity. It must be the final positional declaration, whether required or optional, although flags and options may follow it. All preceding scalar positionals must be required. No optional scalar positional may coexist with a positional array, as that can create confusion when parsing arguments. Positionals cannot coexist with application child commands (see [koi::add_command](/docs/reference/add_command)).

Optional arrays can accept zero or more elements, while a required array needs at least one supplied value. An empty string is one element and satisfies [requiredness](/docs/reference/glossary#requiredness) in arrays. Existing destination values, even when set before parsing, never satisfy requiredness. See [destinations](/docs/concepts/destinations).

## Array help

Display names use the same uppercase and spelling preferences as scalars.

| Argument | Usage fragment |
| --- | --- |
| Required positional array | `FILE...` |
| Optional positional array | `[FILE...]` |
| Optional array option | `[-I FILE]...` |
| Required array option | `-I FILE [-I FILE]...` |

## Standalone `--`

Koi supports the common Unix command-line convention of using `--` to end option recognition.

Use a standalone `--` to end flag and option recognition and supply positional values that start with dashes. For example, if your script declares a positional argument, `./myscript.sh -- -h` supplies the literal value `-h` without showing help. Subsequent tokens fill the remaining positional slots, including tokens such as `--help` that would otherwise request help.

Options remain recognizable between positional-array values. After the first standalone separator, every token is positional data, including another `--`.

> [!NOTE] Example
Consider if you have two registered, required positional scalars and one optional positional array. Parsing tokens `a b c d -- e f` would produce destination values `a, b, [c, d, e, f]`, because the `--` is ignored. However, if we parsed tokens `a b c -- d -- e f`, our resulting destination values would be `a, b, [c, d, --, e, f]`.


An option waiting for a value consumes `--` as that value, so `./myscript.sh --output --` assigns `--` to the output option and continues recognizing flags and options afterward. In a [branch](/docs/reference/glossary#branch), a standalone `--` ends the parent's option recognition, and the next token still selects a child command. The child's parser handles the remaining tokens independently.

> [!NOTE] Optional positionals
> Optional positionals create a bit of complexity during parsing, since it's easy for the provided arguments to be ambiguous. Koi uses the following parsing rules for optional positionals:
> 1. Provided positional values fill the registered positional arguments from left to right.
> 2. All required positional arguments must be registered via `koi::add_arg` before any optional positional arguments.
>
> This means you cannot skip a preceding optional positional and supply a later one, as doing so would create ambiguity. For example, with two optional `source` and `target` positionals, a single provided positional value will always fill `source` and leave `target` the empty string or its specified default value.

## Returns and assignment

`koi::add_arg` returns `0` for valid argument declaration or `2` for invalid declaration. A single invalid argument declaration invalidates the entire [registration block](/docs/concepts/lifecycle) even if its individual status is ignored by Bash control flow. An invalid `koi::add_arg` declaration may stop execution when `set -e` applies, but conditional calling contexts can suppress this behavior. Without applicable `errexit` or explicit error handling, execution continues with the block marked invalid (see [parsing and control flow](/docs/concepts/control-flow)). Destination variables are assigned value during successful parsing in [koi::parse](/docs/reference/parse), not at argument registration (see [using a guard](/docs/concepts/control-flow#the-parsing-boundary-and-required-guard)).

Successful parsing replaces previous destination values within the context. Omitted flags receive `0`, while omitted optional scalar options and positionals receive their default or an empty string. Omitted optional arrays become empty [indexed arrays](https://www.gnu.org/software/bash/manual/html_node/Arrays.html). An explicitly supplied empty string counts as present, including for required arguments. A value left over in `DEST` from an earlier call or context does not satisfy requiredness for its associated argument at parse time.

Scalar destinations must be absent, ordinary scalars or exported scalars. Array destinations must be absent or plain indexed arrays, optionally exported. Existing scalars (including untyped `local files`), associative arrays, readonly variables, namerefs, integers, and case-transforming attributes are rejected for arrays. Declare array locals with `local -a files` or `declare -a files` if you don't want koi to declare the array destinations for you. Successful parsing replaces the entire array, including stale values and sparse indices. All destinations are checked before any assignment. Declare destinations with `local` inside functions when you want to keep their values separate from callers. Intentional globals are also supported, and assignments follow Bash's dynamic scope (see [destination variables and scope](/docs/concepts/destinations)).

## Validation

Use [koi::add_validator](/docs/reference/add_validator) after declaring an option or positional to check its effective values when parsing. Checks run after parsing and all destination-type checks, before any destination assignment or child dispatch. Supplied rejections are [user errors](/docs/reference/glossary#user-error). Flag values cannot be validated.

## Argument relationships

You can also organize of two or more arguments into relationships such as _groups_ (like mutually exclusive groups) or _dependencies_ (like one flag requiring another). Use [koi::add_group](/docs/reference/add_group) or [koi::add_dependency](/docs/reference/add_dependency) after declaring the participating flags and options. Relationships use explicit presence. Defaults still apply to omitted options after relationship checks pass. When registered in a group, an individual argument cannot be marked as `--required`.

## Explore

Use the controls below to update the `koi::add_arg` calls in the sample koi script.

<!-- koi:example -->

<div class="argument-demo" data-argument-sample>

## Sample script

```bash
#!/usr/bin/env bash
source ./koi

main() {
    local name
    koi::add_arg name -o -s n -l name -d 'Who to greet' -D 'world'
    koi::parse "$@" || return "$koi_status"

    printf '%s\n' "name: $name"
}

main "$@"
```

## Generated help via -h/--help

<!-- koi:include greet-help.txt -->


</div>
