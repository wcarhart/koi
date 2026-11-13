---
title: "__koirun"
description: "Consume root registration and enter the command tree once."
layout: article
---

```bash
__koirun [SETTINGS] "$@"
```

`"$@"` forwards root options, positional values, or the selected command and its arguments. Call once per library initialization. The first attempt consumes root registration even on help or error; a second call and later root declarations fail. Re-sourcing does not reset the lifecycle.

## Options

| Parameter | Description |
| --- | --- |
| `--koi-zero-argument-message MESSAGE` | Nonempty error text when no command is given; otherwise a branch shows help |
| `--koi-enable-help-on-unknown-commands` | Accept an unknown command with a standalone help request; off by default |
| `--koi-disable-help-subcommand` | Disable built-in branch help commands and allow custom `help` commands |
| `--koi-enable-verbose-help` | Enable root `help --verbose`; off by default |
| `--koi-enable-help-hints` | Add capability-aware root help hints; off by default |

Settings precede application arguments. Duplicate switches fail. Verbose help cannot be combined with disabling built-in help. Automatic `-h` and `--help` remain available.

## Terminal roots

Root positionals are allowed when there are no application children. Successful terminal parsing returns `0`; the two command-error settings have no effect there. The runner also returns `0` after help, so prefer a guarded function entrypoint when local business logic must stop on help.

## Return status

Returns the selected handler's status, `0` for help or successful terminal parsing, or `2` on error. Built-in help commands appear on branches only. Descendant handlers must close their own declarations with guarded `__parseargs`.
