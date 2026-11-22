# Koi

> Koi is a Bash-native argument parsing library for scripts and functions. Define flags, options, positional arguments, and commands; access parsed values through ordinary Bash variables; and get built-in validation and generated help.

These documents describe Koi v2, which requires Bash 5.2 or newer. Koi v1 uses a different API and is no longer supported. Check the installed Koi version before using these instructions, and preserve existing behavior when migrating scripts.

Read the relevant Markdown pages before writing code. Follow the documented registration lifecycle and control-flow requirements. When calling koi::parse inside a function, always use the documented parser guard (`koi::parse "$@" || return "$koi_status"`). For command applications (e.g. a full CLI), follow the documented koi::run pattern.

## Optional

- [GitHub repository](https://github.com/wcarhart/koi): Source code, releases, and issue tracking.
- [Koi skill](https://koishell.com/skill.md): Portable Agent Skills instructions for implementing or migrating koi argument parsing.
- [Agent setup](https://koishell.com/agents.md): Copyable project prompt and skill installation.
- [Complete documentation](https://koishell.com/llms-full.txt): All koi v2 documentation in one Markdown file.
