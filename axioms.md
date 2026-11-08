# Koi v2: guiding principles

This document records the revival design discussion. It describes intended v2
behavior, not capabilities already implemented. API axioms below are the agreed
foundation. Proposed spellings, implementation mechanisms, and provisional
packaging choices remain open to further design.

## Purpose and scope

Koi is a Bash-native argument parser inspired by Python's argparse. Authors
declare an argument interface and receive parsed values in ordinary Bash
variables, with validation and formatted help supplied by the library.

The revival is a breaking major release, targeting v2. It includes parser
redesign and bug fixes, rather than only modernization of the existing code.

## API axioms

### 1. Commands require explicit registration

- `__addcommand` exposes a function as an immediate child of the current command
  context. Exact parameters remain to be designed.
- Do not discover commands from ambient shell functions using `declare -F`.
- Only registered commands may be listed or dispatched through CLI routing.
  Unregistered helpers remain ordinary functions regardless of their names.
- Root commands are registered at script scope. A command registers its own
  children inside its function, before parsing.
- Support arbitrary command depth without a small fixed library limit, subject
  to Bash's practical resource and recursion limits.
- Each command can define its own arguments, help, and children.

### 2. Argument specs live inside their owning functions

- Keep `__addarg` declarations close to business logic inside the function that
  consumes the arguments.
- Build the spec just in time by executing those declarations. Do not require
  a separately maintained global argument spec or separate spec function.
- Functions should carry their argument interfaces with them when moved or
  reused. This does not eliminate their ordinary application dependencies.
- Registration describes the interface; business operations belong after
  successful parsing and its control-flow guard.

### 3. Discover the command tree incrementally

- At a given command context, koi knows its registered immediate children.
  Descendants become known when their owning functions execute registrations.
- Retain ancestor contexts and the full traversed path for routing and usage
  text; do not confuse incremental discovery with forgetting ancestors.
- For `script a b c`, the proposed route is runner -> `a` -> its parser -> `b`
  -> its parser -> `c` -> its parser.
- Complete recursive help or inspection requires visiting registered branches;
  koi cannot infer an arbitrary runtime spec from function source alone.

### 4. Parsing requires an explicit caller-side guard

- `__parseargs` parses the current function's spec and participates in child
  dispatch. Its call must include the supported guard that returns from the
  owning function when execution must stop there.
- Distinguish continuing into local business logic, completing help, returning
  from child dispatch, and reporting a parsing error.
- Help completes successfully. Child dispatch preserves the child's exit status.
  Selecting a child must not also run the parent's default business logic.
- An ordinary helper function cannot return from its caller. Moving the guard
  into another function does not remove this requirement.
- Exact guard syntax and the representation of outcome versus exit status are
  unresolved. `__parseargs "$@" || return "$koi_status"` is illustrative, not a
  finalized API. A bare `|| return $?` cannot express successful early completion
  unless the outcome protocol explicitly provides for it.
- Teach the guard prominently in human and agent documentation, examples, and
  templates. Unguarded parsing is unsupported and should be diagnosed by tooling.
- Koi must not depend on `set -e` for internal error propagation. The effect of
  conditional calls on Bash's `errexit`, including child dispatch from a guarded
  parser, needs explicit design, documentation, and verification.

### 5. Help is built in

- Provide `-h` and `--help` automatically; authors must not need to remember a
  special `__addarg` help declaration.
- Command registration supplies enough metadata for ordinary parent help to
  list immediate command names and descriptions without invoking the children.
- Detailed command help enters the selected function to build its local spec,
  then stops at the parsing boundary. Comprehensive help may visit all commands.
- Help does not require otherwise-required arguments and must not proceed into
  business logic after parsing.
- Code before the parsing boundary still executes during detailed help. Neither
  inspection mode nor a subshell prevents its external side effects.
- Help conflicts, opt-outs, and exact metadata parameters remain to be designed.

### 6. Functions can parse arguments without being CLI commands

- `__addcommand` controls CLI exposure, not eligibility to use the parser.
- A function may call another koi-powered function directly with flags, options,
  and positional arguments. The callee registers and parses its own interface.
- Direct function calls do not require command registration or runner wrappers.
- Isolate koi's spec, presence tracking, results bookkeeping, and routing state
  per invocation. Support repeated calls, nested calls, and recursion without
  leaking registrations or stale values between invocations.
- Completing a parse must leave subsequent independent registration usable.
  Shared mutable global registration arrays are not an acceptable isolation model.

### 7. Authors control destination variable scope

- Assign parsed values to ordinary Bash variables. Recommend caller-declared
  locals, but do not require them: intentional global destinations are valid.
- Respect Bash's dynamic scope: an assignment can reach a visible local in an
  ancestor function; without such a local it can reach global scope.
- Each function must declare its own locals when isolation from an ancestor's
  same-named variables is intended.
- Koi internals must use a consistent reserved namespace and validate destination
  names so internal locals cannot silently capture user assignments.
- Keep CLI spelling separate from destination identity. Support hyphens and
  underscores in CLI names while requiring valid Bash destination identifiers.
  Inference, explicit overrides, and collision rules remain to be finalized.

### 8. Sourcing is a supported library use case

- Support sourcing from a supported Bash interpreter, including functions whose
  intended business operations change the caller's directory or environment.
- Do not change the caller's shell options merely by sourcing koi.
- Do not terminate the sourcing shell to implement help or routine parser errors.
- Do not require subshell execution for business logic: its shell changes would
  be lost. A shebang does not change the interpreter of sourced code.

## First-party authoring CLI

Keep the `koi` authoring CLI and sourceable library in separate files from the
start. The CLI loads and depends on the library; never combine their distributions
into one file. A single Homebrew formula installs both. Once argument parsing is
available, the CLI will use koi's own command and argument APIs; interpreter checks
remain a bootstrap step.

### Static checking

- Accept a script path and analyze it without sourcing or executing the script.
- Diagnose bare `__parseargs` calls and incorrect guards where statically
  recognizable; add useful registration and API diagnostics over time.
- Use Bash syntax-aware analysis. Do not present regex matching as a complete
  Bash analyzer. The parser/tool dependency choice is unresolved.
- Report what cannot be established statically. Computed declarations,
  conditionals, indirect calls, and sourced files prevent general completeness.
- Static checking assists authors; it cannot guarantee safe runtime behavior.

### Spec inspection and debugging

- Provide insight into a command/function's effective spec and parser decisions.
  `__dumpspec` is a working name, not a settled spelling.
- Keep runtime introspection available from the library so internal functions can
  inspect their actual invocation context, not only CLI-reachable commands.
- Let the CLI expose that capability through a defined inspection protocol.
- Clearly distinguish static reports from runtime inspection. Effective JIT spec
  inspection executes registrations and may execute top-level or pre-parse code.
  It is not passive analysis or a security sandbox.
- Command selection, traversal, output formats, tracing, and value redaction need
  further design. Debug output should not accidentally expose argument secrets.

## Functional requirements to carry forward

- Preserve flags, scalar options, repeatable array options, scalar positionals,
  positional arrays, defaults, validators, groups, and option dependencies.
- Existing group behaviors include XOR, OR, and AND, with optional/required
  constraints; do not accidentally drop these while redesigning the API.
- Support the `--` end-of-options marker and names containing `-` or `_`.
- Preserve argument boundaries and literal values, including empty strings,
  whitespace, newlines, quotes, backslashes, and shell-looking text.
- Replace value-interpolating `eval` assignments. Track presence separately from
  value so empty values and stale variables do not determine requiredness.
- Resolve parsing semantics deliberately: short clusters, equals forms, repeated
  scalars, dash-prefixed values, positional cardinality, and parent option
  inheritance are still design work.

Required regression cases include:

- [#62](https://github.com/wcarhart/koi/issues/62): positional values colliding
  with positional argument names.
- [#64](https://github.com/wcarhart/koi/issues/64): sourced-script behavior,
  interpreter assumptions, and caller-safe control flow. The report's exact
  interpreter-related cause has not been conclusively established.
- [#65](https://github.com/wcarhart/koi/issues/65): ambient/exported functions
  polluting command discovery. Explicit registration removes that mechanism.

## Repository, distribution, and documentation

The following records project goals and provisional recommendations. These
choices have less design consensus than the API axioms and may change.

### Established project goals

- Keep a single sourceable `koi` runtime file available for manual download and
  local vendoring. Running consumer scripts must not require developer tooling.
- Bring installation assets into this repository. If Homebrew remains supported,
  maintain its formula/tap here rather than in the deprecated tools repository.
- Bring all documentation source into this repository, authored in Markdown and
  built as a static site so library and documentation changes move together.
- Target `koishell.com` for the new documentation site, likely through Netlify.
  The broader site migration to `old.willcarhart.dev` is a separate deployment
  concern, not work performed by this document.
- Drop Bash 3.2 support in favor of modern Bash, including associative arrays.
- Require no `~/.koirc`. Prefer script-contained, explicit configuration; remove
  automatic user-file loading from the proposed runtime model.
- Modernize the tests and verify caller scope, literal-value preservation,
  repeated/nested parsing, help, dispatch, and sourced-shell behavior.

### Provisional recommendations, not final decisions

- Bash 5.2+ as the minimum; confirm supported platforms before freezing it.
- A clean v2 migration guide rather than pervasive v1 compatibility branches.
- Version-pinned single-file release downloads with checksums and embedded
  version/license information as the primary installation path.
- Homebrew as a secondary convenience, with `Formula/koi.rb` here and a custom
  remote tap pointing at this repository. Source-path layout and release/formula
  update mechanics still need design.
- Astro Starlight for the static Markdown documentation site, with build and
  Netlify configuration here; retain labeled v1 reference documentation.
- Bats-core to replace the custom test harness, with Bash fixtures and specific
  status/output assertions. Additional generated/property tests may be useful.
- Named declaration parameters instead of mandatory blank positional fields.
  The exact `__addarg` and `__addcommand` signatures are not settled.
- Explicit parser configuration for name, description, help formatting, and color
  rather than a collection of loosely related globals. Names and defaults remain
  open. Retain a koi-specific internal namespace.

## Next design decisions

1. Specify the guard/outcome protocol, child status propagation, and command
   context lifecycle, including the implications for `errexit`.
2. Specify declaration signatures, destinations, command metadata, automatic help,
   and configuration without expanding the API unnecessarily.
3. Define token semantics and parent/child option scope and inheritance.
4. Design per-invocation state isolation for CLI dispatch and direct calls.
5. Define static-check coverage and the runtime inspection protocol before
   selecting CLI implementation dependencies.
6. Confirm Bash baseline, test tooling, installation paths, docs generator, and
   release process.
