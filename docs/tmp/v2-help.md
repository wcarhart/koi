# v2 configuration and help

The v2 library requires Bash 5.2 or newer. These APIs describe the current
prototype; the older README examples and archived code use the v1 API.

## Supported entrypoints and function calls

Use one of these patterns:

1. Register commands at script scope, define their handler functions, and call
   `__koirun "$@"` as the entrypoint. Each handler registers its own arguments
   and children, then uses guarded `__parseargs`.
2. Call an application function directly, such as `main "$@"`, without a runner.
   Put its declarations and guarded `__parseargs` inside that function.
3. Call parsing functions from other functions with ordinary Bash arguments.
   These functions need not be registered as CLI commands; each owns its own
   declarations, local destinations, and parser guard.

`__parseargs` is supported only inside application functions. Calling it at top
level, including in a file sourced at script scope, returns 2, sets
`koi_status=2`, and prints an error without consuming root registration or
assigning destinations. Help and inspection do not bypass this restriction.
A later `__koirun` can still consume the intact root registrations.

Root declarations belong exclusively to `__koirun`. Moving only `__parseargs`
into a function does not move root declarations into that function's interface.
Script-scope sourced declarations remain root declarations; files sourced inside
an application function contribute to that function's registration block.

Inside functions, always use `__parseargs "$@" || return "$koi_status"` so help,
dispatch, and errors stop local business logic. This returns from the function
without terminating a sourcing shell. Sourced entrypoints must likewise return
status to their caller rather than use `exit` to handle parser outcomes. Root
configuration stays outside functions and precedes the selected entrypoint.

## Root configuration

Call configuration outside any function, after sourcing koi and before calling
`__koirun` or the application entrypoint function:

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

## Scalar positional arguments

`__addarg DEST` requires exactly one kind: `-f` / `--flag`, `-o` / `--option`,
or `-p` / `--positional`. Repeating or combining kind selectors is an error.
Flags and options require at least one spelling (`-s` / `--short` or
`-l` / `--long`); positionals reject both spelling parameters.

```bash
copy_file() {
    local source destination verbose
    __adddescription 'Print a mock copy operation'
    __addarg source -p -r -d 'Source file'
    __addarg verbose -f -s v -d 'Print progress'
    __addarg destination -p -D . -n directory -d 'Destination directory'
    __parseargs "$@" || return "$koi_status"

    printf 'source=%q destination=%q verbose=%s\n' "$source" "$destination" "$verbose"
}
```

Positionals consume one token each, in their declaration order; interspersed
flag/option declarations do not affect that order. They are optional unless
`-r` / `--required` is supplied. All required positionals must precede all
optional positionals. Multiple trailing optional positionals are supported and
fill left to right without implicit skipping.

Optional positionals accept `-D` / `--default`, including `''`; required
positionals reject defaults. Omitted values replace stale destination contents
with the default or `''`. An explicit empty token fills a slot and satisfies
requiredness. `-n` / `--display-name` supplies a nonempty help label, falling
back to the destination; labels are uppercased in usage and the help table.

Options may appear between positional values: `copy_file source.txt -v out`
assigns `source.txt` and `out` to the positionals. Option values do not consume
positional slots. Unknown dash-prefixed tokens are errors; use `--` to pass
negative numbers or other dash-prefixed positional values. A lone `-` is
ordinary data. After the separator, help flags and koi settings are literal:
`copy_file -- --help` uses `--help` as the source. A separator consumed as a
named option's value does not end option recognition.

Missing required values, excess values, and incompatible destinations fail
without assigning any destinations. Empty strings, whitespace, newlines,
quotes, backslashes, shell-looking text, and values equal to destination names
are preserved literally. Before `--`, help still overrides input errors and
requiredness without assigning destinations, including when encountered as an
apparent named option value.

Positionals are valid only in terminal contexts: a completed registration block
cannot declare both positionals and application child commands. This is checked
before help or inspection, regardless of declaration order. An author-defined
`help` child is an application command for this rule.

The same positional contract applies to direct functions, routed leaves, and
terminal roots consumed by `__koirun`. A terminal runner returns 0 after
successful assignment, including no-input parsing when
all positionals are optional, or 2 on error. Its command-only settings
`--koi-zero-argument-message` and `--koi-enable-help-on-unknown-commands` have no
effect in a positional root. Roots without positionals retain their existing
runner behavior and one-use lifecycle. The runner also returns 0 for help; use
the guarded `__parseargs` pattern when business logic must run after parsing
and stop automatically on help, as in the example above.

Help usage puts options first and positionals last, for example
`Usage: app [-h] [-v] SOURCE [DIRECTORY]`. The `Options:` section retains
automatic help; a separate `Positionals:` section lists positionals in order,
including required/default annotations. Empty sections are omitted.

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

Options belong to their current context. In branches, the first bare token
selects the child after any preceding options. All tokens after a child name go
to that child, so the same spelling may independently mean different things at
different levels. Usage puts current-context arguments before `COMMAND` and
never includes `[args]`. Branches display `COMMAND`; leaves have no command
placeholder, even when they declare no positionals.

Help bypasses the current context's required argument checks and assignments.
Ancestor requirements still apply when routing normally to a child's help.
In branches, `--` still permits child selection and affects only the parent
parser; the child starts with normal option recognition.
The runner defaults to successful help on a missing command; its existing
`--koi-zero-argument-message MESSAGE` switch requests an error instead.

## Built-in help, hints, and verbose documentation

`__koirun` enables `help` only in branches with author-registered child
commands, including at the root:

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

A context receives free `help` only when runner policy enables it and it has
at least one author-registered child command. This applies at every depth,
including the root. Leaves never receive a help subcommand, whether they declare
positionals, options, flags, or nothing. A leaf's help menu omits the `Commands:`
section and has no command placeholder in usage. There is no force-enable
override. Direct functions outside routing do not acquire free help.

On positional leaves, bare `help` is ordinary positional data. On other leaves
it is unsupported input. Automatic `-h` / `--help` remain available everywhere.
Author-defined commands count toward branch status, including a custom `help`;
custom help commands still require disabling the built-in help subcommand.

A root without application children accepts `--koi-enable-verbose-help` but
suppresses `help --verbose` and related hints. The explicit combination of
verbose help with `--koi-disable-help-subcommand` remains an error. Root verbose
traversal on a command tree still documents every descendant, without adding
help subcommands to leaves.

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
