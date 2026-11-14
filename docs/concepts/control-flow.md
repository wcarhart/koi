---
title: "Parsing and control flow"
description: "How koi handles parsing with Bash control flow nuances."
layout: article
---

Koi uses guarded parsing to decide whether a function should continue into its business logic. Successful parsing can continue locally, while help, errors, and child dispatch return from the function. This applies to both direct function calls and registered command handlers.

## The parsing boundary and required guard

Always close a function's [registration block](/docs/concepts/lifecycle) with this exact form:

```bash
__parseargs "$@" || return "$koi_status"
```

The `|| return "$koi_status"` portion is the _guard_. It returns from your function when the parser says to stop. For example:

```bash
#!/usr/bin/env bash
source koi

# Greet someone by name
# Usage: greet "$@"
#   $@  arguments to parse, including optional --name NAME
greet() {
    local name
    __addarg name --option --long name --default world --description 'Who to greet'
    __parseargs "$@" || return "$koi_status"

    printf 'Hello, %s!\n' "$name"
}

greet "$@"
```

Running `./greet.sh --name Will` prints `Hello, Will!`. Running `./greet.sh --help` shows help and returns successfully without printing a greeting. An unknown option reports an error and returns status `2`, also without printing a greeting.

The guarded parse is the **parsing boundary**. Declare locals and do any necessary preparation before registration, then place business logic after the guard, where parsed [destinations](/docs/reference/glossary#destination) are available. Keep the registration block uninterrupted until parsing. See [registration contexts and blocks](/docs/concepts/lifecycle) for the full lifecycle.

An ordinary Bash function can only return from itself. [__parseargs](/docs/reference/parseargs) cannot return from `greet`, so a bare `__parseargs "$@"` leaves `greet` free to continue after help or an error. Moving the guard into a helper function has the same problem. The `return` must be inside the function that owns the registration block, even when that function has no custom arguments.

> [!WARNING] There are unintended consequences when you skip the guard
>
> When you use the bare `__parseargs "$@"` without the associated `|| return "$koi_status"`, your function's business logic can execute even when rendering help. This means if your function looks like this:
> ```bash
> rmdir() {
>     __adddescription 'Remove a directory on the host'
>     __addarg dir --positional --required --description 'The directory to remove'
>     __parseargs "$@" # <-- note the dangerous bare __parseargs without the guard
>
>     rm -rf "$dir"
> }
>
> rmdir "$@"
> ```
>
> Without applicable `set -e` or the parse guard, using `./rmdir.sh --help` as written above would run `rm -rf "$dir"` even though `DIR` is a required positional. Help skips destination assignments, so imagine the despair if `$dir` was previously set to `/`!

## Parser result and caller result

The parser's return code controls whether the guard runs. `$koi_status` supplies the status your function should return:

| Outcome | Parser return | `koi_status` | What your function does |
| --- | --- | --- | --- |
| Successful local parsing | `0` | `0` | Continues after the guard |
| Help | `1` | `0` | Returns successfully |
| Child dispatch | `1` | Child's exit status | Returns with the child's result |
| Registration or parsing error | `2` | `2` | Returns an error |

After dispatch, the parent returns even if the child succeeded. A [branch](/docs/concepts/routing#branches-and-leaves) always dispatches or shows help, so its own business logic after the guard never runs.

The guard only returns from the current function. A caller can still continue after `greet --help` because help returns success, and callers must handle failures explicitly when they need to stop their own work.

At script scope, [__koirun](/docs/reference/koirun) returns the child's status after dispatch, `2` on a parsing error, or `0` for help or successful terminal parsing. Code after it cannot distinguish help from success by status alone. For scripts with local business logic, use a guarded function entrypoint such as `greet "$@"` above.

> [!NOTE] What about `$?`?
>
> What if the guard uses `|| return $?` instead of `|| return "$koi_status"`? Using `|| return $?` would return the parser's control signal `1` after successful help and after any child dispatch, losing the child's actual result. Use `"$koi_status"` in the immediate guard. Koi sets it for you automatically, and a later parse can overwrite it.

## Presence, values, and defaults

Koi tracks whether an argument was explicitly supplied separately from its value. For example, `--name ''` supplies an empty string, so the example above prints `Hello, !` instead of using the default. An empty string also satisfies a [required](/docs/reference/glossary#requiredness) option or positional. If your application needs a nonempty value, check it manually after parsing.

All arguments are optional unless declared with `--required`. Required arguments need explicit input on each parse, regardless of any value already in their [destination](/docs/reference/glossary#destination). Required options and positionals cannot have defaults.

After successful parsing, omitted flags receive `0`, and omitted optional options and positionals receive their declared default or an empty string. Every destination in the context gets a fresh value, so initializing a variable before parsing doesn't provide a default. See [destination variables and scope](/docs/concepts/destinations).

Positionals fill in registration order, with required slots before optional ones. You cannot skip an optional slot to fill a later one. Repeated scalar options keep their last value by default. In the example `--name Will --name Ada`, koi would assign `Ada`. To reject repeated arguments, use `__parseargs --koi-error-on-duplicates "$@" || return "$koi_status"` (see [__parseargs](/docs/reference/parseargs)).

## Help executes application code

Koi builds a function's interface by running its declarations, so requesting its help executes everything before the parsing boundary too. Keep file writes, deployments, and other operations with side effects after the guard. Root help lists immediate commands without invoking their handlers, while detailed command help enters the selected handler to build its spec. See [customizing help](/docs/guides/help) for configuration.

Help bypasses required-input checks and destination assignments in its own context, but invalid declarations, invalid positional layouts, and missing handlers still prevent help from being shown. Ancestors must also parse successfully before dispatching, so a child's `--help` doesn't bypass a parent's required arguments. See [argument ownership along a route](/docs/concepts/routing#argument-ownership-along-a-route).

## Errexit and application failures

You may ask, _What if I just use `set -e` in my script, do I still need the guard?_ It's a good question. Unfortunately, `set -e` alone cannot replace the guard. Bash suppresses `errexit` inside functions called conditionally, such as the parser on the left side of `||`. This also affects child handlers dispatched by `__parseargs`, so handle failures in business logic explicitly:

```bash
# Copy a file and report success
# Usage: copy_file "$@"
#   $@  arguments to parse, including required SOURCE and TARGET positionals
copy_file() {
    local source target
    __addarg source --positional --required --description 'File to copy'
    __addarg target --positional --required --description 'Where to copy it'
    __parseargs "$@" || return "$koi_status"

    cp -- "$source" "$target" || return "$?"
    printf 'Copied to %s\n' "$target"
}
```

If `cp` fails, this returns its exit status without printing the success message, including when `errexit` is suppressed. Using `"$?"` here preserves `cp`'s failure status. The parser guard needs `"$koi_status"` because of its separate control signals.

Root dispatch through an unconditional `__koirun "$@"` preserves normal `errexit` behavior in the selected handler. Calling the runner conditionally can suppress it too. Declaration errors can stop execution where `errexit` applies, otherwise they mark the [registration block](/docs/concepts/lifecycle) invalid for the parser to reject.

Koi uses returns for routine help and errors, so it can be used in sourced scripts without exiting the caller's shell. Your own `exit` calls and applicable shell options still affect that shell.

> [!NOTE] What changes if I run koi with `set -e`?
>
> Koi works with both `set -e` and `set +e`. When `errexit` applies, an invalid argument declaration can stop execution mid-registration rather than waiting for parsing to reject the block. Failures in business logic can also stop execution immediately. Conditional calls and children dispatched by `__parseargs` suppress `errexit`, so explicit failure handling is still needed.
> 
> With a bare, unguarded parse, `set -e` can exit on the parser's `1` for successful help. That turns a successful help request into a failed script, and conditional calls can let business logic run anyway. Always use the guard regardless of shell options.
