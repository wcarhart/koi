---
title: "koi::add_validator"
description: "Check provided argument values before assigning destinations."
layout: article
---

`koi::add_validator` adds a value check (essentially, a function that runs during parsing right before destination assignment) to an option or positional already declared with [koi::add_arg](/docs/reference/add_arg) in the current [registration block](/docs/concepts/lifecycle). Only options and positionals can be validated, flags cannot.

## Usage

```text usage
koi::add_validator DEST (--nonempty|--integer|--file|--directory)
koi::add_validator DEST -f FUNCTION [-m MESSAGE]
```

## Arguments

| Parameter | Description |
| --- | --- |
| `DEST` | An option or positional destination already registered in this block. |
| `--nonempty` | Use the builtin `nonempty` validator. Require a string with length greater than zero. |
| `--integer` | Use the builtin `integer` validator. Require ASCII decimal digits with an optional leading `+` or `-`. |
| `--file` | Use the builtin `file` validator. Require an existing regular file using Bash `-f` semantics. |
| `--directory` | Use the builtin `directory` validator. Require an existing directory using Bash `-d` semantics. |
| `-f`, `--function FUNCTION` | Use a custom validator. Register a Bash function as its silent predicate. |
| `-m`, `--message MESSAGE` | Use this nonempty rejection reason for a custom callback (cannot be used with builtin validators). |

Supply exactly one builtin selector (`--nonempty`, `--integer`, `--file`, `--directory`) or use `-f`/`--function` to specify a custom function as the validator. Conflicting selectors, repeated parameters (including aliases), unknown parameters, missing values, and extra arguments are [author errors](/docs/reference/glossary#author-error). You cannot use messages (`-m`/`--message`) with builtin validators.

The `--integer` builtin validator accepts ASCII decimal digits with an optional leading sign (e.g. `-` or `+`), including leading zeros and arbitrary digit lengths. Integer validation is lexical and never evaluates arithmetic. Whitespace, fractions, exponents, base prefixes, empty strings, and a sign without digits are all rejected.

For `--file` and `--directory` builtin validators, koi follows symlinks.

Whitespace-only strings are accepted by the `--nonempty` builtin validator.

## Custom validators

If you need more complex validation than what is offered by the builtin validators, you can create your own custom validator instead. Your validator must be a Bash function that receives exactly one quoted argument, the literal value as parsed by koi:

```bash
FUNCTION "$value"
```

Function names start with an ASCII letter or underscore and continue with ASCII letters, digits, underscores, or colons. Namespaced functions are supported (e.g. `namespace::function`). The function must exist when the [registration spec](/docs/concepts/lifecycle) is finalized.

| Callback status | Meaning |
| --- | --- |
| `0` | Accept the value. |
| `1` | Reject the value. Use the registered message or `validation failed` as a fallback. |
| `2+` | Operational failure. Report an [author error](/docs/reference/glossary#author-error) with the destination, callback name, and status. |

### Best practices

Your custom validator must be a silent predicate, in that it should not print diagnostics, transform values, assign destinations, invoke koi registration or parsing APIs, or perform business operations. Koi does not capture `stdout` from custom validators as validation feedback messages. Custom validator silence and absence of side effects are author responsibilities that koi does not enforce.

Since koi invokes custom validators conditionally and checks their statuses explicitly, you should not rely on `set -e` for failure propogation in a custom validator. Return `1` to reject the provided value and at least `2` to indicate an unexpected operational failure.

As consistent with prior guidance, use the [recommended guard](/docs/concepts/control-flow#the-parsing-boundary-and-required-guard) when parsing, even when using a custom validator:

```bash
koi::parse "$@" || return "$koi_status"
```

### Example of a custom validator

Consider the following script:

```bash
#!/usr/bin/env bash
source koi

main() {
    local name
    koi::config description 'Say hello!'
    koi::add_arg name --positional --required -d 'Who to greet'
    koi::parse "$@" || return "$koi_status"

    printf '%s\n' "Hello, ${name}!"
}

main "$@"
```

Suppose we wanted to guarantee that the provided name only contained letters and started with a capital letter, as most names do. First, we'd write a custom validator function that receives the parsed positional:

```bash
# Accept a name made of ASCII letters with an initial capital
# Usage: is_valid_name VALUE
#   VALUE  name to check
# Returns 0 to accept, 1 to reject
is_valid_name() {
    [[ $1 =~ ^[A-Z][a-zA-Z]*$ ]]
}
```

Then, we'd wire it up using `koi::add_validator`:

```bash
main() {
    local name
    koi::config description 'Say hello!'
    koi::add_arg name --positional --required -d 'Who to greet'
    koi::add_validator name -f is_valid_name -m 'Name must contain letters only and start with a capital'
    koi::parse "$@" || return "$koi_status"

    printf '%s\n' "Hello, ${name}!"
}
```

```bash shell
$ ./greet.sh "ada"
koi: invalid argument 'name': Name must contain letters only and start with a capital
$ ./greet.sh "Ada"
Hello, Ada!
```

## Lifecycle

Koi validates provided values during parsing, before [destination assignment](/docs/concepts/destinations) or [child dispatch](/docs/concepts/routing):

<ol class="validation-lifecycle" aria-label="Parsing lifecycle">
  <li class="validation-lifecycle-stage">Token parsing<br>Requiredness checks<br>Check groups<br>Check dependencies<br>Default resolution<br>Destination-type checks</li>
  <li class="validation-lifecycle-stage validation-lifecycle-check"><strong>Validation</strong></li>
  <li class="validation-lifecycle-stage">Destination assignment<br>Dispatch</li>
</ol>

All validators (custom and builtin) must pass before destination assignment occurs, meaning destinations will never be left partially assigned if a single validator rejects. Validation stops at the first rejection.

Validation order runs by argument order, then array order (if the argument is not a scalar, see [cardinality](/docs/concepts/cardinality)), then validator registration order. Unprovided optional scalars and arrays without values skip validation. If a scalar has a default and is not provided, the default _is_ validated. Defaults are not validated when supplied values replace them. Scalar options validate only their final value.

For example, given the following registration block:

```bash
koi::add_arg first --positional --required -d 'first'
koi::add_arg second --positional --array -d 'second'
koi::add_validator first --function validate_first_a
koi::add_validator second --nonempty
koi::add_validator first --function validate_first_b
koi::add_validator second --function validate_second_a
koi::add_validator second --function validate_second_b
```

Given arguments `one two three`, the validation order would be:

```bash
validate_first_a one
validate_first_b one
nonempty two
validate_second_a two
validate_second_b two
nonempty three
validate_second_a three
validate_second_b three
```

## Errors and return

During validator registration, `koi::add_validator` returns `0` silently on success. On error, `koi::add_validator` returns `2`, invalidates the entire [registration block](/docs/concepts/lifecycle), and reports an [author error](/docs/reference/glossary#author-error).

During validation, rejections are [user errors](/docs/reference/glossary#user-error) (except in the case of rejected defaults, which are [author errors](/docs/reference/glossary#author-error)). In functions, control flow is handled by the [guarded parse](/docs/concepts/control-flow#the-parsing-boundary-and-required-guard), which returns `2` on any single rejection. In the [root context](/docs/reference/glossary#root-context), [koi::run](/docs/reference/run) handles rejections. Destinations are never assigned on validation rejection, though koi cannot guarantee the lack of arbitrary side effects from custom validators.

| Builtin | Rejection reason |
| --- | --- |
| `--nonempty` | `must not be empty` |
| `--integer` | `must be an integer` |
| `--file` | `must be an existing file` |
| `--directory` | `must be an existing directory` |

For example, `--integer` will reject with `koi: invalid argument 'count': must be an integer`.

Validators do not run when help is requested (for a [leaf](/docs/reference/glossary#leaf), but could potentially run for a [branch](/docs/reference/glossary#branch) depending on the supplied arguments, see [command routing](/docs/concepts/routing)), and constraints are not listed in generated help menus.

## Example

<!-- koi:include validators.sh -->

Running `./validators.sh --count 3 --environment staging` prints:

<!-- koi:include validators.txt -->
