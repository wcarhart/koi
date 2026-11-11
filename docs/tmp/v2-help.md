# v2 configuration and help

The v2 library requires Bash 5.2 or newer. These APIs describe the current
prototype; the older README examples and archived code use the v1 API.

## Root configuration

Call configuration outside any function, after sourcing koi and before calling
`__koirun` or script-level `__parseargs`:

```bash
source ./koi

__koiconfig name myscript.sh
__koiconfig description 'Manage application deployments'
__koiconfig help-width 100
```

`__koiconfig KEY VALUE` supports:

| Key | Default | Contract |
| --- | --- | --- |
| `name` | Script basename | Nonempty display name for usage, hints, and script-prefixed errors |
| `description` | None | Optional root description; must be nonempty when configured |
| `help-width` | `100` | Positive decimal integer, at most nine digits; applies throughout the script |

Unknown keys, duplicate settings, empty values, function-scope configuration,
and configuration after root consumption are errors. Re-sourcing koi preserves
configuration and the root lifecycle. There is no configuration file or reset API.

Descriptions wrap at word boundaries, with aligned continuations and explicit
line breaks preserved. Long words may exceed the width. Usage stays on one line.
When no root description is configured, help starts with `Usage:`, just as it
does for directly invoked functions without descriptions.

## Function descriptions and registration

Commands already require descriptions through `__addcommand NAME -f HANDLER
-d DESCRIPTION`. The selected command's description leads its help menu,
including when several aliases share one handler.

Use `__adddescription TEXT` for functions intended to be invoked directly,
including functions serving as script entrypoints:

```bash
deploy() {
    local env
    __adddescription 'Deploy an application'
    __addarg env -o -s e -d 'Deployment environment'
    __parseargs "$@" || return "$koi_status"

    printf 'Deploying to %s\n' "$env"
}

deploy "$@"
```

A function description is optional, nonempty when provided, and may be declared
only once per block. It belongs to the uninterrupted registration block alongside
`__addarg` and `__addcommand`. A routed command's registered description takes
precedence over this direct-call fallback. Direct calls without a description
start their help with `Usage:`.

Functions must complete registration with exactly one guarded
`__parseargs "$@" || return "$koi_status"`. Preparation belongs before the block;
business logic belongs after it. Declaration failures invalidate the block even
if their individual return statuses are ignored.

## Branches, leaves, and usage

A context with application children is a branch: it dispatches a selected child,
or shows help successfully if no child is selected. It never continues into its
own business logic. A function without application children is a leaf and
continues after successful parsing. Built-in help does not turn leaves into
branches.

Help has this layout, omitting absent descriptions and empty command sections:

```text
Manage application deployments

Usage: myscript.sh [-h] COMMAND

Commands:
  deploy  Deploy an application
  help    Show this help

Options:
  -h, --help  Show this help
```

Options belong to their current context. All tokens after a child name go to
that child, so the same spelling may independently mean different things at
different levels. Usage puts current-context arguments before `COMMAND` and
never includes `[args]`. Application children require `COMMAND`; a context
offering only built-in help displays `[COMMAND]`.

Help bypasses the current context's required argument checks and assignments.
Ancestor requirements still apply when routing normally to a child's help.
The runner defaults to successful help on a missing command; its existing
`--koi-zero-argument-message MESSAGE` switch requests an error instead.

## Built-in help, hints, and verbose documentation

`__koirun` enables `help` in every routed context, including leaves:

```bash
__koirun     --koi-enable-verbose-help     --koi-enable-help-hints     "$@"
```

| Runner switch | Behavior |
| --- | --- |
| `--koi-disable-help-subcommand` | Disable built-in help throughout the routed tree and permit custom `help` commands |
| `--koi-enable-verbose-help` | Enable root `help --verbose`; off by default |
| `--koi-enable-help-hints` | Append capability-aware hints to ordinary root help; off by default |

`help` and `help -h` / `help --help` show the current context's menu.
Verbose help is root-only. Unsupported help arguments and repeated switches
are errors. Enabling verbose help while disabling built-in help is an error.
When verbose help is unavailable, `--verbose` receives the ordinary unsupported
argument diagnostic.

Root `help` conflicts are checked when the runner consumes registration, after
it knows whether built-in help is disabled. Nested specs use that same policy.
Automatic `-h` / `--help` remain available when the help subcommand is disabled.
Direct function calls outside runner dispatch do not acquire built-in `help`.

Hints appear only at the runner root. They advertise verbose help only when
enabled and individual-command help only when application commands exist.
Verbose output never includes hints.

Verbose help prints root help and then traverses application commands in
preorder, depth first, in registration order. Each handler is invoked once per
CLI entry, so aliases each receive their own menu and full path. Generated help
is not recursively inspected. A repeated handler on the active ancestry causes
a recursion diagnostic; ordinary routing still supports recursive handlers.

## Internal inspection

`--koi-inspect spec` is reserved for library-internal collection. It currently
requires an invocation-matched collector and has no standalone output format.

The walker declares typed local arrays and supplies an internal sink prefix.
At the parsing boundary, koi validates declarations and copies the consumed
spec and effective metadata into those arrays. It skips runtime requiredness,
destination assignments, rendering, and dispatch. The parser sets
`koi_status=0` and returns `1`, activating the existing caller guard. The runner
can also deliver its root spec to an internal collector and return `0`.

Collectors match the expected handler and call depth; preparation helpers and
recursive direct calls cannot steal another invocation's collection. A handler
that returns without reaching parsing, or fails inspection, stops verbose help
with an error. Already printed menus remain available.

Inspection executes preparation and registration code. Such code can print or
have external side effects, and specs must be discoverable without required
argument values. Guarded parsing is still necessary to prevent business logic
from running.

All internal consumers use Bash arrays directly. There is no JSON serializer,
deserializer, external transport protocol, persistent spec cache, or additional
runtime dependency. External inspection and CLI output formats are deferred to
the future `koi inspect` implementation.
