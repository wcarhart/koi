---
title: "Customize generated help"
description: "Configure descriptions, formatting, and built-in help."
layout: split
---

> Authoring outline: documentation to be written.

## Describe and format the interface

- TODO: Walk through root `__koiconfig` settings for script name, description, and help width; contrast registered command descriptions with direct-call `__adddescription` fallback text.
- TODO: Demonstrate wrapping descriptions while usage stays on one line; link exact settings to [__koiconfig](/docs/reference/koiconfig).
- TODO: Explain automatic `-h`/`--help`, help skipping current-context required-value checks and assignments, and returning successfully through the standard guard.

## Configure branch help

- TODO: Demonstrate runner-provided branch `help` commands, leaves without built-in help commands, and bare `help` as data on positional leaves.
- TODO: Demonstrate `--koi-disable-help-subcommand` for application-defined help commands while retaining automatic help flags; direct calls outside the runner do not acquire built-in help commands.
- TODO: Show that routing to child help still requires valid ancestor arguments; link [calls and command routing](/docs/concepts/routing).

## Enable hints and verbose help

- TODO: Demonstrate opt-in runner hints and root `help --verbose`, their dependencies, and depth-first registration-order traversal.
- TODO: Show safe preparation and declarations during help traversal; link pre-parse effects to [parsing and control flow](/docs/concepts/control-flow) and [troubleshooting](/docs/guides/troubleshooting).
- TODO: Explain how to use the retained interactive controls to generate configuration code, and clarify that the captured output is the fixed default example rather than live execution.

<!-- koi:example -->

## Help configuration

<!-- koi:include help.sh -->

## Fixed default output

```bash
bash app.sh --help
```

<!-- koi:include help.txt -->
