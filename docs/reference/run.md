---
title: "koi::run"
description: "Consume root registration and route via the command tree."
layout: article
---

`koi::run` parses the root arguments and dispatches the selected command to its handler. Call it at the end of your script, after root declarations and handler definitions. It closes the root [registration block](/docs/concepts/lifecycle).

Scripts that call a parsing function directly can use that function as their entrypoint without `koi::run`. See [calls and command routing](/docs/concepts/routing). Within a function, use [koi::parse](/docs/reference/parse) instead to parse arguments.

## Usage

```text usage
koi::run [SETTINGS] "$@"
```

## Arguments

| Parameter | Description |
| --- | --- |
| `--koi-zero-argument-message MESSAGE` | Show a custom (nonempty) error message when no root command is selected, instead of showing help. |
| `--koi-enable-help-on-unknown-commands` | Show root help when an unknown root command is followed by a standalone `-h`/`--help`. Off by default, default behavior indicates unknown command, even when `-h`/`--help` is present. |
| `--koi-disable-help-subcommand` | Disable the built-in `help` command throughout the routed command tree, allowing you to register your own. |
| `--koi-enable-verbose-help` | Enable `help --verbose` at the root to show help for the whole command tree. Off by default. |
| `--koi-enable-help-hints` | Append hints for command help and verbose help to ordinary root help when those features are available. Off by default. |
| `--koi-ignore-unknown-positionals` | Ignore and discard remaining unknown positional values instead of returning an error. Unknown positionals will cause an error by default. |
| `--koi-use-single-pipe-for-or-groups` | Display inclusive OR groups with `\|` instead of `\|\|`. |
| `"$@"` | The application arguments, including root flags and options, the selected command, and its arguments. Roots without child commands can also accept positionals. |

Supply settings before `"$@"`, in any order. Each setting can appear only once, and `--koi-enable-verbose-help` cannot be combined with `--koi-disable-help-subcommand`. These settings don't need declarations via `koi::add_arg`. Configure the script's name, description, and help width with [koi::config](/docs/reference/config).

## Return

| Status | Description |
| --- | --- |
| `0` | Help was displayed, root arguments were parsed successfully without dispatch, or the selected handler returned `0`. |
| `2` | Invalid settings, registration, or input. |
| Handler's status | After dispatch, the runner returns the selected handler's status, including nonzero statuses. |

The runner returns to its caller without exiting the shell. Usually, `koi::run` should be the last statement in the script so its status becomes the script's exit status.

## Example

```bash
#!/usr/bin/env bash
source koi

deploy() {
    local environment
    koi::add_arg environment --option --short e --long environment --default production --description 'Where to deploy'
    koi::parse "$@" || return "$koi_status"

    printf 'Deploying to %s (verbose=%s)\n' "$environment" "$verbose"
}

koi::add_arg verbose --flag --short v --long verbose --description 'Print progress'
koi::add_command deploy --function deploy --description 'Deploy the application'
koi::run --koi-enable-verbose-help --koi-enable-help-hints "$@"
```

Running `./app.sh -v deploy -e staging` assigns `1` to the root's `verbose` destination and forwards `-e staging` to `deploy`. The handler then parses its own arguments and prints `Deploying to staging (verbose=1)`.

Root argument labels must come before the command name. Moving `-v` after `deploy` would fail because the `deploy` handler hasn't declared a `-v` flag. Root destination values remain visible through ordinary [Bash scope](/docs/concepts/destinations).

Every handler must close its own registration block with `koi::parse "$@" || return "$koi_status"`, even if it declares no custom arguments. See [parsing and control flow](/docs/concepts/control-flow).

## Help and missing commands

With the example above, `./app.sh`, `./app.sh --help`, and `./app.sh help` all show root help. `./app.sh deploy --help` enters the handler and shows its help without printing the deployment message.

A child's help request still requires its ancestors to parse successfully. For example, if the root declares a required `--account` option, `./app.sh deploy --help` fails without it, while `./app.sh --help` still shows root help. See [argument ownership along a route](/docs/concepts/routing#argument-ownership-along-a-route).


The built-in `help` command is available in each routed [branch](/docs/reference/glossary#branch). [Leaves](/docs/reference/glossary#leaf) and [directly](/docs/reference/glossary#direct-call) called parsing functions support `-h`/`--help` without receiving a `help` command. Disabling the built-in command leaves automatic `-h`/`--help` available.

Use `--koi-zero-argument-message 'Choose a command'` to return `2` with that error message when no root command is selected. This also applies when root flags or options are supplied without a command. Explicit help still succeeds, and nested branches still show help when no child is selected.

Unknown commands return `2` by default, including `./app.sh typo --help`. With `--koi-enable-help-on-unknown-commands`, that invocation shows root help and returns `0`. This setting applies only at the root and recognizes standalone `-h`/`--help` before a `--` separator, so `typo -- --help` still fails.

### Verbose help

With `--koi-enable-verbose-help`, `./app.sh help --verbose` prints root help followed by each command's help in registration order, visiting descendants before the next sibling via depth-first-search. Verbose help is available only through the root's built-in `help` command.

Koi invokes handlers to collect their declarations, then stops at [guarded parsing](/docs/concepts/control-flow). Code before the guard still runs during help, including verbose help, so keep operations with side effects after it. See [customizing the generated help](/docs/guides/help).

## Root lifecycle

Call `koi::run` once per library initialization. The first attempt consumes root registration even if it displays help or fails. A second call or a later root declaration returns `2`, and sourcing `koi` again does not reset this state. Direct function parsing remains available afterward.

Roots without child commands can declare positionals, but positionals and child commands cannot share a [context](/docs/concepts/lifecycle). For a root with positionals, the missing-command and unknown-command settings have no effect.

The runner returns `0` after both help and successful parsing, so business logic placed after it would run in either case. If your script needs to parse arguments and then perform an operation without subcommands, use a [guarded function entrypoint](/docs/concepts/routing#direct-calls-and-entrypoints).

## Validation

When [koi::add_validator](/docs/reference/add_validator) is used to register [validators](/docs/reference/glossary#validator) for options or positionals (flags cannot be validated), the associated validator(s) will run for each argument after parsing and all destination-type checks but before any destination assignment or child dispatch. Koi ships with a few builtin validators but you can register your own custom function as a validator using [koi::add_validator --function](/docs/reference/add_validator). Validation rejections at parse are [user errors](/docs/reference/glossary#user-error). Validators do not run when help is requested.
