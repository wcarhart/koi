---
title: "__addarg"
description: "Declare one flag, scalar option, or scalar positional."
layout: split
---

`__addarg DEST` registers an argument in the current context. Inside a function, finish the declaration block with guarded `__parseargs`; at script scope, root declarations belong to `__koirun`.

```bash
__addarg DEST (-f|-o|-p) -d DESCRIPTION [OPTIONS]
```

## Declaration options

| Parameter | Contract |
| --- | --- |
| `DEST` | Ordinary Bash variable identifier; shell and koi reserved destinations are rejected |
| `-f`, `--flag` | Boolean flag; no value; assigns `0` or `1` |
| `-o`, `--option` | Consume one value |
| `-p`, `--positional` | Consume one positional value |
| `-s`, `--short SHORT` | One-letter spelling without a dash; `h` is reserved |
| `-l`, `--long LONG` | Long spelling without dashes; `help` and koi settings are reserved |
| `-d`, `--description DESCRIPTION` | Required nonempty help text |
| `-r`, `--required` | Require explicit presence |
| `-D`, `--default DEFAULT` | Default for an optional option or positional; empty text is valid |
| `-n`, `--display-name NAME` | Nonempty value label for help |

Choose exactly one kind. Flags and options need at least one spelling; positionals reject spelling parameters. Flags reject defaults and display names. Required arguments reject defaults. Repeated or conflicting declaration parameters fail.

## Returns and assignments

Returns `0` for a valid declaration or `2` for an invalid one. A declaration failure invalidates the block even if its individual status is ignored. Destinations are assigned during successful parsing, not registration.

## Build a declaration

Change the controls to update the full Bash script. This builds code without executing it. The output panel remains the captured output for the default configuration.

<!-- koi:example -->

## Generated script

<!-- koi:include greet.sh -->

## Fixed default help

<!-- koi:include greet-help.txt -->
