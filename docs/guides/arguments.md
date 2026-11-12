---
title: "Flags, options & positionals"
description: "Choose an argument kind and keep values in ordinary variables."
layout: article
---

A **flag** takes no value and assigns `0` or `1`. A scalar **option** consumes one value. A scalar **positional** consumes one bare token in declaration order.

```bash
__addarg verbose -f -s v -l verbose -d 'Print progress'
__addarg environment -o -s e -D staging -d 'Environment'
__addarg source -p -r -d 'Source file'
```

## Defaults and requiredness

Arguments are optional unless `-r` is present. An optional option or positional can have `-D DEFAULT`, including an empty default. A required argument must be explicitly present and cannot have a default. An explicit empty token is still a provided value.

Defaults are assigned afresh on successful parsing; old destination contents do not determine whether an argument was provided. Repeated scalar options normally keep the last value. A parser can opt into duplicate rejection.

## Positional order

Required positionals must precede optional positionals. Optional slots fill left to right, with no implicit skipping. Options can appear between positional values. A context cannot declare both positionals and application child commands.

## Literal values and the separator

Quote values as you would for any Bash call. `--` ends option recognition; subsequent tokens are literal positional data, including `--help`. Unknown dash-prefixed tokens are otherwise errors. A lone `-` is ordinary data.

```bash
bash copy.sh 'two words' -v out
bash copy.sh -- --help
```

Missing required values and excess positionals fail without assigning destinations. See [the argument reference](/docs/reference/addarg) for declaration options and [the positional example](/docs/examples/positionals) for a complete script.
