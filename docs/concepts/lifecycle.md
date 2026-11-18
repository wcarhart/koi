---
title: "Registration contexts and blocks"
description: "How koi builds a spec based on registered arguments and commands."
layout: article
---

Koi builds a function's argument interface at function _runtime_, meaning there's no separate, static type or argument spec to maintain, and koi is unaware of the interface of a function until it is invoked. This keeps the definition of arguments directly alongside the code that uses them and in sync with your code's business logic, even when you call the function directly or reuse it in another script. However, it creates a few nuances that are important to understand.

## Contexts, blocks, and specs

A **registration context** is the script root or function invocation that owns an interface. For example, a `deploy` function can own an `--environment` option and a `service` child command. Each context recognizes its own argument labels, while the _destination_ variables holding their values follow ordinary [Bash scope](/docs/concepts/destinations).

A **registration block** is the code that declares this interface and closes it with parsing. The declarations accumulate into a **registration spec**, which describes the context's arguments, immediate child commands, and help metadata.

Inside functions, use [koi::add_arg](/docs/reference/add_arg) for arguments, [koi::add_command](/docs/reference/add_command) for child commands, and [koi::add_description](/docs/reference/add_description) for a description. At script scope, use `koi::add_arg` and `koi::add_command` for the root interface and [koi::config](/docs/reference/config) for script-wide settings such as the name and description.

Within registration blocks at either scope, use [koi::add_validator](/docs/reference/add_validator) after an option or positional declaration to register [validators](/docs/reference/glossary#validator), which are predicates that run during parsing before destination assignment. Validator metadata belongs to that block and is consumed with its spec.

The order of koi APIs within registration blocks does not matter as long as the block is closed with [koi::parse](/docs/reference/parse) and arguments are registered with [koi::add_arg](/docs/reference/add_arg) before their associated [validator](/docs/reference/glossary#validator), [group](/docs/reference/add_group), or [dependency](/docs/reference/add_dependency) is registered. For example this:

```bash
koi::add_description 'Name a person'
koi::add_arg name --option -d 'A name'
koi::add_validator name --nonempty
koi::add_command person -f person -d 'Select a person'
koi::parse "$@" || return "$koi_status"
```

Is equivalent in koi to this:

```bash
koi::add_command person -f person -d 'Select a person'
koi::add_arg name --option -d 'A name'
koi::add_description 'Name a person'
koi::add_validator name --nonempty
koi::parse "$@" || return "$koi_status"
```

## Completing a function's registration block

A parsing function has room for preparation before registration and business logic after parsing:

```bash line-numbers
# Greet someone by name
# Usage: greet "$@"
#   $@  arguments to parse, including optional --name NAME
greet() {
    local name exclaim greeting
    koi::add_arg name --option --long name --default world --description 'Who to greet'
    koi::add_arg exclaim --flag --short e --description 'Greet loudly'
    koi::parse "$@" || return "$koi_status"

    greeting="Hello${name:+, $name}"
    if (( exclaim )); then
        greeting+='!'
    fi

    printf '%s\n' "$greeting"
}
```

In this example, lines 6-8 between the first `koi::add_arg` statement and the `koi::parse` statement define the _registration block._ Line 5 comes _before_ the registration block, and lines 9-15 come _after_ the registration block.

Code before the registration block _always_ runs when the function is invoked, even when only displaying help. Keep operations such as writing files or deploying a service after the `koi::parse` guard. A function with child commands dispatches the selected child or shows help, so its guard always returns without reaching local business logic.

> [!WARNING] Always use a guard
>
> **Always** close function registration contexts with a `koi::parse` call and `$koi_status` guard together, like this:
>
> ```bash
> koi::parse "$@" || return "$koi_status"
> ```
>
> The guard returns from your function after help, a parsing error, or child dispatch. Without it, such as the bare `koi::parse "$@"`, the function can continue into its business logic even when parsing says to stop. **This could cause your script to execute unexpected or dangerous logic.** See [parsing and control flow](/docs/concepts/control-flow) for the return-status contract.

Even a function with no custom arguments needs a guarded parse, so help can stop before its business logic:

```bash
# Check that the script responds
# Usage: ping "$@"
#   $@  arguments to parse, including -h/--help
ping() {
    koi::parse "$@" || return "$koi_status"

    printf 'pong\n'
}
```

In this example, if we did the bare and dangerous `koi::parse "$@"` and your script did not use `set -e`, performing `ping -h` would print the help menu _and_ "pong". _Note that `set -e` cannot replace the guard pattern altogether because conditional calls can suppress its behavior._

### Keep registration uninterrupted

Koi stores function declarations in a shared pending [registration buffer](/docs/reference/glossary#registration-buffer). Entering or returning from a function doesn't automatically start or clear a spec, so each function must finish its registration block before another function starts registering.

Once registration starts:

- Close the block with exactly one guarded `koi::parse` call, even if some declarations are conditional.
- Don't return early or call another function that registers or parses arguments before closing the block.
- Keep declarations inside their owning function. Helper functions intended to register parts of another function's interface (like a `register_common_args` function) are unsupported.

You can call other parsing functions during preparation, before registration starts, or in business logic after parsing completes. Repeated calls, nested calls, and recursion work this way because each invocation finishes its own block before the next one begins.

> [!NOTE] Conditional arguments
>
> In rare scenarios you may want to conditionally change a function's argument interface. Koi technically supports this, but be careful!
>
> Consider this scenario:
> ```bash
> deploy() {
>     koi::add_arg target --positional -d 'The target to deploy'
>     if checkIfAdmin; then
>         koi::add_arg force --flag --short f -d 'If included, force the deploy'
>     fi
>     koi::parse "$@" || return "$koi_status"
>
>     # deploy script...
> }
> ```
> Can you spot the risk here? If `checkIfAdmin` also parses arguments with koi, the registration context with `target` will still be unclosed, meaning `checkIfAdmin`'s argument registration would include `deploy`'s `target` positional.
>
> Consider this scenario:
> ```bash line-numbers
> deploy() {
>     koi::add_arg target --positional -d 'The target to deploy'
>     if (( ! admin )); then
>         printf '%s\n' 'This command is only available to admins'
>         return
>     fi
>     koi::parse "$@" || return "$koi_status"
>
>     # deploy script...
> }
> ```
> Can you spot the problem here? Returning on line 5 leaves `target` in the shared pending registration buffer because `koi::parse` never consumes it. The next function to parse arguments can pick up this unfinished spec, whether it's the caller or an unrelated later call.
>
> With conditional arguments, the best practices are:
>   * Evaluate if you even need them, in most scenarios you do not.
>   * If you do, **do not** call a function that parses arguments via koi mid-registration block, and **do not** return early before reaching `koi::parse`.

## Consumption and assignment boundary

`koi::parse` takes the pending spec into parser-local storage and clears the shared buffer before validating the spec, showing help, or dispatching a child. The next block starts fresh, including after help or a parsing error. Koi discards the consumed spec when it's finished with it.

Declarations don't actually initialize destination variables. Assignment happens at successful parsing via `koi::parse`, including defaults for omitted arguments. Help and ordinary parsing errors skip assignment in the current context, although an ancestor may already have assigned its own values before dispatching to a child. See [presence, values, and defaults](/docs/concepts/control-flow#presence-values-and-defaults) and [destination variables](/docs/concepts/destinations).

An invalid declaration (e.g. `koi::add_arg` or `koi::add_command`) marks the whole block invalid, even if Bash ignores that declaration's return status and continues executing. Later valid declarations don't repair it, and help cannot bypass an invalid spec. This is why it's important to always close registration blocks with `koi::parse`.

## Multiple entrypoints

For a script built around one parsing function, call it directly with the script's arguments:

```bash
main "$@"
```

You can also use koi to parse arguments in function-to-function calls without a single entrypoint parsing function.

```bash
#!/usr/bin/env bash
source koi

funcA() {
    funcB 1 -f
}

funcB() {
    koi::add_arg num --positional -d 'A number'
    koi::add_arg flag --flag --short f -d 'A flag'
    koi::parse "$@" || return "$koi_status"
}

funcA
```

For a CLI with commands, register them at script scope and finish root registration with [koi::run](/docs/reference/run):

```bash
#!/usr/bin/env bash
source koi

greet() {
    local name
    koi::add_arg name --option --long name --default world --description 'Who to greet'
    koi::parse "$@" || return "$koi_status"

    printf 'Hello, %s!\n' "$name"
}

koi::config description 'A friendly greeting CLI'
koi::add_command greet --function greet --description 'Greet someone by name'
koi::run "$@"
```

Here, `./app.sh greet --name Will` selects `greet`, whose function block parses `--name Will`. See [calls and command routing](/docs/concepts/routing) for how arguments pass between contexts.

Root declarations have a separate buffer, including declarations from files sourced at script scope, while function declarations use the pending function buffer. You cannot call `koi::parse` at script scope (that's what [koi::run](/docs/reference/run) is for). `koi::run` will consume the root registration, so you can only call it once. Subsequent `koi::run` calls in the same root context will fail. Unlike function blocks, root registration cannot be rebuilt for another parse in the same shell.

> [!NOTE] Function descriptions
>
> When you register a child command via [koi::add_command -d DESCRIPTION](/docs/reference/add_command), its description appears in the parent's help menu and in the handler's help when koi dispatches that command. Direct calls use the description set by [koi::add_description](/docs/reference/add_description), even if the function is also registered as a command. Without `koi::add_description`, direct-call help has no description. The registered command's description takes precedence only during dispatch.

Relationship declarations belong to the owning registration block too. Declare flags/options before [groups](/docs/reference/add_group) or [dependencies](/docs/reference/add_dependency) that reference them.
