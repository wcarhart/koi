---
title: "__adddescription"
description: "Describe a function when it is called directly."
layout: article
---

```bash
__adddescription TEXT
```

`TEXT` is required and nonempty. Declare a description once inside the uninterrupted function registration block. Root descriptions use `__koiconfig description TEXT` instead.

When the function is routed as a registered command, that command's description takes precedence. Direct functions without a description start help with `Usage:`.

Returns `0` on success or `2` for invalid scope, arguments, or duplicate descriptions.

```bash
main() {
    __adddescription 'Show application status'
    __parseargs "$@" || return "$koi_status"

    printf 'Ready\n'
}
```
