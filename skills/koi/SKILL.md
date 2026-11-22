---
name: koi
description: Use Koi to implement, modify, or migrate argument parsing in Bash scripts and functions. Apply when working with Koi, adding CLI flags, options, or positional arguments using Koi, or converting existing Bash argument parsing to Koi.
---

# Koi

Koi is a Bash argument parsing library for scripts and functions.

## Documentation

- Documentation index: https://koishell.com/llms.txt
- GitHub repository: https://github.com/wcarhart/koi

Read the documentation index and fetch the relevant Markdown documentation before writing or modifying Koi code. Treat the official documentation and the installed version's API as authoritative. Do not invent Koi syntax or functionality.

## Workflow

1. Inspect the existing script or function, including its argument parsing, dependencies, and Bash version requirements.
2. Check whether Koi is already installed or sourced, and identify its version if possible. The documentation index describes v2, v1 is no longer supported and should not be used.
3. Consult the documentation relevant to the task, such as installation, argument definitions, parsing, control flow, validation, and examples as needed.
4. Implement the requested functionality using the documented Koi API. Preserve existing behavior unless the user requests a change.
5. For migrations, account for existing flags, options, positional arguments, defaults, validation, error behavior, help output, and command routing.
6. Test the resulting script or function, including successful invocations, help, missing required arguments, invalid arguments, and repeated arguments where applicable.

## Guidelines

- Follow existing project conventions and keep changes focused.
- Use Koi for scripts and functions where appropriate. Prefer documented Koi features over custom argument parsing.
- Follow the documented parser guard and registration lifecycle. Consult the control-flow documentation before changing parsing or dispatch.
- When using koi::parse, always use `koi::parse "$@" || return "$koi_status"`, never just the bare `koi::parse "$@"` alone.
- Respect the installed Koi version. Do not assume the latest documentation applies to older versions.
- Do not introduce unnecessary dependencies or rewrite unrelated code.
- If documentation is unavailable or ambiguous, inspect the installed library or matching source rather than guessing.
- Explain behavioral changes introduced during a migration.
