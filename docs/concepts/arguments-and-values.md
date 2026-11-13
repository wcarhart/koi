---
title: "Arguments and values"
description: "The vocabulary and input tokens used by koi."
layout: article
---

> Authoring outline: documentation to be written.

## Arguments and kinds

- TODO: Define argument as the umbrella term for flags, options, and positionals; distinguish a declared argument from an input token.
- TODO: Explain that a flag consumes no additional value and assigns `0` or `1`, an option consumes a value, and a positional consumes a value in declaration order.
- TODO: Distinguish an optional argument from the option kind: flags, options, and positionals can each have requiredness constraints.
- TODO: Explain scalar values and distinguish kind from cardinality. Mark arrays as planned without proposing declaration syntax or behavior.

## Labels, destinations, and display names

- TODO: Use one annotated declaration to distinguish a destination such as `output_file`, its argument labels `-o` and `--output-file`, and its help display name `FILE`.
- TODO: Explain short and long spellings, aliases for the same argument, and why positionals have no argument label.
- TODO: Link terminology to the [glossary](/docs/glossary) and declaration syntax to [__addarg](/docs/reference/addarg).

## Bash tokenization precedes koi

- TODO: Explain that Bash expands and splits the command line before koi receives tokens; koi does not receive or reconstruct the original command-line text.
- TODO: Show how quoting preserves whitespace, empty strings, and literal shell-looking text, and why `"$@"` preserves forwarded argument boundaries while unquoted `$@` and `"$*"` do not.
- TODO: Explain `--` as the end of option recognition and lone `-` as ordinary data. Note that a branch still needs to select a command after the separator.
- TODO: Outline exact option spellings, flags-only short clusters, unsupported equals/attached-value forms, and errors for unknown dash-prefixed tokens.
- TODO: Explain literal option values beginning with `-`, including the automatic `-h`/`--help` exception; link practical examples to [the argument guide](/docs/guides/arguments).
