# Agent guidance

Read `axioms.md` for the API design direction. It describes guiding axioms and capabilities for koi. Preserve the author's edits and keep changes focused on the requested increment.

## Bash function documentation

Follow the comment blocks immediately above functions in `koi`:

- Start with a short, one-line description of what the function does.
- Follow with `# Usage: FUNCTION ...` showing its calling convention.
- List positional parameters and supported options on separate comment lines,
with aligned descriptions. Show short and long aliases together.
- Include option value placeholders in the usage line. Use brackets only for
optional parameters; documentation must match actual requiredness.
- Document `$@` or `$*` when the function accepts forwarded arguments or text.
Use correct quoting in executable examples, such as `function "$@"`.
- Mention meaningful output, side effects, or return statuses briefly when the
calling contract needs them. Avoid long boilerplate or narrating obvious code.
- Keep implementation comments brief, preferably one line, explaining intent or
non-obvious state. Update the comment block when changing the function's API.
- Apply this style to internal helpers as well as public library functions.

Example:

```bash
# Register a command with koi
# Usage: __addcommand NAME -f HANDLER -d DESCRIPTION
#   NAME               the name of the command
#   -f, --function     the command's associated handler function
#   -d, --description  the description of the command
__addcommand() {
    # Implementation goes here.
    :
}
```

## Bash conventions

- Use multiline `if`, `for`, `while`, and `case` blocks. Do not put condition
bodies or case actions on the same line as their condition or pattern.
- Indent function and control-flow bodies with four spaces, matching `koi`.
- Support short and long aliases for declaration options where applicable.
Reserve `-h`/`--help` exclusively for help; internal functions need not implement help but shouldn't use `-h`/`--help` for anything else.
- Keep the sourceable library (`koi`) separate from the CLI (`bin/koi`). 
- Run `./scripts/test` and ShellCheck for relevant Bash changes. Archived code in  
`old/` is reference material, not part of the active test suite.
- Leave changes uncommitted and unpushed unless explicitly instructed otherwise.