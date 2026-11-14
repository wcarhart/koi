---
title: "__addcommand"
description: "Register one child command in the immediate registration context."
layout: split
---

`__addcommand NAME -f HANDLER -d DESCRIPTION` registers a subcommand in the current registration context (see [registration contexts](/docs/concepts/lifecycle)). Use `__addcommand` to define subcommands that will be accessible from your CLI or child-parsed functions. `__addcommand` statements must be used inside [registration blocks](/docs/concepts/lifecycle) and must be followed by a guarded [__parseargs](/docs/reference/parseargs) statement at the function level or a [__koirun](/docs/reference/koirun) statement at the root level.

## Usage

```bash
__addcommand NAME -f HANDLER -d DESCRIPTION
```

## Arguments

| Parameter | Description |
| --- | --- |
| `NAME` | The CLI command name, unique within the registration context. |
| `-f`, `--function HANDLER` | The Bash function to invoke. |
| `-d`, `--description DESCRIPTION` | The nonempty help text for this command. |

`NAME`, `-f HANDLER`, and `-d DESCRIPTION` are all required. `NAME` must be supplied first but `-f` and `-d` can be applied in any order.

Command names must start with an ASCII letter or digit and contain only ASCII letters, digits, hyphens, or underscores. Handler names must start with an ASCII letter or underscore and contain only ASCII letters, digits, or underscores. For example, `deploy-service` is a valid command name, while its handler could be named `deploy_service`.

## Return

| Status | Description |
| --- | --- |
| `0` | Valid command declaration and registration success. |
| `2` | Invalid command declaration, command validation error, or registration failure. |

A single invalid command declaration invalidates the entire [registration block](/docs/concepts/lifecycle), even if its individual status is ignored by Bash control flow. Later valid declarations do not repair the block. As with [__addarg](/docs/reference/addarg#returns-and-assignment), whether execution stops at the invalid declaration depends on explicit error handling and whether `set -e` applies.

## Scope

At the root-level (e.g. using `__addcommand` at the top-level of your script), `__addcommand` defines commands directly on your CLI. For example, in `./cli.sh deploy -f`, `deploy` is the root-level command. The [registration block](/docs/concepts/lifecycle) must be closed by [__koirun](/docs/reference/koirun) at the root-level.

From within a function, `__addcommand` registers immediate child commands for that function's context. For example, in `./cli.sh infra deploy -f`, `infra` is registered at the root-level with a handler, perhaps also named `infra`. That handler registers `deploy` within its own registration block. Subcommands can be nested as far as `FUNCNEST` and system memory allow.

A context with child commands is a [branch](/docs/reference/glossary#branch). It dispatches the selected child or shows help when no child is selected, so its guarded parse never continues into its own business logic. At the root-level, [__koirun](/docs/reference/koirun) can instead be configured to report an error when no command is given.

Flags and options can be registered alongside child commands, but positionals cannot. Declaring both positionals and child commands in the same context causes parsing to fail, including when help is requested. This is because koi cannot differentiate which parsed token is a subcommand vs. a positional value.

## Handlers

The handler function registered via `-f HANDLER` _must_ use `__parseargs "$@" || return "$koi_status"`, even if it has no custom arguments (see [parsing and control flow](/docs/concepts/control-flow)). Without the guard, execution can continue into the handler's business logic after help, errors, or child dispatch. Two or more registered commands or subcommands can share handler functions.

Registration stores the command's metadata without invoking its handler, so you can define the function later in your script. The function must exist by the time the owning context parses. Koi checks every immediate child's handler before showing help or selecting a command, so a missing handler also blocks help and unrelated commands in that context.

See [commands and nesting](/docs/guides/commands).

## Help

By default, [__koirun](/docs/reference/koirun) adds the subcommand `help` to each [branch](/docs/reference/glossary#branch) in the dispatch tree. For example, if you wrote a command structure like `./cli.sh infra deploy app`, then `./cli.sh help`, `./cli.sh infra help`, and `./cli.sh infra deploy help` would each show the current context's help menu, just like `-h`/`--help`.

The leaf command `app` would still support `-h`/`--help`, but `./cli.sh infra deploy app help` would treat `help` as positional input and either accept or reject it according to its argument declarations. Directly called parsing functions (see [calls and routing](/docs/concepts/routing)) also support `-h`/`--help`, but do not receive the built-in `help` subcommand.

To register your own command named `help`, use `__koirun --koi-disable-help-subcommand "$@"` (see [__koirun](/docs/reference/koirun)). Otherwise, the declaration conflicts with built-in help and fails when its context parses. Automatic `-h`/`--help` remains available with this setting. See [customizing the generated help](/docs/guides/help) for more help configuration.

<!-- koi:example -->

## Sample CLI script

<!-- koi:include commands.sh -->

## Generated help via -h/--help

<!-- koi:include commands-help.txt -->

<!-- koi:include commands-deploy-service-help.txt -->
