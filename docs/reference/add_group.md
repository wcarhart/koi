---
title: "koi::add_group"
description: "Constrain which flags and options can be supplied together."
layout: article
---

`koi::add_group` registers a relationship between arguments already declared with [koi::add_arg](/docs/reference/add_arg) in the current [registration block](/docs/concepts/lifecycle). Groups can be at most one (`XOR`), at least one (`OR`), or all (`AND`).

## Usage

```text usage
koi::add_group (-x|-o|-a) [-r] DEST DEST...
```

## Arguments

| Parameter | Description |
| --- | --- |
| `-x`, `--xor` | Allow at most one member. With `--required`, require exactly one. |
| `-o`, `--or` | Require at least one member. Must include `--required`. |
| `-a`, `--and` | Allow none or all members. With `--required`, require all. |
| `-r`, `--required` | Require the group. Groups are optional by default. |
| `DEST DEST...` | At least two distinct destinations declared earlier in this context. |

You must supply exactly one type for the group, and the arguments registered in a group must be declared before the `koi::add_group` statement. `DEST` must be the destination name(s), such as `name` instead of `$name` or `--name`.

Group members must be flags or options. Both scalar and array options are supported. Positionals are not supported, and arguments registered in a group cannot be individually required. An argument can belong to one group at most, and cannot be listed in the same group twice. Groups cannot contain other groups or arguments from another context.

You cannot have an optional `--or` group, given that is no different from the individual flags or options being independently registered themselves.

```bash
koi::add_arg name -o -l name -d Name
koi::add_arg identifier -o -l identifier -d Identifier
koi::add_group --xor --required name identifier
```

This requires exactly one of `--name` and `--identifier`. For three or more members, `--xor` still means exactly one member is required.

## Presence and defaults

Groups count distinct destinations explicitly supplied in the invocation. Values, defaults, and stale destination contents do not impact presence when parsed nor do they determine membership.

An explicit empty string is a valid value, even when supplied as an argument to a group. Repeating an option still selects one member. Array options count once regardless of their element count. Flags in a cluster count just as they would when supplied separately.

Defaults keep their normal behavior:

```bash
local name identifier
koi::add_arg name -o -l name -d Name -D world
koi::add_arg identifier -o -l identifier -d Identifier -D anonymous
koi::add_group --xor name identifier
koi::parse "$@" || return "$koi_status"
```

With no input, the optional group passes and both destinations receive their defaults. With `--name Ada`, `name` receives `Ada` and `identifier` still receives `anonymous`. The group constrains explicit input; it does not guarantee that only one destination contains a value.

Adding `--required` makes no input to the group an error, even though both defaults exist. Omitted defaults still run through their [validators](/docs/reference/add_validator), including defaults for unselected members.

## Help

| Group | Usage expression |
| --- | --- |
| Required XOR | `(-a \| -b \| -c)` |
| Optional XOR | `[-a \| -b \| -c]` |
| Required OR | `(-a \|\| -b \|\| -c)` |
| Required AND | `(-a & -b & -c)` |
| Optional AND | `[-a & -b & -c]` |

In the usage line koi generates in help menus, `|` means exclusive choice, `||` means one or more, and `&` means all together. Koi does not generate a legend for this notation in the help menu.

The difference between `||` and `|` in usage statements is not always obvious. Use `koi::config use-single-pipe-for-or-groups true` at script scope or inside a parsing function if you'd prefer to display inclusive OR with `|` too. See [koi::config](/docs/reference/config).

## Return and enforcement

Valid registration returns `0`. Invalid registration returns `2` and invalidates the block. Unknown or repeated members, overlapping groups, unsupported kinds, repeated declaration options, and optional OR groups are [author errors](/docs/reference/glossary#author-error).

Invocation checks run after individual requiredness and before [dependencies](/docs/reference/add_dependency), defaults, validators, and assignment. The first violation is a [user error](/docs/concepts/errors). Like other steps in parsing, no destinations are assigned upon group usage errors.

See [parsing steps](/docs/concepts/control-flow#parsing-steps) for the full order.

## Example

<!-- koi:include group.sh -->

Running `./script.sh --name Ada --token demo` prints:

<!-- koi:include group.txt -->

Generated help via `-h`/`--help`:

<!-- koi:include group-help.txt -->
