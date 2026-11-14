---
title: "Scalars and arrays"
description: "Scalar and array cardinality for options and positionals."
layout: article
---

## Kind and cardinality

- TODO: Distinguish kind from cardinality and explain scalar-by-default behavior.
- TODO: Introduce `-S`/`--scalar` and `-a`/`--array`, repeated modifiers, flag rejection, and invalid combinations. Link [declaration contracts](/docs/reference/add_arg#cardinality).

## Replacement and accumulation

- TODO: Explain scalar replacement and ordered array accumulation across aliases.
- TODO: Cover optional and required arrays, including empty-string elements.
- TODO: Describe positional layout and left-to-right filling.
- TODO: Explain duplicate checking for scalar options and flags, and the array exemption. Link [parser settings](/docs/reference/parse#arguments).
- TODO: Explain why arrays have no defaults.

## Destinations and tokens

- TODO: Cover typed destinations, dynamic scope, complete replacement, and stale values. Link [assignment contracts](/docs/reference/add_arg#returns-and-assignment).
- TODO: Cover `--`, interleaved options, and preservation of literal elements.

## Generated help

- TODO: Explain repeated option units, positional ellipses, and repeatable annotations. Link [help notation](/docs/reference/add_arg#array-help).
