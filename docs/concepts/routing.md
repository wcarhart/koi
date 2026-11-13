---
title: "Calls and command routing"
description: "How koi routes direct function calls and registered commands."
layout: article
---

Koi supports both direct function calls and CLI commands. You can call a parsing function from your script or another function, or register it as a command that callers select by name. The function declares and parses its own arguments in either case.

## Direct calls and entrypoints

A parsing function is an ordinary Bash function, so you can call it directly without registering it with [__addcommand](/docs/reference/addcommand):

```bash
#!/usr/bin/env bash
source koi

deploy() {
    local environment
    __adddescription 'Choose a deployment environment'
    __addarg environment --option --short e --long environment --default production --description 'Where to deploy'
    __parseargs "$@" || return "$koi_status"

    printf 'Deploying to %s\n' "$environment"
}

deploy "$@"
```

Running `./app.sh -e staging` calls `deploy` with `-e staging`, while `./app.sh --help` shows its help without printing the deployment message. Another function could call `deploy -e staging` in the same way.

A script can use `main "$@"` as its entrypoint, call a parsing function directly as above, or do some preparation before calling it. Always forward arguments with `"$@"` to preserve their boundaries, and finish each function's [registration block](/docs/concepts/lifecycle) before calling another parsing function.

## Registering commands

To expose `deploy` as a CLI command, replace the final `deploy "$@"` line with root registration and [__koirun](/docs/reference/koirun):

```bash
__addarg verbose --flag --short v --long verbose --description 'Print progress'
__addcommand deploy --function deploy --description 'Deploy the application'
__addcommand release --function deploy --description 'Release the application'
__koirun "$@"
```

Now `./app.sh deploy -e staging` selects the `deploy` command and passes `-e staging` to its handler. `release` is an alias using the same handler. Command names and function names are independent, and koi only routes to explicitly registered commands. Every handler must use `__parseargs "$@" || return "$koi_status"`, even if it declares no custom arguments. Other functions in your shell remain unavailable through the CLI. See [registration contexts and blocks](/docs/concepts/lifecycle) for the full lifecycle.

### Help follows the call

With the example above, by default `./app.sh --help` would show:
```text
Usage: app.sh [-h] [-v] COMMAND

Commands:
  deploy   Deploy the application
  release  Release the application
  help     Show this help

Options:
  -h, --help     Show this help
  -v, --verbose  Print progress
```

For a routed call, help uses the selected command path and its registered description. For example, `./app.sh release --help` uses `app.sh release` in its usage line and describes it as “Release the application”, even though the handler is named `deploy`:

```text
Release the application

Usage: app.sh release [-h] [-e ENVIRONMENT]

Options:
  -h, --help                     Show this help
  -e, --environment ENVIRONMENT  Where to deploy (default: production)
```

A direct call uses only the script name in its usage line and the function's [__adddescription](/docs/reference/adddescription) text, if provided. Registering a function as a command doesn't change the help for direct calls to that function, including calls made from another handler.

## Branches and leaves

A context with registered child commands is a **branch**. To nest commands, register children inside the owning handler before its guarded parse (see [registration blocks](/docs/concepts/lifecycle)). For example, if an `infra` handler registers `deploy`, callers can use `./app.sh infra deploy -e staging`. You can keep nesting commands as far as Bash's `FUNCNEST` setting and available memory allow.

A branch dispatches the selected child or shows help when no child is given. Its parsing guard returns with the child's exit status after dispatch, so code after the guard never runs for a branch. At the root, you can configure [__koirun](/docs/reference/koirun) to report an error instead of showing help when no command is given.

A context without children is a **leaf**, like `deploy` in the example `./app.sh infra deploy -e staging`. After successful parsing, a leaf continues into its business logic. Both branches and leaves can declare flags and options, but positionals cannot share a context with child commands because bare tokens select commands there.

By default, the runner adds a `help` command to each branch, so `./app.sh help` shows root help and `./app.sh infra help` shows the `infra` help menu. Leaves and directly called parsing functions support automatic `-h`/`--help` without receiving a built-in `help` command. See [__koirun](/docs/reference/koirun) to configure this behavior.

Koi learns about children as their handlers run. Root help lists the root's immediate commands without invoking them, while `./app.sh infra --help` enters `infra` to build its spec. Code before guarded parsing runs during these help requests too, so keep operations with side effects after the guard. Koi can also be configured to support _verbose help_, which iteratively prints all help menus in the command tree via depth-first-search. See [__koirun](/docs/reference/koirun) to configure this behavior.

## Argument ownership along a route

Each context parses its own arguments before selecting a child. With the root registration above:

```bash
./app.sh -v deploy -e staging
```

The root parses `-v`, selects `deploy`, and forwards everything after the command name to its handler. The handler then parses `-e staging`. Tokens keep their original boundaries during dispatch, including empty strings and values containing whitespace.

Parent argument labels are not inherited. Moving `-v` after `deploy` would cause an error because this handler has no `-v` flag registered. A child can also declare its own `-v` with a different meaning. Destination variables follow ordinary [Bash scope](/docs/concepts/destinations), so a handler can still read the root's `verbose` value unless it declares its own local variable with that name.

A standalone `--` ends option and flag recognition in the current context. For example, `./app.sh -- deploy -e staging` still selects `deploy`, whose parser recognizes `-e` independently. To end option recognition in the child, place `--` after its command name.

Parents must parse successfully before dispatching, even when the child requests help. If the root had a required `--account` option, `./app.sh deploy --help` would fail without it. Root help via `./app.sh --help` would still work because help bypasses required-value checks in its own context.

For complete walkthroughs, see [building an application](/docs/guides/commands) and [reusing parsing functions](/docs/guides/functions).
