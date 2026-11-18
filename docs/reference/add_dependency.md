---
title: "koi::add_dependency"
description: "Declare an argument as dependent on another."
layout: article
---

`koi::add_dependency` adds direct prerequisites to a flag or option already declared in the current [registration block](/docs/concepts/lifecycle). For example, this make it possible for a flag `-a` to only be present when another flag `-b` is also present.

## Usage

```text usage
koi::add_dependency DEST (-r|--requires) DEST...
```

## Arguments

| Parameter | Description |
| --- | --- |
| `DEST` | One dependent destination declared earlier in this context. |
| `-r`, `--requires` | Separate the dependent from its prerequisites. |
| `DEST...` | One or more prerequisite destinations declared earlier in this context. |

```bash
koi::add_dependency upload --requires token account
```

In this example, supplying `upload` requires both `token` and `account`. Supplying either prerequisite alone does not require `upload`. To give several dependents the same prerequisite, register each dependent separately.

Only flags and options are supported. Options in dependency relationships can be either scalars or arrays (see [cardinality](/docs/concepts/cardinality)). Positionals, self-dependencies, unknown arguments, and cross-context references are not supported. Individually required arguments can be used in dependencies, unlike with [groups](/docs/reference/add_group). `DEST` needs to be the destination names of the previously registered arguments in the dependencies. e.g. `name` instead of `$name` or `--name`.

Every directed edge must be unique. Reordering prerequisites does not change their identity. These declarations repeat the same edge and are rejected:

```bash
koi::add_dependency upload --requires token account
koi::add_dependency upload --requires account
```

## Presence

Dependencies use explicit presence, just like [groups](/docs/reference/add_group#presence-and-defaults). Defaults and stale values do not satisfy prerequisites. As consistent with other koi behavior, empty strings count as supplied values. Array options count once regardless of how many elements they contain.

Koi checks every declared edge for uniqueness. Chains and cycles are allowed and are the author's responsibility to manage. For `a` requiring `b` and `b` requiring `a`, either both must be supplied or neither.

Koi also checks direct dependencies between members of the same [XOR group](/docs/reference/add_group), and such is reported as an [author error](/docs/reference/glossary#author-error). This is checked when the complete spec is finalized, regardless of declaration order. Koi does not analyze transitive contradictions or solve the full grouping and dependency configuration for viability beyond what's mentioned here.

## Help

With dependencies, the usage line in generated help menus does not change (unlike [groups](/docs/reference/add_group#help)). Instead, help adds a separate section for dependencies:

```text
Dependencies:
  --upload requires --token and --account
```

## Return and enforcement

Valid registration returns `0`. Invalid registration returns `2`, reports an [author error](/docs/concepts/errors), and invalidates the block. Destinations are not assigned unless group and dependency enforcement passes. See [parsing steps](/docs/concepts/control-flow#parsing-steps) for the full order.
