---
title: "Customize generated help"
description: "Configure descriptions, formatting, and built-in help."
layout: split
---

> Authoring outline: documentation to be written.

## Describe and format the interface

- TODO: Walk through root `koi::config` settings for script name, description, and help width; contrast registered command descriptions with direct-call `koi::config description` fallback text.
- TODO: Demonstrate wrapping descriptions while usage stays on one line; link exact settings to [koi::config](/docs/reference/config).
- TODO: Explain automatic `-h`/`--help`, help skipping current-context required-value checks and assignments, and returning successfully through the standard guard.

## Configure branch help

Routed branches provide a built-in `help` command. Run `./app.sh help` to show root help, or `./app.sh branch help` to show a branch's help. Add `-h` or `--help` to document the help command itself: `./app.sh help -h` shows its options, while `./app.sh branch help --help` shows the nested help command's menu. Leaves and direct function calls do not receive built-in help commands; bare `help` can be data on positional leaves.

- TODO: Demonstrate `koi::config help-subcommand false` for application-defined help commands while retaining automatic help flags; direct calls outside the runner do not acquire built-in help commands.
- TODO: Show that routing to child help still requires valid ancestor arguments; link [calls and command routing](/docs/concepts/routing).

## Enable hints and verbose help

Enable `koi::config verbose-help true` to support root `./app.sh help -v` and `./app.sh help --verbose`. Both print root help followed by command help in depth-first registration order. This requires the built-in help command to remain enabled. The help command's own menu lists `-v, --verbose` only where available.

When verbose and help flags appear together, help takes precedence: `./app.sh help -v -h` shows the same menu as `./app.sh help -h` without traversing commands. Either order and both short/long spellings work, including when verbose help is disabled or at a nested branch. Repeated flags, combined short spellings such as `-vh`, and unrelated arguments are rejected.

Enable `koi::config help-hints true` for root hints advertising available help features. See [koi::config](/docs/reference/config) and [koi::run](/docs/reference/run).

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
