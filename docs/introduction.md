---
title: "Meet koi"
description: "Bashful argument parsing"
layout: article
---

Koi is a lightweight, 100% Bash-native argument parser. It was originally inspired by Python's [argparse](https://docs.python.org/3/library/argparse.html) and supports most command line argument conventions right out of the box. You can install it via standard package managers or simply copy the `koi` file (a single Bash file) out of the [repository](https://github.com/wcarhart/koi) and source it in your code.

```bash
#!/usr/bin/env bash
source koi

bark() {
    local name
    __addarg name --option --short n --long name --default Fido --description "Dog's name"
    __parseargs "$@" || return "$koi_status"

    printf '%s says woof!\n' "$name"
}

bark "$@"
```

To get started, take a look at [installation](/docs/install) (as simple as `brew tap wcarhart/koi && brew install wcarhart/koi/koi`) and then the [quickstart](/docs/quickstart). After the quickstart, it's a good idea to take a look at core concepts like [registration & control flow](/docs/concepts/lifecycle). You can also take a look at [guides](/docs/guides), the full [reference](/docs/reference), and the [library of examples](/docs/examples).

## Why the name _koi?_

The original working name of the library was Bashful Arg Parser, which is a mouthful. This was shortened to Bashful, to which coy is a synonym. Koi is a homophone of coy and sounds much cooler.
