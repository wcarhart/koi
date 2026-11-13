---
title: "Arguments and values"
description: "The vocabulary and input tokens used by koi."
layout: article
---

An argument is an input you declare with [__addarg](/docs/reference/addarg), such as a flag to enable verbose output or an option to choose an output file. When calling a script or function, Bash also calls each string you pass an _argument_. We'll use _token_ when referring to those individual strings. For example, `--output-file report.txt` is two tokens supplying one declared argument.

> [!NOTE] A note on nomenclature
> The term _argument_ is overloaded and ambiguous in different contexts related to argument parsing. To understand what this and other related terms mean in the context of koi, please take a look at the [glossary](/docs/concepts/glossary).

## Arguments and kinds

Koi supports three argument kinds:

- **Flags** enable or disable a behavior, such as `-v` or `--verbose`. They consume no additional value and assign `1` when present or `0` when absent.
- **Options** take a value after their label, such as `--output-file report.txt`. The next token becomes the option's value.
- **Positionals** take values without labels, such as `source.txt` and `target.txt` in `./copy.sh source.txt target.txt`. Values fill positional slots in the order you register them.

All three kinds are optional by default, and any of them can be made required with `-r`/`--required`. An _option_ is an argument kind, while _optional_ means the caller can omit it. Required positionals must be registered before optional ones, and optional positional slots fill from left to right without skipping.

Optional options and positionals use their declared default when omitted, or an empty string if no default is provided. An explicitly supplied empty string still counts as present. See [parsing and control flow](/docs/concepts/control-flow) for more on presence and defaults.

Currently, each argument writes a single value, called a _scalar_. Repeating an option keeps its last value by default. For example, `--option a --option b --option c` would assign value `c` for a scalar option. Support for array arguments, which would hold multiple values, is planned.

## Labels, destinations, and display names

An argument has a Bash variable to hold its value and, for flags and options, labels the caller uses to supply it. You can also choose how the value appears in help:

```bash
__addarg output_file --option --short o --long output-file --display-name FILE --description 'Write output to a file'
```

Here, `output_file` is the **destination**, the Bash variable koi assigns after successful parsing. After successful parsing, you'd be able to access the assigned value via `$output_file`. `-o` and `--output-file` are **argument labels**, also called _spellings_. They are aliases for the same option, so `-o report.txt` and `--output-file report.txt` both assign `report.txt` to `output_file`.

A short label has one dash and one letter. A long label has two dashes and a name. Flags and options need at least one label, while positionals cannot have either.

`FILE` is the **display name** used in generated help, such as `--output-file FILE`. It changes only the help text. If you omit `--display-name`, koi uses the destination name instead. For example, if you used `__addarg output_file --option --short o --long output-file --description 'Write output to a file'` without `--display-name FILE`, koi would render `[-o OUTPUT-FILE]` in the usage line of the help menu. You can set this to `[-o FILE]` by using `--display-name FILE`.

See [destination variables and scope](/docs/concepts/destinations) for where values are assigned, or the [glossary](/docs/concepts/glossary) for related terms.

## Bash tokenization precedes koi

Bash processes quoting and expansions before koi receives any input. Koi sees the resulting tokens, so quoting at the call site determines which strings it receives:

```bash
./app.sh --output-file 'monthly report.txt'
./app.sh --output-file ''
./app.sh --output-file '$(whoami).txt'
```

The first call supplies a filename containing a space, the second supplies an empty string, and the third supplies the literal text `$(whoami).txt`. Koi preserves these values without evaluating them as shell code.

When forwarding arguments to another function or the parser, use `"$@"` to preserve each token, including empty strings and values containing whitespace:

```bash
main "$@"
```

Unquoted `$@` allows word splitting and filename expansion, while `"$*"` joins the arguments into one string. Neither preserves the original argument boundaries. Koi doesn't require using `"$@"`, but in most cases it's what you want when forwarding a script’s or function’s arguments.

## Recognizing options

Koi matches labels exactly. Supply option values as separate tokens, such as `--output-file report.txt` or `-o report.txt`. Similar argument parsing grammars such as equals forms like `--output-file=report.txt` and attached values like `-oreport.txt` are unsupported.

Short flags can be clustered, so `-vf` is equivalent to `-v -f` when both are registered flags. Every letter must be a flag, including the built-in `-h` for help. An unknown letter or a value-taking option makes the whole cluster invalid. If `-f` in `-vf` was an option, the cluster would fail to parse. Koi does not support _long spellings_ prefixed with a single dash, it will attempt to parse such tokens as a flag cluster.

Options consume the next token even when it starts with a dash. For example, `--output-file -draft.txt` supplies `-draft.txt` as the value. The automatic `-h` and `--help` spellings are exceptions and request help even immediately after an option. `--output-file -h` would still show the help menu, not supply `-h` as the option value. Quoting them does not change that behavior.

Outside an option's value, an unrecognized token beginning with `-` is an error. Use a standalone `--` to end option and flag recognition and supply positional values that start with dashes:

```bash
./copy.sh -- -draft.txt --help
```

Here, `-draft.txt` and `--help` fill positional slots. A lone `-` is ordinary data even without the separator. In a [branch with child commands](/docs/concepts/routing), `--` ends the parent's option recognition, and the next token still selects a command.

For a walkthrough of declaring and using these arguments, see [define flags, options, and positionals](/docs/guides/arguments).
