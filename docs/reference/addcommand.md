---
title: "__addcommand"
description: "Register one immediate child command."
layout: split
---

```bash
__addcommand NAME -f HANDLER -d DESCRIPTION
```

| Parameter | Contract |
| --- | --- |
| `NAME` | CLI command name, unique within this context |
| `-f`, `--function HANDLER` | Bash function to invoke |
| `-d`, `--description DESCRIPTION` | Required nonempty command description |

Declare root commands at script scope. Declare nested commands inside their owner before guarded parsing. The handler must be a function by dispatch time; it can be defined after root registration.

The command description leads routed help. Aliases may share a handler. Registering a command does not execute its handler.

Returns `0` on success or `2` on an invalid declaration. See [commands and nesting](/docs/guides/commands).

<!-- koi:example -->

## A command tree

<!-- koi:include commands.sh -->
