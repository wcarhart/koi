---
title: "__addarg"
description: "Define one flag, option, or positional argument in the current registration context."
layout: split
---

`__addarg DEST` registers a parseable argument in the current registration context (see [registration contexts](/docs/guides/lifecycle#doc-guides-lifecycle-two-entrypoints)). Use `__addarg` to define an argument that can be parsed by your function. `__addarg` statements must be used inside [registration blocks](/docs/guides/lifecycle) and must be followed by a guarded `__parseargs` statement at the function level or a `__koirun` statement at the root level.

## Usage

```TEXT
__addarg DEST (-f|-o|-p) -d DESCRIPTION [-s SHORT] [-l LONG] [-r] [-D DEFAULT] [-n NAME]
```

## Options

| Parameter | Description |
| --- | --- |
| `DEST` | The destination Bash variable that will be used for this argument. Variables that are used by the shell or koi-internals will be rejected. |
| `-f`, `--flag` | Define kind as _flag_. Consumes no value and assigns `0` or `1` to `DEST` upon parse. |
| `-o`, `--option` | Define kind as _option_. Consumes the next single value and assigns it to `DEST` upon parse. |
| `-p`, `--positional` | Define kind as _positional_. Consumes a single positional value without an argument label and assigns it to `DEST` upon parse. |
| `-s`, `--short SHORT` | The one-letter spelling for the argument label, without a dash. `h` is reserved. |
| `-l`, `--long LONG` | The long spelling for the argument label, without dashes. `help` and some koi-internal strings are reserved. |
| `-d`, `--description DESCRIPTION` | The nonempty help text for the argument |
| `-r`, `--required` | Whether or not the argument is required. |
| `-D`, `--default DEFAULT` | The default value for optional options or positionals. If none is provided, the empty string will be used. |
| `-n`, `--display-name NAME` | Alias for `DEST` to be used in generated help menu. |

## Kind

Each argument you define with `__addarg` has a _kind_, either _flag_, _option_, or _positionals_ (see [glossary](/docs/glossary)). Only one kind can be used per registered argument, think of it as the argument's type or what action koi should take when parsing an argument. **Flags**, which you specify via `-f` or `--flag`, do not require an additional argument. **Options**, which you specify via `-o` or `--option`, consume the next value as their additional, required argument (even if the value starts with `-`). **Positionals**, which you specify via `-p` or `--positional`, do not require an argument label like `-a` or `--my-option` and consume the next value in the order the positionals are defined by `__addarg` calls. If an argument starts with a `-` but no such matching spelling exists in the registration context, the argument will be treated as a positional.

> [!NOTE] Optional positionals
> Optional positionals create a bit of complexity during parsing, since it's easy for the provided arguments to be ambiguous. Koi uses the following parsing rules for optional positionals:
> 1. Provided positional values fill the registered positional arguments from left to right.
> 2. All required positional arguments must be registered via `__addarg` before any optional positional arguments.
>
> This means you cannot skip a preceding optional positional and supply a later one, doing so would create ambiguity. For example, with two optional `source` and `target` positionals, a single provided positional value will always fill `source` and leave `target` the empty string or its specified default value.

## Returns and assignment

`__addarg` returns `0` for valid argument declaration or `2` for invalid declaration. A single invalid argument declaration invalidates the entire [registration block](/docs/guides/lifecycle) even if its individual status is ignored by Bash control flow. If `set -e` is used, an invalid `__addarg` declaration will cause the current control flow to exit, but without it invalid declaration will not stop execution. Destination variables are assigned value during successful parsing in [__parseargs](/docs/reference/parseargs), not at argument registration (see [using a guard](/docs/guides/lifecycle#doc-guides-lifecycle-parser-result-and-caller-result)).

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
