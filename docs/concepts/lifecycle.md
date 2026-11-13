---
title: "Registration contexts and blocks"
description: "How koi builds a spec based on registered arguments and commands."
layout: article
---

Koi builds a function's argument interface at function _runtime_, meaning there's no separate, static type or argument spec to maintain, and koi is unaware of the interface of a function until it is invoked. This keeps the definition of arguments directly alongside the code that uses them and in sync with your code's business logic, even when you call the function directly or reuse it in another script. However, it creates a few nuances that are important to understand.

## Contexts, blocks, and specs

A **registration context** is the script root or function invocation that owns an interface. For example, a `deploy` function can own an `--environment` option and a `service` child command. Each context recognizes its own argument labels, while the _destination_ variables holding their values follow ordinary [Bash scope](/docs/concepts/destinations).

A **registration block** is the code that declares this interface and closes it with parsing. The declarations accumulate into a **registration spec**, which describes the context's arguments, immediate child commands, and help metadata.

Inside functions, use [__addarg](/docs/reference/addarg) for arguments, [__addcommand](/docs/reference/addcommand) for child commands, and [__adddescription](/docs/reference/adddescription) for a description. At script scope, use `__addarg` and `__addcommand` for the root interface and [__koiconfig](/docs/reference/koiconfig) for script-wide settings such as the name and description.

## Completing a function's registration block

A parsing function has room for preparation before registration and business logic after parsing:

```bash line-numbers
# Greet someone by name
# Usage: greet "$@"
#   $@  arguments to parse, including optional --name NAME
greet() {
    local name exclaim greeting
    __addarg name --option --long name --default world --description 'Who to greet'
    __addarg exclaim --flag --short e --description 'Greet loudly'
    __parseargs "$@" || return "$koi_status"

    greeting="Hello${name:+, $name}"
    if (( exclaim )); then
        greeting+='!'
    fi

    printf '%s\n' "$greeting"
}
```

In this example, lines 6-8 between the first `__addarg` statement and the `__parseargs` statement define the _registration block._ Line 5 comes _before_ the registration block, and lines 9-15 come _after_ the registration block.

Code before the registration block _always_ runs when the function is invoked, even when only displaying help. Keep operations such as writing files or deploying a service after the `__parseargs` guard. A function with child commands dispatches the selected child or shows help, so its guard always returns without reaching local business logic.

> [!WARNING] Always use a guard
>
> **Always** close function registration contexts with a `__parseargs` call and `$koi_status` guard together, like this:
>
> ```bash
> __parseargs "$@" || return "$koi_status"
> ```
>
> The guard returns from your function after help, a parsing error, or child dispatch. Without it, such as the bare `__parseargs "$@"`, the function can continue into its business logic even when parsing says to stop. **This could cause your script to execute unexpected or dangerous logic.** See [parsing and control flow](/docs/concepts/control-flow) for the return-status contract.

Even a function with no custom arguments needs a guarded parse, so help can stop before its business logic:

```bash
# Check that the script responds
# Usage: ping "$@"
#   $@  arguments to parse, including -h/--help
ping() {
    __parseargs "$@" || return "$koi_status"

    printf 'pong\n'
}
```

In this example, if we did the bare and dangerous `__parseargs "$@"` and your script did not use `set -e`, performing `ping -h` would print the help menu _and_ "pong". _Note that `set -e` cannot replace the guard pattern altogether because conditional calls can suppress its behavior._

### Keep registration uninterrupted

Koi stores function declarations in a shared pending [registration buffer](/docs/concepts/glossary#registration-buffer). Entering or returning from a function doesn't automatically start or clear a spec, so each function must finish its registration block before another function starts registering.

Once registration starts:

- Close the block with exactly one guarded `__parseargs` call, even if some declarations are conditional.
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
>     __addarg target --positional -d 'The target to deploy'
>     if checkIfAdmin; then
>         __addarg force --flag --short f -d 'If included, force the deploy'
>     fi
>     __parseargs "$@" || return "$koi_status"
>
>     # deploy script...
> }
> ```
> Can you spot the risk here? If `checkIfAdmin` also parses arguments with koi, the registration context with `target` will still be unclosed, meaning `checkIfAdmin`'s argument registration would include `deploy`'s `target` positional.
>
> Consider this scenario:
> ```bash line-numbers
> deploy() {
>     __addarg target --positional -d 'The target to deploy'
>     if (( ! admin )); then
>         printf '%s\n' 'This command is only available to admins'
>         return
>     fi
>     __parseargs "$@" || return "$koi_status"
>
>     # deploy script...
> }
> ```
> Can you spot the problem here? Returning on line 5 leaves `target` in the shared pending registration buffer because `__parseargs` never consumes it. The next function to parse arguments can pick up this unfinished spec, whether it's the caller or an unrelated later call.
>
> With conditional arguments, the best practices are:
>   * Evaluate if you even need them, in most scenarios you do not.
>   * If you do, **do not** call a function that parses arguments via koi mid-registration block, and **do not** return early before reaching `__parseargs`.

## Consumption and assignment boundary

`__parseargs` takes the pending spec into parser-local storage and clears the shared buffer before validating the spec, showing help, or dispatching a child. The next block starts fresh, including after help or a parsing error. Koi discards the consumed spec when it's finished with it.

Declarations don't actually initialize destination variables. Assignment happens at successful parsing via `__parseargs`, including defaults for omitted arguments. Help and ordinary parsing errors skip assignment in the current context, although an ancestor may already have assigned its own values before dispatching to a child. See [presence, values, and defaults](/docs/concepts/control-flow#presence-values-and-defaults) and [destination variables](/docs/concepts/destinations).

An invalid declaration (e.g. `__addarg` or `__addcommand`) marks the whole block invalid, even if Bash ignores that declaration's return status and continues executing. Later valid declarations don't repair it, and help cannot bypass an invalid spec. This is why it's important to always close registration blocks with `__parseargs`.

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
    __addarg num --positional -d 'A number'
    __addarg flag --flag --short f -d 'A flag'
    __parseargs "$@" || return "$koi_status"
}

funcA
```

For a CLI with commands, register them at script scope and finish root registration with [__koirun](/docs/reference/koirun):

```bash
#!/usr/bin/env bash
source koi

greet() {
    local name
    __addarg name --option --long name --default world --description 'Who to greet'
    __parseargs "$@" || return "$koi_status"

    printf 'Hello, %s!\n' "$name"
}

__koiconfig description 'A friendly greeting CLI'
__addcommand greet --function greet --description 'Greet someone by name'
__koirun "$@"
```

Here, `./app.sh greet --name Will` selects `greet`, whose function block parses `--name Will`. See [calls and command routing](/docs/concepts/routing) for how arguments pass between contexts.

Root declarations have a separate buffer, including declarations from files sourced at script scope, while function declarations use the pending function buffer. You cannot call `__parseargs` at script scope (that's what [__koirun](/docs/reference/koirun) is for). `__koirun` will consume the root registration, so you can only call it once. Subsequent `__koirun` calls in the same root context will fail. Unlike function blocks, root registration cannot be rebuilt for another parse in the same shell.

> [!NOTE] Function descriptions
>
> When you register a child command via [__addcommand -d DESCRIPTION](/docs/reference/addcommand), its description appears in the parent's help menu and in the handler's help when koi dispatches that command. Direct calls use the description set by [__adddescription](/docs/reference/adddescription), even if the function is also registered as a command. Without `__adddescription`, direct-call help has no description. The registered command's description takes precedence only during dispatch.
