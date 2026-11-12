---
title: "Help that follows your interface"
description: "Automatic help flags, branch help commands, and explicit configuration."
layout: split
---

Koi supplies `-h` and `--help` automatically. Help skips the current context's required-value checks and assignments, then returns successfully through the parser guard.

## Branch help commands

The runner also supplies a `help` command to branches with application children. Leaves do not acquire it. On a positional leaf, bare `help` is ordinary data; use `--help` to request a menu.

Disable built-in help subcommands with `--koi-disable-help-subcommand` if you want application-defined `help` commands. Automatic help flags remain available.

## Descriptions and formatting

Use root `__koiconfig` settings for the script name, description, and help width. Command descriptions come from `__addcommand`; direct function descriptions come from `__adddescription`. Descriptions wrap, but usage stays on one line.

## Hints and verbose help

Runner hints and root `help --verbose` are opt-in. Verbose help traverses registered commands in depth-first registration order. It executes preparation and registration code, so keep that code free of business effects.

Normal routing to a child's help still requires valid ancestor arguments. Direct calls outside the runner do not acquire free help commands.

Use the controls below to generate configuration code. The captured output beside it is the unchanged default example, not a live terminal.

<!-- koi:example -->

## Help configuration

<!-- koi:include help.sh -->

## Fixed default output

```bash
bash app.sh --help
```

<!-- koi:include help.txt -->
