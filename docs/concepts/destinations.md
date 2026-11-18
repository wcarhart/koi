---
title: "Destination variables and scope"
description: "How koi assigns parsed arguments to Bash variables."
layout: article
---

Koi assigns parsed values to ordinary Bash variables. The first parameter of [koi::add_arg](/docs/reference/add_arg) names the _destination_, which is the Bash variable that holds the argument’s parsed value:

```bash
#!/usr/bin/env bash
source koi

deploy() {
    local environment
    koi::add_arg environment --option --short e --long environment --default production --description 'Where to deploy'
    koi::parse "$@" || return "$koi_status"

    printf 'Deploying to %s\n' "$environment"
}

deploy "$@"
```

Running `./app.sh -e staging` assigns `staging` to `environment` and prints `Deploying to staging`. With no arguments, it uses the declared default, `production`.

## Destination names and values

The destination is independent of the [argument labels and display name](/docs/concepts/arguments#labels-destinations-and-display-names). For example:

```bash
koi::add_arg output_file --option --long output-file --display-name FILE --description 'Where to write output'
```

Here, callers use `--output-file`, help shows `--output-file FILE`, and your code reads the value from `$output_file`. Destinations must be valid Bash identifiers, so use underscores rather than hyphens in variable names. Koi also reserves names such as `koi_status`, names starting with `__koi_`, and certain shell variables. See [koi::add_arg](/docs/reference/add_arg#arguments) for the naming rules.

[Registration](/docs/concepts/lifecycle) records the destination name without assigning a value. During successful parsing, koi replaces every destination in the current context with its parsed value or fallback. Omitted flags receive `0`, and omitted optional scalar options and positionals receive their declared default or an empty string. Initializing a variable before parsing doesn't provide a default, so use `--default` for that. Existing values also don't satisfy [required](/docs/reference/glossary#requiredness) arguments. Help leaves destination values unchanged.

Destinations can be [scalars](/docs/reference/glossary#scalar) or [arrays](/docs/reference/glossary#array) (see [cardinality](/docs/concepts/cardinality)).

Scalar destinations can be unset, ordinary scalars, or exported scalars. Array destinations must be absent or [indexed arrays](https://www.gnu.org/software/bash/manual/html_node/Arrays.html), optionally exported. Declare array locals with `local -a files` prior to parsing if you want them to specify their scope, otherwise koi will declare them according to Bash dynamic scope. Koi rejects incompatible attributes during parsing. For example, use `local count` rather than `local -i count`, even if you expect a numeric value. See the [destination contract](/docs/reference/add_arg#returns-and-assignment).

## Locals, globals, and dynamic scope

Usually, you'll want to declare destinations with `local` before the [registration block](/docs/concepts/lifecycle), as `deploy` does in the example above. Each invocation gets its own variable, and the value remains available until that function returns. Koi discards the [registration spec](/docs/concepts/lifecycle) after parsing, but that doesn't affect the destination's lifetime.

Without its own `local`, a function can assign to a variable in its caller. This is Bash's _dynamic scope_: Bash looks for the nearest visible local with that name in the active call stack, falling back to a global if none exists. For example, this parsing function changes its caller's `environment`:

```bash
select_environment() {
    koi::add_arg environment --option --long environment --description 'Where to deploy'
    koi::parse "$@" || return "$koi_status"
}

main() {
    local environment=production
    select_environment --environment staging || return "$?"
    printf '%s\n' "$environment"
}

main
```

This prints `staging`. To keep the parsed value inside `select_environment`, give it its own local:

```bash
select_environment() {
    local environment
    koi::add_arg environment --option --long environment --description 'Where to deploy'
    koi::parse "$@" || return "$koi_status"
}
```

With this change, the same `main` prints `production`. The inner local shadows the caller's variable while `select_environment` runs, then disappears when it returns. Repeated calls each get their own local.

Intentional globals are supported too. If no active function declares a local with the destination's name, the parsed value is assigned globally and remains available after the parsing function returns. Choose names with care when sharing values this way, since a caller's local can change where the assignment lands.

## Visibility across commands

A child command can read its parent's parsed destinations through ordinary Bash scope. For example, a handler can read a root-level `verbose` flag unless it declares its own local named `verbose`. Registering an argument in a child doesn't automatically create a local variable for it.

This visibility doesn't make the parent's argument labels available in the child. In `./app.sh -v deploy`, the root recognizes `-v` and `deploy` can read its value. Moving `-v` after `deploy` requires the child to declare that label itself. See [argument ownership along a route](/docs/concepts/routing#argument-ownership-along-a-route).

These scope rules also apply when you source a script into your shell. Global assignments can persist in that shell, while running a function in a subshell or command substitution keeps its assignments inside that subshell. See [reusing parsing functions](/docs/guides/functions) for practical patterns.

## Validation

When [validators](/docs/reference/glossary#validator) are registered in a context, all validators must pass before any destinations are assigned. This ensures that contexts are parsed _atomically_, and you will never end up in a state with partial update to context destinations upon validator failure.

## Group defaults

Arguments within [groups](/docs/reference/add_group#presence-and-defaults) still assign their associated default when omitted. Koi does not equate a destination being assigned a value with _presence_ of its associated argument when parsing.

This means that you can have an `--xor` group where the members of the group each have defaults. While two or members of the mutually exclusive group cannot be present when parsed, all of them can be assigned default values when omitted.

[Validators](/docs/reference/add_validator) still run on omitted explicit defaults, even in groups.
