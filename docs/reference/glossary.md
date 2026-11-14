---
title: "Glossary"
description: "Key argument parsing and related terms contextualized for koi"
layout: article
---

## Argument

**An input declared with [__addarg](/docs/reference/addarg), with kind [flag](#flag), [option](#option), or [positional](#positional).** Bash also uses _argument_ for each string passed to a script or function. In these docs, we use [token](#token) for those individual strings. For example, `--output-file report.txt` is two tokens supplying one declared argument, the [label](#argument-label) `--output-file` followed by the [value](#value) `report.txt`. See [arguments and values](/docs/concepts/arguments).

## Argument label

**A name used to supply a flag or option,** such as `-v` or `--verbose`. [Flags](#flag) and [options](#option) have argument labels while [positionals](#positional) do not. We call `-v`, or the single letter spelling, the [_short_ label](#short-spelling) and we call `--verbose`, or the multi-character spelling, the [_long_ label](#long-spelling). At least one short or long label is required when declaring a non-positional argument. Argument labels are also called _spellings_.

## Array

In the context of koi, **a [destination](#destination) that holds a multiple value rather than a single value.** [Scalars](#scalar) and arrays are essentially sub-[kinds](#kind) of [options](#option) and [positionals](#positional), where scalars can only assign one value and arrays can hold multiple values. During parsing, repeated array [arguments](#argument) accumulate in a Bash array, rather than overwriting the previous value.

## Branch

**A [registration context](#registration-context) with one or more child [commands](#command).** For example, in `./app.sh deploy service`, `deploy` is a branch if it registers `service` as a child command. A branch either [dispatches](#dispatch) the selected child or displays its help menu when no child is selected. Its [guarded](#guard) parse does not continue into the branch's own business logic. Koi's built-in `help` command does not make a context a branch on its own. See [calls and command routing](/docs/concepts/routing).

## Cluster

**Multiple [short flag spellings](#short-spelling) combined behind a single dash,** such as `-abc` instead of `-a -b -c`. Each letter must be a registered [flag](#flag), except for the automatic help short spelling `-h`. [Options](#option) cannot be clustered because they consume an additional [value](#value). For example, `-vf` is valid if both `-v` and `-f` are flags, but invalid if `-f` is an option that expects a filename. Koi rejects the entire cluster if any letter is unknown or belongs to an option.

## Command

In the context of koi, **a subcommand available on the CLI.** Commands are registered with [__addcommand](/docs/reference/addcommand) and specify a handler function to execute when the command is invoked from the CLI. When you register a command, it becomes an immediate child of its [registration context](#registration-context). Commands can be infinitely nested as far as `FUNCNEST` and memory allow.

## Default

**The explicit value assigned to a registered [destination](#destination) for an omitted optional option or positional upon successful parsing.** You can specify a default value for optional [options](#option) or [positionals](#positional) when registering the argument via [__addarg](/docs/reference/addarg). When you register an optional option or positional and do not provide a default, the fallback default is the empty string (`''`). Flags do not have default values, they are either `0` if absent or `1` if present. In addition, defaults do not make required arguments present. See [parsing and control flow](/docs/concepts/control-flow).

## Destination

**The name of the Bash variable an argument value will be read into upon successful parsing.** The destination (also called the _destination variable_) is the first parameter of [__addarg](/docs/reference/addarg). Its identifier (e.g. `$myVar` in the case of `__addarg myVar ...`) is independent of the associated argument label or override display name in generated help menus. If an override display name is not provided when registering an argumetn in [__addarg](/docs/reference/addarg) via `-n`/`--display-name`, then the destination is used as the fallback display name. See [destination variables and scope](/docs/concepts/destinations).

## Direct call

**An ordinary Bash function invocation,** such as `greet --name Ada`. In contrast to [dispatch](#dispatch), we call the function by its Bash name rather than selecting it through a registered CLI [command](#command). A function can register and parse its own arguments without being registered with [__addcommand](/docs/reference/addcommand). Direct calls can be made from script scope (see [root context](#root-context)) or from another function, but must not interrupt an unfinished [registration block](#registration-block). See [reusing parsing functions](/docs/guides/functions).

## Dispatch

In the context of koi, **invoking the [handler](#handler) for a selected CLI [command](#command).** For example, in `./app.sh -v deploy -e staging`, koi parses the root's `-v`, selects `deploy`, and passes `-e staging` to its handler. The handler then registers and parses its own interface. Each context recognizes its own [argument labels](#argument-label). Parent labels are not inherited by child commands. When a function dispatches a child, its [guard](#guard) returns with the child's status rather than continuing into the parent's business logic. See [calls and command routing](/docs/concepts/routing).

## Display name

**The token used to represent an [option](#option) or [positional](#positional) in generated help menus.** By default koi uses the registered argument's [destination](#destination), unless overridden in [__addarg](/docs/reference/addarg) via `-d`/`--display-name`. The display name only changes the presentation of the generated help menu, not the [destination variable](#destination) or [spelling](#argument-label).

## Flag

**An argument [kind](#flag) that consumes no additional value.** A common example is `-f`/`--force`. Upon successful parse, flags assign `1` to their [destination](#destination) when present and `0` when absent. Flags can be [required](#requiredness).

## Guard

In the context of koi, **the caller-side control flow `|| return "$koi_status"` immediately following `__parseargs "$@"`.** The guard allows koi-powered functions to return or exit upon parse error, help, or child dispatch, preserving appropriate function status and not executing unintended business logic. _Note that used the bare `__parseargs "$@"` is not support syntax and will result in koi malfunctioning. Always use `__parseargs "$@" || return "$koi_status"`._ See [parsing and control flow](/docs/concepts/control-flow).

## Handler

**The Bash function registered as the callback for a CLI command.** When using [__addcommand](/docs/reference/addcommand), you specify what function should _handle_ the registered [command](#command) should it be invoked in the CLI. Multiple commands can share the same handler. Also referred to as the _handler function_ or the _handling function_.

## Kind

**The parsing behavior of a registered argument,** specifically [flag](#flag), [option](#option), or [positional](#positional). In another sense, the _type_ of argument or the _action_ we take when we parse this argument.

## koi_status

**The transient parser output used by the immediate caller [guard](#guard).** It is `0` for help or local parsing success, `2` for a parsing or argument registration error, or the selected child’s status after dispatch. It is distinct from the parser’s return code and may be overwritten by another parse. See [parsing and control flow](/docs/concepts/control-flow).

## Leaf

**A [registration context](#registration-context) with no child [commands](#command).** For example, in `./app.sh deploy service`, `service` is a leaf if it does not register any further commands. Unlike a [branch](#branch), a leaf handler continues into its own business logic after successful parsing. Help and parsing errors still return through its [guard](#guard). Leaves do not receive koi's built-in `help` command, but automatic `-h`/`--help` is still available. See [calls and command routing](/docs/concepts/routing).

## Long spelling

**An [argument label](#argument-label) with two leading dashes and multiple characters,** such as `--verbose`. See [__addarg](/docs/reference/addarg).

## Option

**An argument [kind](#kind) that consumes the next [argument](#argument) after its [label](#argument-label) as its [scalar](#scalar) value,** including dash-prefixed values except for `-h`/`--help`. A common example is from `git commit` is `-m 'Message'`/`--message 'Messsage'`. Upon successful parse, the next argument after the [argument label](#argument-label) will be assigned to the option's [destination](#destination). Options can be [required](#requiredness) and use [defaults](#default).

## Parsing boundary

**The point where argument registration ends and parsing determines whether business logic should execute.** In a function, this is the [guarded](#guard) [__parseargs](/docs/reference/parseargs) call. Code before this boundary executes even when help is requested, while code after it executes only when parsing succeeds locally. Help, parsing errors, and child [dispatch](#dispatch) cause the guard to return. At the [root](#root-context) level, [__koirun](/docs/reference/koirun) consumes registration, but returns `0` for help as well as successful terminal parsing, so code after it cannot distinguish those outcomes by status alone. See [parsing and control flow](/docs/concepts/control-flow).

## Positional

**An argument [kind](#kind) that consumes the next [argument](#argument) as its [scalar](#scalar) value without a [label](#argument-label).** A common example is `mv ~/Downloads/image.png .` where `~/Downloads/image.png` and `.` are positional arguments. Positional [values](#value) (the values provided when parsing a positional argument) fill slots in registration order (see [__addarg](/docs/reference/addarg)), and required positionals must precede all optional positionals. Positionals can be [required](#requiredness) and use [defaults](#default). Use `--` to supply dash-prefixed positional values.

## Presence

**Whether input explicitly supplies a declared argument during the current parse,** tracked independently from its [value](#value). A value can be explicitly empty while still being present. See [parsing and control flow](/docs/concepts/control-flow).

## Registration block

**The code starting with zero or more argument interfaces and ending with parsing.** For example:
```bash
__adddescription "My function's description"
__addarg force --flag --short f --long force -d 'Force the operation'
__parseargs "$@" || return "$koi_status"
```
In a function: zero or more function declarations ([__addarg](/docs/reference/addarg), [__addcommand](/docs/reference/addcommand), or [__adddescription](/docs/reference/adddescription)) followed by exactly one [guarded](#guard) [__parsearg](/docs/reference/parseargs) statement. At the [root](#root-context) level: zero or more root declarations ([__addarg](/docs/reference/addarg), [__addcommand](/docs/reference/addcommand), or [__adddescription](/docs/reference/adddescription)) followed by exactly one [__koirun](/docs/reference/koirun) statement.

Registration blocks must be closed properly (via [__parseargs](/docs/reference/parseargs) or [__koirun](/docs/reference/koirun)) or koi will not function properly. Conditional argument registration is supported (e.g. custom logic inside of a registration block) but comes with additional risk.

You can think of start of a registration block as the _start of argument registration accumulation_ and the end of a registration block as the _finalization of the argument registration [spec](#registration-spec)._ See [registration contexts and blocks](/docs/concepts/lifecycle).

Non-[root](#root-context) context can also be referred to as _function context_.

## Registration buffer

**The temporary storage where koi accumulates declarations for a [registration spec](#registration-spec).** Koi maintains a separate buffer for [root](#root-context) declarations and a shared pending buffer for function declarations. When [__parseargs](/docs/reference/parseargs) consumes the pending function buffer, it moves the spec into parser-local storage and clears the buffer before validation, help, or child [dispatch](#dispatch). Returning from a function does not automatically clear an unfinished buffer, which is why [registration blocks](#registration-block) must be closed properly and cannot be interleaved. See [registration contexts and blocks](/docs/concepts/lifecycle).

## Registration context

**The script root or function invocation that owns argument and command declarations.** Ownership over registration context is distinct from Bash variable scope. Functions share a pending argument [registration buffer](#registration-buffer) separate from the [root context](#root-context), which is why unclosed [registration blocks](#registration-block) are so problematic. Call frames do not automatically isolate or clean up an unfinished block. See [registration contexts and blocks](/docs/concepts/lifecycle).

## Registration spec

**The accumulated description/specification of a [context’s](#registration-context) arguments, immediate child commands, descriptions, and related metadata.** Executing declarations ([__addarg](/docs/reference/addarg), [__addcommand](/docs/reference/addcommand), or [__adddescription](/docs/reference/adddescription)) begins argument registration accumulation in the spec and parsing arguments ([__parseargs](/docs/reference/parseargs) or [__koirun](/docs/reference/koirun)) consumes the spec. The registration spec is not persistent and is built on the fly during function execution. See [registration contexts and blocks](/docs/concepts/lifecycle).

## Requiredness

**Whether an argument must be explicitly present in the current parse.** Use `-r`/`--required` in [__addarg](/docs/reference/addarg) to make an argument required, otherwise all argument registrations are optional by default. Required [options](#option) and [positionals](#positional) cannot have defaults. Existing values in [destinations](#destination) do not satisfy requiredness.

## Root context

**The [context](#registration-context) built by script-scope declarations,** including declarations ([__addarg](/docs/reference/addarg), [__addcommand](/docs/reference/addcommand), or [__adddescription](/docs/reference/adddescription)) sourced at script scope. In contrast to [function context](#registration-context), only [__koirun](/docs/reference/koirun) can consumes root-level [registration specs](#registration-spec), once per library initialization/script invocation. Parsing arguments in [function context](#registration-context) uses a separate [registration buffer](#registration-buffer). See [registration contexts and blocks](/docs/concepts/lifecycle).

## Scalar

**A [destination](#destination) that holds a single value rather than an [array](#array) of values.** Scalars and arrays are essentially sub-[kinds](#kind) of [options](#option) and [positionals](#positional), where scalars can only assign one value and arrays can hold multiple values. During parsing, repeated scalar [arguments](#argument) overwrite the previous value by default, rather than accumulating in an array.

## Short spelling

**An [argument label](#argument-label) with one leading dash and one letter,** such as `-f` or `-v`. Short spellings cannot be numbers. Fro example `-1` is ambiguous because it could be _negative one_ or _dash one_. Short spellings for compatible [flags](#flag) can be [clustered](#cluster), e.g. `-abc` is the same as `-a -b -c`. Short spellings for [options](#option) cannot be clustered. See [__addarg](/docs/reference/addarg).

## Token

**One argument string supplied to a script or function after Bash expansion and tokenization.** A token can contain whitespace or be empty when quoted appropriately (see [argument](#argument)). An [option](#option) and its [value](#value) normally occupy two tokens. See [arguments and values](/docs/concepts/arguments).

## Value

**The data consumed for an [option](#option) or [positional](#positional),** or assigned to a [destination](#destination) after parsing. A value can be an empty string.
