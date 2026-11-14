---
title: "Quickstart"
description: "Write your first koi-powered script"
layout: split
---

Once you've [installed](/docs/install) koi, you're ready to write your first script. Start by sourcing the koi library. If you manually installed koi, use `./koi` instead of `koi` in following examples.

```bash
source koi
```

Within a Bash function, register parsable arguments with [koi::add_arg](/docs/reference/add_arg) and then call [koi::parse](/docs/reference/parse) to parse them. `koi::add_arg` lines followed by a `koi::parse` line is called the [registration block](/docs/concepts/lifecycle).

In this simple example, we're using koi with direct function calls. This means we pass the command line arguments (`"$@"`) from the command line directly to our function. Koi can also treat individual functions as CLI subcommands. To learn more, see [registration & control flow](/docs/concepts/lifecycle) and [direct calls](/docs/concepts/routing).

> [!WARNING] Always use a guard
>
> **Always** pair a `koi::parse` call with the `$koi_status` guard in functions, like this:
>
> ```bash
> koi::parse "$@" || return "$koi_status"
> ```
>
> **Never** use the bare `koi::parse "$@"`. Doing so will cause koi to malfunction and potentially execute dangerous or unexpected logic. Due to Bash control flow, `koi::parse` can't exit or return on its own, so if there's a parsing error or we display the help menu and you don't include `|| return "$koi_status"`, your function will continue executing. Learn more in [registration & control flow](/docs/concepts/lifecycle).

## Example

```bash
chmod +x greet.sh
./greet.sh
./greet.sh --name Will
./greet.sh --help
```

The first script execution prints `Hello, world!` because there are no arguments provided. The second execution prints `Hello, Will!` because we provided the option `--name`, which we registered in the `main` function via `koi::add_arg`. The third execution prints the generated help menu based on the specification of registered arguments without executing the function's business logic. See the full reference for [koi::add_arg](/docs/reference/add_arg).

<!-- koi:example -->

## greet.sh

<!-- koi:include quickstart-greet.sh -->

## Default output

<!-- koi:include quickstart-greet.txt -->

## Generated help

<!-- koi:include greet-help.txt -->
