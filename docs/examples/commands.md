---
title: "A nested command application"
description: "Give a branch a default action and route explicit child commands."
layout: split
---

Save the script as `app.sh` beside the library. The root shows help without a command. Bare `deploy` starts or updates all Compose services; selecting a child performs only that child action. Explicit help performs no operation.

```bash
bash app.sh
bash app.sh deploy
bash app.sh deploy --help
bash app.sh deploy service api -f compose.prod.yaml
```

The script invokes Docker Compose or Terraform. The captured output below uses a mock Docker command to demonstrate the default action without deploying services. For a grouping-only branch, add `koi::config missing-command help` or `error` before parsing.

<!-- koi:example -->

## app.sh

<!-- koi:include commands.sh -->

## Final invocation output

<!-- koi:include commands.txt -->
