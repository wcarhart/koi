---
title: "Parsing and control flow"
description: "How koi handles parsing with Bash control flow nuances."
layout: article
---

Koi uses guarded parsing to decide whether a function should continue into its business logic. Successful parsing can continue locally, while help, errors, and child dispatch return from the function. This applies to both direct function calls and registered command handlers.

## The parsing boundary and required guard

Always close a function's [registration block](/docs/concepts/lifecycle) with this exact form:

```bash
koi::parse "$@" || return "$koi_status"
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
    koi::add_arg name --option --long name --default world --description 'Who to greet'
    koi::parse "$@" || return "$koi_status"

    printf 'Hello, %s!\n' "$name"
}

greet "$@"
```

Running `./greet.sh --name Will` prints `Hello, Will!`. Running `./greet.sh --help` shows help and returns successfully without printing a greeting. An unknown option reports an error and returns status `2`, also without printing a greeting.

The guarded parse is the **parsing boundary**. Declare locals and do any necessary preparation before registration, then place business logic after the guard, where parsed [destinations](/docs/reference/glossary#destination) are available. Keep the registration block uninterrupted until parsing. See [registration contexts and blocks](/docs/concepts/lifecycle) for the full lifecycle.

An ordinary Bash function can only return from itself. [koi::parse](/docs/reference/parse) cannot return from `greet`, so a bare `koi::parse "$@"` leaves `greet` free to continue after help or an error. Moving the guard into a helper function has the same problem. The `return` must be inside the function that owns the registration block, even when that function has no custom arguments.

> [!WARNING] There are unintended consequences when you skip the guard
>
> When you use the bare `koi::parse "$@"` without the associated `|| return "$koi_status"`, your function's business logic can execute even when rendering help. This means if your function looks like this:
> ```bash
> rmdir() {
>     koi::config description 'Remove a directory on the host'
>     koi::add_arg dir --positional --required --description 'The directory to remove'
>     koi::parse "$@" # <-- note the dangerous bare koi::parse without the guard
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

After dispatch, the parent returns even if the child succeeded. When no child is selected, a [branch](/docs/concepts/routing#branches-and-leaves) continues into its own business logic after successful parsing by default. Set `koi::config missing-command help` or `error` to stop instead (see [koi::config](/docs/reference/config)).

The guard only returns from the current function. A caller can still continue after `greet --help` because help returns success, and callers must handle failures explicitly when they need to stop their own work.

At script scope, [koi::run](/docs/reference/run) returns the child's status after dispatch, `2` on a parsing error, or `0` for help or successful terminal parsing. Code after it cannot distinguish help from success by status alone. For scripts with local business logic, use a guarded function entrypoint such as `greet "$@"` above.

> [!NOTE] What about `$?`?
>
> What if the guard uses `|| return $?` instead of `|| return "$koi_status"`? Using `|| return $?` would return the parser's control signal `1` after successful help and after any child dispatch, losing the child's actual result. Use `"$koi_status"` in the immediate guard. Koi sets it for you automatically, and a later parse can overwrite it.

## Parsing steps

After declaration checks pass, a successful parsing invocation follows these steps. Help is the exception, which exits this flow early.

<div class="parsing-lifecycle-scroll" role="region" aria-label="Parsing pipeline" tabindex="0">
<ol class="validation-lifecycle parsing-lifecycle" aria-label="Parsing steps">
  <li class="validation-lifecycle-stage">Token parsing</li>
  <li class="validation-lifecycle-stage">Requiredness checks</li>
  <li class="validation-lifecycle-stage">Check groups</li>
  <li class="validation-lifecycle-stage">Check dependencies</li>
  <li class="validation-lifecycle-stage">Default resolution</li>
  <li class="validation-lifecycle-stage">Destination-type checks</li>
  <li class="validation-lifecycle-stage">Validation</li>
  <li class="validation-lifecycle-stage">Destination assignment</li>
  <li class="validation-lifecycle-stage">Dispatch<br>(if selected)</li>
</ol>
</div>

## Presence, values, and defaults

Koi tracks whether an argument was explicitly supplied separately from its value. For example, `--name ''` supplies an empty string, so the example above prints `Hello, !` instead of using the default. An empty string also satisfies a [required](/docs/reference/glossary#requiredness) option or positional. Use a [nonempty validator](/docs/reference/add_validator) when an explicit value must not be empty.

Arguments are individually optional unless declared with `--required`. Groups and dependencies can impose additional presence requirements. Required arguments need explicit input on each parse, regardless of any value already in their [destination](/docs/reference/glossary#destination). Required options and positionals cannot have defaults.

After successful parsing, omitted flags receive `0`, and omitted optional scalar options and positionals receive their declared default or an empty string. Every destination in the context gets a fresh value, so initializing a variable before parsing doesn't provide a default. See [destination variables and scope](/docs/concepts/destinations).

Positionals fill in registration order, with required slots before optional ones. You cannot skip an optional slot to fill a later one. Repeated scalar options keep their last value by default. In the example `--name Will --name Ada`, koi would assign `Ada`. To reject repeated scalar options and flags, use `koi::config error-on-scalar-duplicates true` (see [koi::config](/docs/reference/config)).

Optional arrays become empty [indexed arrays](https://www.gnu.org/software/bash/manual/html_node/Arrays.html) when omitted. Required arrays need at least one explicit element, including an empty string. See [scalars and arrays](/docs/concepts/cardinality).

## Help executes application code

Koi builds a function's interface by running its declarations, so requesting its help executes everything before the parsing boundary too. Keep file writes, deployments, and other operations with side effects after the guard. Root help lists immediate commands without invoking their handlers, while detailed command help enters the selected handler to build its spec. See [customizing help](/docs/guides/help) for configuration.

Help bypasses required-input checks and destination assignments in its own context, but invalid declarations, invalid positional layouts, and missing handlers still prevent help from being shown. Ancestors must also parse successfully before dispatching, so a child's `--help` doesn't bypass a parent's required arguments. See [argument ownership along a route](/docs/concepts/routing#argument-ownership-along-a-route).

## Errexit and application failures

You may ask, _What if I just use `set -e` in my script, do I still need the guard?_ It's a good question. Unfortunately, `set -e` alone cannot replace the guard. Bash suppresses `errexit` inside functions called conditionally, such as the parser on the left side of `||`. This also affects child handlers dispatched by `koi::parse`, so handle failures in business logic explicitly:

```bash
# Copy a file and report success
# Usage: copy_file "$@"
#   $@  arguments to parse, including required SOURCE and TARGET positionals
copy_file() {
    local source target
    koi::add_arg source --positional --required --description 'File to copy'
    koi::add_arg target --positional --required --description 'Where to copy it'
    koi::parse "$@" || return "$koi_status"

    cp -- "$source" "$target" || return "$?"
    printf 'Copied to %s\n' "$target"
}
```

If `cp` fails, this returns its exit status without printing the success message, including when `errexit` is suppressed. Using `"$?"` here preserves `cp`'s failure status. The parser guard needs `"$koi_status"` because of its separate control signals.

Root dispatch through an unconditional `koi::run "$@"` preserves normal `errexit` behavior in the selected handler. Calling the runner conditionally can suppress it too. Declaration errors can stop execution where `errexit` applies, otherwise they mark the [registration block](/docs/concepts/lifecycle) invalid for the parser to reject.

Koi uses returns for routine help and errors, so it can be used in sourced scripts without exiting the caller's shell. Your own `exit` calls and applicable shell options still affect that shell.

### What changes if I run koi with `set -e`?

Koi works with both `set -e` and `set +e`. When `errexit` applies, an invalid argument declaration can stop execution mid-registration rather than waiting for parsing to reject the block. Failures in business logic can also stop execution immediately. Conditional calls and children dispatched by `koi::parse` suppress `errexit`, so explicit failure handling is still needed.

With a bare, unguarded parse, `set -e` can exit on the parser's `1` for successful help. That turns a successful help request into a failed script, and conditional calls can let business logic run anyway. Always use the guard regardless of shell options.

> [!NOTE] Did you know?
>
> Koi v1 actually [enabled `set -e` itself](https://github.com/wcarhart/koi/blob/8d030a8a43b71072c7ff3e932cf260aa7b7e00da/koi#L2), and required `errexit` to be set in order for control flow to function properly. This made it much simpler for invalid argument registration, parsing errors, and help rendering to stop execution. However, it imposed `set -e` on every script using koi, and conditional calling contexts could still suppress it and cause issues.
>
> In Koi v2, the choice of using `errexit` is up to you. Modern Koi works both with and without it set.

## Validation

[Validators](/docs/reference/glossary#validator) are functions that validate argument values at parse time. They run as an intermediate step in [koi::parse](/docs/reference/parse) or [koi::run](/docs/reference/run) and finish before assignment or child dispatch. Rejections return through the existing parser guard with status `2`. The validator functions receive one literal value and return `0` to accept, `1` to reject, or at least `2` for operational failure. Koi ships with a few builtin validators, but you can use [koi::add_validator](/docs/reference/add_validator) to use a custom function. Since validators run conditionally, they must handle failures explicitly instead of relying on `set -e`.
