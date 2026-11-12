---
title: "A function entrypoint"
description: "A complete script without a command runner."
layout: split
---

This script calls `main` directly. Copy it beside the library as `greet.sh`, then run:

```bash
bash greet.sh --name Ada
bash greet.sh --help
```

The local destination keeps the function's result isolated. The guard lets help return successfully without printing the destination.

<!-- koi:example -->

## Complete script

<!-- koi:include greet.sh -->
