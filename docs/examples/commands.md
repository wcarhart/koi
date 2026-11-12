---
title: "A nested command application"
description: "Register a branch, route to a leaf, and keep help automatic."
layout: split
---

Save the script as `app.sh` beside the library. Root and branch contexts show help when no application child is selected.

```bash
bash app.sh
bash app.sh deploy
bash app.sh deploy app --help
bash app.sh deploy app -e production
```

The leaf prints a mock action. There is no deployment side effect.

<!-- koi:example -->

## app.sh

<!-- koi:include commands.sh -->

## Final invocation output

<!-- koi:include commands.txt -->
