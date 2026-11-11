# Koi v2 manual examples

Run these commands from the repository root with **Bash 5.2 or newer** available
as `bash` on your `PATH`. The scripts are executable and load `koi` relative to
their own location, so absolute paths work from another directory too.

Every operation prints values or mock actions. Nothing is deployed, no tools
are launched, and no network connections are made.

| Script | Try it for |
| --- | --- |
| [positionals.sh](positionals.sh) | Required and optional positionals, interleaved options, literal help values, and guarded parsing |
| [arguments.sh](arguments.sh) | Scalar options, required values, defaults, literal text, flags, and duplicate checking |
| [root-parser.sh](root-parser.sh) | Parsing at script level without a runner or description |
| [commands.sh](commands.sh) | Nested commands, aliases, configuration, wrapping, hints, and verbose help |
| [direct-calls.sh](direct-calls.sh) | Independent helper contexts, local variables, repeated calls, and fresh defaults |
| [help-defaults.sh](help-defaults.sh) | Default help commands with hints and verbose help disabled |
| [custom-help.sh](custom-help.sh) | Replacing help commands while preserving automatic help flags |
| [runner-errors.sh](runner-errors.sh) | No-command errors and the optional unknown-command help fallback |

Commands below succeed with exit status **0** unless labeled otherwise.
After an expected failure, `echo "$?"` shows its status. These failure examples
should be run individually if your shell uses `set -e`.

## Scalar positionals

```bash
./docs/tmp/examples/positionals.sh --help
./docs/tmp/examples/positionals.sh source.txt
./docs/tmp/examples/positionals.sh source.txt -v output
./docs/tmp/examples/positionals.sh help
./docs/tmp/examples/positionals.sh -- --help
./docs/tmp/examples/positionals.sh '' output
```

The source is required; the destination defaults to `.`. Bare `help` is a source
value because leaves never receive the built-in help subcommand.
Help flags still work before `--`. Missing or excess positionals exit with 2.

## Scalar options and flags

```bash
./docs/tmp/examples/arguments.sh --help
./docs/tmp/examples/arguments.sh -n Ada
./docs/tmp/examples/arguments.sh --name Ada --environment production -vq
./docs/tmp/examples/arguments.sh -n Ada -m 'two words, "quotes", $HOME, and $(literal)'
./docs/tmp/examples/arguments.sh -n '' -m $'first line\nsecond line'
./docs/tmp/examples/arguments.sh -n first -n last
./docs/tmp/examples/arguments.sh -n Ada --
```

The first normal call prints `name=Ada`, `environment=development`, an empty
message, and zero-valued flags. `-vq` enables both flags. Values use Bash's
`printf %q` representation so empty strings and newlines are visible.
Repeated scalar values normally keep the last occurrence.

```bash
# Exit 2: missing required name.
./docs/tmp/examples/arguments.sh

# Exit 2: missing value for -n.
./docs/tmp/examples/arguments.sh -n

# Exit 2: unknown option.
./docs/tmp/examples/arguments.sh -n Ada --unknown

# Exit 2: enable rejection of repeated destinations.
./docs/tmp/examples/arguments.sh --koi-error-on-duplicates -n first -n last

# Exit 2: tokens after -- are positional data, which v2 does not support yet.
./docs/tmp/examples/arguments.sh -n Ada -- --verbose
```

Help skips required-value checks and business logic. The `ENV` and `TEXT`
labels in the synopsis come from custom display names.

## Script-level parsing

```bash
./docs/tmp/examples/root-parser.sh
./docs/tmp/examples/root-parser.sh -m apply -v
./docs/tmp/examples/root-parser.sh --help
```

The default output is `mode=preview` and `verbose=0`. Help starts with
`Usage:` because the script has no description. It uses a script-level
`__parseargs` exit guard and no `__koirun`, so it has no built-in help command:

```bash
# Exit 2: help is not a registered command or a supported positional.
./docs/tmp/examples/root-parser.sh help
```

## Nested commands, aliases, and configured help

```bash
./docs/tmp/examples/commands.sh
./docs/tmp/examples/commands.sh --help
./docs/tmp/examples/commands.sh help
./docs/tmp/examples/commands.sh help --verbose
./docs/tmp/examples/commands.sh deploy
./docs/tmp/examples/commands.sh deploy help
./docs/tmp/examples/commands.sh deploy app --help
./docs/tmp/examples/commands.sh deploy database
./docs/tmp/examples/commands.sh deploy database migrate help
./docs/tmp/examples/commands.sh deploy database migrate -t 2026_11
./docs/tmp/examples/commands.sh status --help
./docs/tmp/examples/commands.sh inspect --help
./docs/tmp/examples/commands.sh status -f detailed
```

The configured name `deploy-demo` appears in usage and hints; invoke the actual
script path shown above. The help width is 72 columns. Root hints advertise
verbose and individual-command help. Hints do not appear in nested menus or
verbose output.

Branches such as `deploy` and `deploy database` show help when no child is
selected. Leaf operations print lines beginning `Would`. Verbose help prints
root help and then each command's menu in depth-first registration order,
including both `status` and `inspect`, without printing any `Would` actions.
Those two commands share a handler, but retain their alias names and descriptions.

Each context independently owns its options. Here `-e` means root profile,
deployment environment, and application revision at successive levels:

```bash
./docs/tmp/examples/commands.sh -e local deploy -e production app -n web -e stable -d
```

This prints a mock deployment with profile `local`, environment `production`,
name `web`, revision `stable`, and `dry_run=1`. Options must precede the next
child selection when they belong to its parent; nothing is a global option.
Usage lists the current context's options followed by `COMMAND`, without
an `[args]` suffix.

```bash
# Exit 2: app requires its own -n value.
./docs/tmp/examples/commands.sh deploy app

# Exit 2: -n is an app option, not a deploy option.
./docs/tmp/examples/commands.sh deploy -n web app

# Exit 2: verbose help is available only on the root help command.
./docs/tmp/examples/commands.sh deploy help --verbose
```

## Repeated direct calls and local scope

```bash
./docs/tmp/examples/direct-calls.sh --help
./docs/tmp/examples/direct-calls.sh
./docs/tmp/examples/direct-calls.sh -m custom -v
./docs/tmp/examples/direct-calls.sh -m custom -v -H
```

Compare the `caller before` and `caller after` lines: both preserve the same
mode and verbosity. Helper calls print `first/1`, `safe/0`, and `last/0`
for mode/verbosity. The second call gets fresh defaults rather than retaining
the previous values. `-H` inserts a direct helper help menu between normal
calls; help returns successfully and later helper parsing still works.

## Default help policy

```bash
./docs/tmp/examples/help-defaults.sh
./docs/tmp/examples/help-defaults.sh -h
./docs/tmp/examples/help-defaults.sh help
./docs/tmp/examples/help-defaults.sh greet
./docs/tmp/examples/help-defaults.sh greet -n Ada
./docs/tmp/examples/help-defaults.sh greet --help
```

Root help starts with `Usage:` without a description. There are no hints.
The root receives built-in `help` because it has an application child. The
`greet` leaf uses `-h` / `--help` and runs normally with no arguments, printing
`Hello, world!`. Leaves never receive a free help subcommand.

```bash
# Exit 2: leaves do not have a help subcommand.
./docs/tmp/examples/help-defaults.sh greet help

# Exit 2: verbose help is disabled, so --verbose is an unsupported argument.
./docs/tmp/examples/help-defaults.sh help --verbose

# Exit 2: unknown commands do not fall back to help by default.
./docs/tmp/examples/help-defaults.sh unknown --help
```

## Custom help commands

```bash
./docs/tmp/examples/custom-help.sh --help
./docs/tmp/examples/custom-help.sh help
./docs/tmp/examples/custom-help.sh help -t deployment
./docs/tmp/examples/custom-help.sh help --help
./docs/tmp/examples/custom-help.sh tools
./docs/tmp/examples/custom-help.sh tools help -t maintenance
./docs/tmp/examples/custom-help.sh tools help --help
./docs/tmp/examples/custom-help.sh tools run
./docs/tmp/examples/custom-help.sh tools run --help
```

Built-in help subcommands are disabled, allowing application-defined `help`
commands at both levels. They print `Custom guidance` with an optional topic.
Automatic `-h` and `--help` remain available; they show koi's generated menus
instead of executing the custom guidance. The mock `tools run` leaf still works.

## Runner error policy

```bash
./docs/tmp/examples/runner-errors.sh --help
./docs/tmp/examples/runner-errors.sh help
./docs/tmp/examples/runner-errors.sh ping
./docs/tmp/examples/runner-errors.sh ping -n demo
./docs/tmp/examples/runner-errors.sh unknown --help
```

The final call succeeds and prints root help because this script enables
`--koi-enable-help-on-unknown-commands`. This differs from the default-help
example above.

```bash
# Exit 2 with the configured "Choose a command" message.
./docs/tmp/examples/runner-errors.sh

# Exit 2: unknown command without a help request.
./docs/tmp/examples/runner-errors.sh unknown

# Exit 2: -- stops recognition of the later --help request.
./docs/tmp/examples/runner-errors.sh unknown -- --help
```

## Current boundaries and checks

See [the v2 API documentation](../v2-help.md) for the registration contract.
Every function uses an uninterrupted registration block and a guarded parser
call. Do not copy the v1 APIs from `old/` into these examples.

Array arguments, validators, dependencies, and groups are not
implemented in the current v2 prototype. Inspection currently serves
library-internal verbose traversal; there is no standalone spec output or
`koi inspect` interface to demonstrate.

To check these scripts from the repository root:

```bash
for example in docs/tmp/examples/*.sh; do
    bash -n "$example" || break
done
shellcheck -x --source-path=SCRIPTDIR docs/tmp/examples/*.sh
./scripts/test
```
