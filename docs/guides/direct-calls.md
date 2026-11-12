---
title: "Direct calls & scope"
description: "Parsing functions remain ordinary Bash functions."
layout: article
---

A function does not need command registration to parse arguments. Call it directly with ordinary Bash arguments:

```bash
print_name() {
    local name
    __addarg name -o -s n -D world -d 'Name'
    __parseargs "$@" || return "$koi_status"

    printf '%s\n' "$name"
}

print_name -n Ada
print_name --help
print_name
```

## Declare your locals

Koi writes to ordinary Bash variables. Declare destinations with `local` in their owning function when isolation matters. Bash uses dynamic scope: without a local, an assignment can reach an ancestor's visible local or a global.

Intentional global destinations are supported. Koi does not require an object or result dictionary.

## Sourceable applications

Sourcing the library does not change shell options or terminate the caller for routine help and parse errors. Your application's control flow must preserve this property too: return to a sourcing caller instead of exiting its shell.

A directly called parsing helper builds its own spec. Call it before another function's registration starts or after that function's parsing completes, never halfway through its declarations.
