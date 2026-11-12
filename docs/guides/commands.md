---
title: "Commands & nesting"
description: "Expose only the commands you explicitly register."
layout: article
---

Register each command with a CLI name, handler function, and description. Ambient functions are never discovered as commands.

```bash
__addcommand deploy -f deploy -d 'Deployment commands'
```

Root registration happens at script scope and is consumed by `__koirun`. A handler registers its children inside its own function before its guarded parser call. Commands can nest to arbitrary practical depth.

## Branches and leaves

A context with application children is a branch. It dispatches a selected child or shows help when none is selected. It never continues into its own business logic. A leaf has no application children and continues after successful parsing.

Several CLI names can share one handler. Help retains the selected alias and its description.

## Options belong to a context

Parent options precede the child name. After selection, all remaining tokens belong to the child. Parent option spellings are not inherited, though destination values remain visible under normal Bash scope.

```bash
bash app.sh -v deploy -e staging
```

Here `-v` belongs to the root and `-e` belongs to `deploy`. A child may reuse its parent's spelling with a different meaning.

See the [complete nested-command example](/docs/examples/commands).
