---
title: "Scalars and arrays"
description: "Scalar and array cardinality for options and positionals."
layout: article
---

Options and positionals can hold a single value (a _scalar_) or multiple values (an _array_). This is called the argument's [cardinality](/docs/reference/glossary#cardinality). For example, a deployment might take one environment name, while a file search might accept several directories to search.

Options and positionals are scalar by default. Use `-a`/`--array` in [koi::add_arg](/docs/reference/add_arg) to collect values in an indexed Bash array, or `-S`/`--scalar` to explicitly choose a scalar. Cardinality is separate from the argument's [kind](/docs/concepts/arguments#arguments-and-kinds), so an option or positional can use either. Flags always assign `0` or `1` and reject both cardinality modifiers.

## Repeating options

A scalar option keeps the last value supplied, while an array option collects each value in input order:

```bash
#!/usr/bin/env bash
source koi

search() {
    local pattern directory
    local -a directories
    koi::add_arg pattern --option --short p --long pattern --description 'Text to search for'
    koi::add_arg directories --option --array --short I --long include --display-name DIR --description 'Directory to search'
    koi::parse "$@" || return "$koi_status"

    printf 'Pattern: %s\n' "$pattern"
    for directory in "${directories[@]}"; do
        printf 'Directory: %s\n' "$directory"
    done
}

search "$@"
```

Running `./search.sh -p koi --pattern bash -I src --include docs -I src` prints:

```text
Pattern: bash
Directory: src
Directory: docs
Directory: src
```

Short and long labels supply the same argument, so they share replacement or accumulation behavior. Arrays preserve duplicate values too.

Each occurrence of an array option still consumes exactly one value. Use `--include src --include docs` to supply two directories. Using `--include src docs` supplies `src` to the option and leaves `docs` as positional input, which this example would cause an error when parsed. Quoting `--include 'src docs'` supplies one value `src docs`.

When scalar options (and flags) are repeated, by default the last value overrides the assigned destination. For example, `--include src --include docs` would assign the value `docs`. To instead reject repeated scalar options and flags, enable duplicate checking in your [guarded parse](/docs/concepts/control-flow#the-parsing-boundary-and-required-guard):

```bash
koi::parse --koi-error-on-scalar-duplicates "$@" || return "$koi_status"
```

Array options continue accumulating with `--koi-error-on-scalar-duplicates` enabled. See [parser settings](/docs/reference/parse#arguments).

## Repeating positionals

A positional array collects the remaining positional values after any scalar positional slots have been filled:

```bash
package_files() {
    local archive
    local -a files
    koi::add_arg archive --positional --required --description 'Archive to create'
    koi::add_arg files --positional --array --required --display-name FILE --description 'Files to package'
    koi::parse "$@" || return "$koi_status"

    tar -cf "$archive" -- "${files[@]}"
}
```

Calling `package_files backup.tar notes.txt 'monthly report.txt'` assigns `backup.tar` to `archive` and two values to `files`: `notes.txt` and `monthly report.txt`. Use `"${files[@]}"` when forwarding the array to preserve each element's boundaries.

A [context](/docs/concepts/lifecycle) can have at most one positional array, and it must be the final positional declaration. Any scalar positionals before it must be required, so there are no optional scalar slots to skip or confuse with array values when parsed. Positionals cannot share a context with [child commands](/docs/concepts/routing#branches-and-leaves).

Flags and options remain recognizable between positional values. For example, you can declare flags and options after a positional array declaration. A standalone `--` ends option and flag recognition and tells koi that the remaining values should be treated as positionals, even if they start with a `-`. For example, `package_files backup.tar notes.txt -- -draft.txt --help` collects `notes.txt`, `-draft.txt`, and `--help` in `files`. See [recognizing options](/docs/concepts/arguments#recognizing-options) for the token rules.

## Requiredness and destinations

Arrays, like all other argument declarations, are optional unless declared with `-r`/`--required`. An omitted optional array becomes empty, while a required array needs at least one explicitly supplied value. An empty string counts as one value, so `--include ''` would satisfy the required `directories` option from the example above.

Arrays cannot use `--default`. If you need to set a default for an optional (but unprovided) array, set it manually after parsing:

```bash
example() {
    local -a arr
    koi::add_arg arr --positional --array --description 'My optional array'
    koi::parse "$@" || return "$koi_status"

    if [[ ${#arr[@]} -eq 0 ]]; then
        arr=("my" "default" "values")
    fi
}
```

If no values for `$arr` above are provided, koi will initialize it as an empty array. Values already in the array destination will be completely replaced upon successful parse, including values from previous calls. A previous value in an existing array destination does not satsify requiredness.

Declare array locals with `local -a`, as in the examples above. Koi will not coerce variable types, so `local -i` for a scalar or `local` for an array will cause an error upon parse. Same with `readonly`. Arrays follow the same dynamic scope rules as scalar destinations, so if you don't use `local -a` koi will make the destination global. See [destination variables and scope](/docs/concepts/destinations) for details and the [assignment contract](/docs/reference/add_arg#returns-and-assignment) for accepted destination types.

## Generated help

Help uses ellipses (`...`) to show that an argument accepts multiple values (see [array help](/docs/reference/add_arg#array-help)):

| Argument | Usage fragment |
| --- | --- |
| Optional array option | `[-I DIR]...` |
| Required array option | `-I DIR [-I DIR]...` |
| Optional positional array | `[FILE...]` |
| Required positional array | `FILE...` |

## Array presence in relationships

An array option counts as a _single_ member in a [group](/docs/reference/add_group) or [dependency](/docs/reference/add_dependency), regardless of how many values are provided when parsed. An explicitly provided empty string value counts as present. No occurrences of the array means it is absent.
