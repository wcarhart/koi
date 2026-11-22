---
title: "Glossary"
description: "Key argument parsing and related terms contextualized for koi"
layout: article
---

## Argument

**An input declared with [koi::add_arg](/docs/reference/add_arg), with kind [flag](#flag), [option](#option), or [positional](#positional).** Bash also uses _argument_ for each string passed to a script or function. In these docs, we use [token](#token) for those individual strings. For example, `--output-file report.txt` is two tokens supplying one declared argument, the [label](#argument-label) `--output-file` followed by the [value](#value) `report.txt`. See [arguments and values](/docs/concepts/arguments).

## Argument label

**A name used to supply a flag or option,** such as `-v` or `--verbose`. [Flags](#flag) and [options](#option) have argument labels while [positionals](#positional) do not. We call `-v`, or the single letter spelling, the [_short_ label](#short-spelling) and we call `--verbose`, or the multi-character spelling, the [_long_ label](#long-spelling). At least one short or long label is required when declaring a non-positional argument. Argument labels are also called _spellings_.

## Array

In the context of koi, **a [destination](#destination) that holds multiple values rather than a single value.** [Scalars](#scalar) and arrays are [cardinalities](#cardinality), where scalars can only assign one value and arrays can hold multiple values. [Options](#option) and [positionals](#positional) can have cardinality (e.g. both can be arrays or scalars), while [flags](#flag) do not have cardinality. During parsing, repeated array [arguments](#argument) accumulate in an [indexed array](https://www.gnu.org/software/bash/manual/html_node/Arrays.html), rather than overwriting the previous value.

## Author error

**An error in the script's use of koi,** such as an invalid argument declaration, an incompatible [destination](#destination), or a missing [handler](#handler). Author errors cannot be suppressed, and, unlike [user errors](#user-error), author error prefixes cannot be customized. You _can_ configure whether or not author errors include a source location via [koi::config author-error-location false](/docs/reference/config). See [errors](/docs/concepts/errors).

## Branch

**A [registration context](#registration-context) with one or more child [commands](#command).** For example, in `./app.sh deploy service`, `deploy` is a branch if it registers `service` as a child command. A branch [dispatches](#dispatch) the selected child and returns through its [guard](#guard). When no child is selected, successful parsing continues into its own business logic by default. This behavior can be configured via [koi::config missing-command](/docs/reference/config). Koi's built-in `help` command does not make a context a branch on its own. See [calls and command routing](/docs/concepts/routing).

## Cardinality

In the context of koi, **how many values a [destination](#destination) can hold while parsing.** Destinations that can hold at most a single value are called [scalars](#scalar) while destinations that can hold multiple values are called [arrays](#array). If you do not specify the cardinality of an argument via [koi::add_arg](/docs/reference/add_arg), is assumed to be a scalar. [Options](#option) and [positionals](#positional) can _have_ cardinality, meaning they can be scalars or arrays, while [flags](#flag) do not have cardinality because they are only ever assigned `0` or `1`.

## Cluster

**Multiple [short flag spellings](#short-spelling) combined behind a single dash,** such as `-abc` instead of `-a -b -c`. Each letter must be a registered [flag](#flag), except for the automatic help short spelling `-h`. [Options](#option) cannot be clustered because they consume an additional [value](#value). For example, `-vf` is valid if both `-v` and `-f` are flags, but invalid if `-f` is an option that expects a filename. Koi rejects the entire cluster if any letter is unknown or belongs to an option.

## Command

In the context of koi, **a subcommand available on the CLI.** Commands are registered with [koi::add_command](/docs/reference/add_command) and specify a handler function to execute when the command is invoked from the CLI. When you register a command, it becomes an immediate child of its [registration context](#registration-context). Commands can be infinitely nested as far as `FUNCNEST` and memory allow.

## Default

**The explicit value assigned to a registered [destination](#destination) for an omitted optional [scalar](#scalar) option or positional upon successful parsing.** You can specify a default value for optional scalar [options](#option) or [positionals](#positional) when registering the argument via [koi::add_arg](/docs/reference/add_arg). When you register an optional scalar option or positional and do not provide a default, the fallback default is the empty string (`''`). Arrays cannot have defaults. Omitted optional arrays become empty [indexed arrays](https://www.gnu.org/software/bash/manual/html_node/Arrays.html). Flags do not have default values, they are either `0` if absent or `1` if present. In addition, defaults do not make required arguments present. See [parsing and control flow](/docs/concepts/control-flow).

## Dependency

**An argument relationship defining a directed prequisite between flags or options.** If the dependent argument is supplied, its prerequisites must also be supplied. Default values do not satisfy dependencies. See [koi::add_dependency](/docs/reference/add_dependency), also see [groups](#group).

## Destination

**The Bash variable an argument value will be read into upon successful parsing.** The destination (also called the _destination variable_) is the first parameter of [koi::add_arg](/docs/reference/add_arg). Its identifier (e.g. `$myVar` in the case of `koi::add_arg myVar ...`) is independent of the associated argument label or override display name in generated help menus. If an override display name is not provided when registering an argumetn in [koi::add_arg](/docs/reference/add_arg) via `-n`/`--display-name`, then the destination is used as the fallback display name. See [destination variables and scope](/docs/concepts/destinations).

## Direct call

**An ordinary Bash function invocation,** such as `greet --name Ada`. In contrast to [dispatch](#dispatch), we call the function by its Bash name rather than selecting it through a registered CLI [command](#command). A function can register and parse its own arguments without being registered with [koi::add_command](/docs/reference/add_command). Direct calls can be made from script scope (see [root context](#root-context)) or from another function, but must not interrupt an unfinished [registration block](#registration-block). See [reusing parsing functions](/docs/guides/functions).

## Dispatch

In the context of koi, **invoking the [handler](#handler) for a selected CLI [command](#command).** For example, in `./app.sh -v deploy -e staging`, koi parses the root's `-v`, selects `deploy`, and passes `-e staging` to its handler. The handler then registers and parses its own interface. Each context recognizes its own [argument labels](#argument-label). Parent labels are not inherited by child commands. When a function dispatches a child, its [guard](#guard) returns with the child's status rather than continuing into the parent's business logic. See [calls and command routing](/docs/concepts/routing).

## Display name

**The token used to represent an [option](#option) or [positional](#positional) in generated help menus.** By default koi uses the registered argument's [long spelling](#long-spelling) if one is provided, or the [destination](#destination) if not. You can manually set the display name in [koi::add_arg](/docs/reference/add_arg) via `-n`/`--display-name`. The display name only changes the presentation of the generated help menu, not the [destination variable](#destination) or [spelling](#argument-label).

## Flag

**An argument [kind](#flag) that consumes no additional value.** A common example is `-f`/`--force`. Upon successful parse, flags assign `1` to their [destination](#destination) when present and `0` when absent. Flags can be [required](#requiredness).

## Group

**An argument relationship defining a pattern for how two or more options and flags are supplied together when parsed.** `XOR` groups allow at most one member, `OR` groups require at least one member, and `AND` groups require all members together. See [koi::add_group](/docs/reference/add_group), also see [dependencies](#dependency).

## Guard

In the context of koi, **the caller-side control flow `|| return "$koi_status"` immediately following `koi::parse "$@"`.** The guard allows koi-powered functions to return or exit upon parse error, help, or child dispatch, preserving appropriate function status and not executing unintended business logic. _Note that used the bare `koi::parse "$@"` is not support syntax and will result in koi malfunctioning. Always use `koi::parse "$@" || return "$koi_status"`._ See [parsing and control flow](/docs/concepts/control-flow).

## Handler

**The Bash function registered as the callback for a CLI command.** When using [koi::add_command](/docs/reference/add_command), you specify what function should _handle_ the registered [command](#command) should it be invoked in the CLI. Multiple commands can share the same handler. Also referred to as the _handler function_ or the _handling function_.

## Kind

**The parsing behavior of a registered argument,** specifically [flag](#flag), [option](#option), or [positional](#positional). In another sense, the _type_ of argument or the _action_ we take when we parse this argument.

## koi_status

**The transient parser output used by the immediate caller [guard](#guard).** It is `0` for help or local parsing success, `2` for a parsing or argument registration error, or the selected child’s status after dispatch. It is distinct from the parser’s return code and may be overwritten by another parse. See [parsing and control flow](/docs/concepts/control-flow).

## Leaf

**A [registration context](#registration-context) with no child [commands](#command).** For example, in `./app.sh deploy service`, `service` is a leaf if it does not register any further commands. A leaf handler continues into its own business logic after successful parsing. A [branch](#branch) can also continue when no child is selected (see [koi::config missing-command](/docs/reference/config)). Help and parsing errors still return through its [guard](#guard). Leaves do not receive koi's built-in `help` command, but automatic `-h`/`--help` is still available. See [calls and command routing](/docs/concepts/routing).

## Long spelling

**An [argument label](#argument-label) with two leading dashes and one or more characters** starting with a letter, such as `--verbose`. See [koi::add_arg](/docs/reference/add_arg).

## Option

**An argument [kind](#kind) that consumes the next [argument](#argument) after its [label](#argument-label) as a value,** including dash-prefixed values except for `-h`/`--help`. A common example is from `git commit` is `-m 'Message'`/`--message 'Messsage'`. Upon successful parse, the next argument after the [argument label](#argument-label) will be assigned to the option's [destination](#destination). Options can be [required](#requiredness). Scalar options can use [defaults](#default).

## Parsing boundary

**The point where argument registration ends and parsing determines whether business logic should execute.** In a function, this is the [guarded](#guard) [koi::parse](/docs/reference/parse) call. Code before this boundary executes even when help is requested, while code after it executes only when parsing succeeds locally. Help, parsing errors, and child [dispatch](#dispatch) cause the guard to return. At the [root](#root-context) level, [koi::run](/docs/reference/run) consumes registration, but returns `0` for help as well as successful terminal parsing, so code after it cannot distinguish those outcomes by status alone. See [parsing and control flow](/docs/concepts/control-flow).

## Positional

**An argument [kind](#kind) that consumes the next [argument](#argument) or arguments as a value without a [label](#argument-label).** A common example is `mv ~/Downloads/image.png .` where `~/Downloads/image.png` and `.` are positional arguments. Positional arguments can be [scalars](#scalar) or [arrays](#array). Positional [values](#value) (the values provided when parsing a positional argument) fill slots in registration order (see [koi::add_arg](/docs/reference/add_arg)), and required positionals must precede all optional positionals. Positionals can be [required](#requiredness). Scalar positionals can use [defaults](#default). Positional arrays must be the last registered positional argument and consume the remaining positional values (see [cardinality](/docs/reference/add_arg)). Use `--` to supply dash-prefixed positional values.

## Presence

**Whether input explicitly supplies a declared argument during the current parse,** tracked independently from its [value](#value). A value can be explicitly empty while still being present. See [parsing and control flow](/docs/concepts/control-flow).

## Registration block

**The code starting with zero or more argument interfaces and ending with parsing.** For example:
```bash
koi::config description "My function's description"
koi::add_arg force --flag --short f --long force -d 'Force the operation'
koi::parse "$@" || return "$koi_status"
```
In a function: zero or more function declarations ([koi::add_arg](/docs/reference/add_arg), [koi::add_validator](/docs/reference/add_validator), [koi::add_command](/docs/reference/add_command), or [koi::config](/docs/reference/config)) followed by exactly one [guarded](#guard) [koi::parse](/docs/reference/parse) statement. At the [root](#root-context) level: zero or more root declarations ([koi::add_arg](/docs/reference/add_arg), [koi::add_validator](/docs/reference/add_validator), or [koi::add_command](/docs/reference/add_command)) followed by exactly one [koi::run](/docs/reference/run) statement.

Registration blocks must be closed properly (via [koi::parse](/docs/reference/parse) or [koi::run](/docs/reference/run)) or koi will not function properly. Conditional argument registration is supported (e.g. custom logic inside of a registration block) but comes with additional risk.

You can think of start of a registration block as the _start of argument registration accumulation_ and the end of a registration block as the _finalization of the argument registration [spec](#registration-spec)._ See [registration contexts and blocks](/docs/concepts/lifecycle).

Non-[root](#root-context) context can also be referred to as _function context_.

## Registration buffer

**The temporary storage where koi accumulates declarations for a [registration spec](#registration-spec).** Koi maintains a separate buffer for [root](#root-context) declarations and a shared pending buffer for function declarations. When [koi::parse](/docs/reference/parse) consumes the pending function buffer, it moves the spec into parser-local storage and clears the buffer before validation, help, or child [dispatch](#dispatch). Returning from a function does not automatically clear an unfinished buffer, which is why [registration blocks](#registration-block) must be closed properly and cannot be interleaved. See [registration contexts and blocks](/docs/concepts/lifecycle).

## Registration context

**The script root or function invocation that owns argument and command declarations.** Ownership over registration context is distinct from Bash variable scope. Functions share a pending argument [registration buffer](#registration-buffer) separate from the [root context](#root-context), which is why unclosed [registration blocks](#registration-block) are so problematic. Call frames do not automatically isolate or clean up an unfinished block. See [registration contexts and blocks](/docs/concepts/lifecycle).

## Registration spec

**The accumulated description/specification of a [context’s](#registration-context) arguments, immediate child commands, descriptions, and related metadata.** Executing declarations ([koi::add_arg](/docs/reference/add_arg), [koi::add_validator](/docs/reference/add_validator), [koi::add_command](/docs/reference/add_command), or [koi::config](/docs/reference/config)) begins argument registration accumulation in the spec and parsing arguments ([koi::parse](/docs/reference/parse) or [koi::run](/docs/reference/run)) consumes the spec. The registration spec is not persistent and is built on the fly during function execution. See [registration contexts and blocks](/docs/concepts/lifecycle).

## Requiredness

**Whether an argument must be explicitly present in the current parse.** Use `-r`/`--required` in [koi::add_arg](/docs/reference/add_arg) to make an argument required, otherwise all argument registrations are optional by default. Required [options](#option) and [positionals](#positional) cannot have defaults. Existing values in [destinations](#destination) do not satisfy requiredness.

## Root context

**The [context](#registration-context) built by script-scope declarations,** including declarations ([koi::add_arg](/docs/reference/add_arg), [koi::add_validator](/docs/reference/add_validator), or [koi::add_command](/docs/reference/add_command)) sourced at script scope. In contrast to [function context](#registration-context), only [koi::run](/docs/reference/run) can consumes root-level [registration specs](#registration-spec), once per library initialization/script invocation. Parsing arguments in [function context](#registration-context) uses a separate [registration buffer](#registration-buffer). See [registration contexts and blocks](/docs/concepts/lifecycle).

## Scalar

**A [destination](#destination) that holds a single value rather than an [array](#array) of values.** Scalars and [arrays](#array) are [cardinalities](#cardinality), where scalars can only assign one value and arrays can hold multiple values. [Options](#option) and [positionals](#positional) can have cardinality (e.g. both can be arrays or scalars), while [flags](#flag) do not have cardinality. During parsing, repeated scalar [arguments](#argument) overwrite the previous value by default, rather than accumulating in an [indexed array](https://www.gnu.org/software/bash/manual/html_node/Arrays.html).

## Short spelling

**An [argument label](#argument-label) with one leading dash and one letter,** such as `-f` or `-v`. Short spellings cannot be numbers. Fro example `-1` is ambiguous because it could be _negative one_ or _dash one_. Short spellings for compatible [flags](#flag) can be [clustered](#cluster), e.g. `-abc` is the same as `-a -b -c`. Short spellings for [options](#option) cannot be clustered. See [koi::add_arg](/docs/reference/add_arg).

## Token

**One argument string supplied to a script or function after Bash expansion and tokenization.** A token can contain whitespace or be empty when quoted appropriately (see [argument](#argument)). An [option](#option) and its [value](#value) normally occupy two tokens. See [arguments and values](/docs/concepts/arguments).

## User error

**An error in the arguments supplied to a script or function,** such as an unknown [option](#option) or a missing [required](#requiredness) argument. The prefix used in user error messages can be customized via [koi::config name](/docs/reference/config). The default prefix is `koi`.

## Value

**The data consumed for an [option](#option) or [positional](#positional),** or assigned to a [destination](#destination) after parsing. A value can be an empty string.

## Validator

**A predicate registered with [koi::add_validator](/docs/reference/add_validator) that checks one effective option or positional value before assignment.** Array elements are each checked independently. A rejection stops parsing without assigning destinations.
