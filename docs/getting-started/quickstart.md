---
title: "Quickstart"
description: "Write your first koi-powered script"
layout: split
---

Once you've [installed](/docs/install) koi, you're ready to write your first script. Within a Bash function, register parsable arguments with [__addarg](/docs/reference/addarg) and then call [__parseargs](/docs/reference/parseargs) to parse them. `__addarg` lines followed by a `__parseargs` line is called the [registration block](/docs/concepts/lifecycle).

In this simple example, we're using koi with direct function calls. This means we pass the command line arguments (`"$@"`) from the command line directly to our function. Koi can also treat individual functions as CLI subcommands. To learn more, see [registration & control flow](/docs/concepts/lifecycle) and [direct calls](/docs/concepts/routing).

> [!WARNING] Always use a guard
>
> **Always** close a `__parseargs` call with the `koi_status` guard in functions, like this:
>
> ```bash
> __parseargs "$@" || return "$koi_status"
> ```
>
> **Never** use the bare `__parseargs "$@"`. Doing so will cause koi to malfunction and potentially execute dangerous or unexpected logic. Due to Bash control flow, `__parseargs` can't exit or return on its own, so if there's a parsing error or we display the help menu and you don't include `|| return "$koi_status"`, your function will continue executing. Learn more in [registration & control flow](/docs/concepts/lifecycle).

## Example

```bash
chmod +x greet.sh
./greet.sh
./greet.sh --name Will
./greet.sh --help
```

The first script execution prints `Hello, world!` because there are no arguments provided. The second execution prints `Hello, Will!` because we provided the option `--name`, which we registered in the `main` function via `__addarg`. The third execution prints the generated help menu based on the specification of registered arguments without executing the function's business logic. See the full reference for [__addarg](/docs/reference/addarg).

<!-- koi:example -->

## greet.sh

<!-- koi:include quickstart-greet.sh -->

## Default output

<!-- koi:include quickstart-greet.txt -->

## Generated help

<!-- koi:include greet-help.txt -->
