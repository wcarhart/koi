#!/usr/bin/env bats
# Real script files make Bash source locations independent of eval-based scenarios.
# shellcheck disable=SC2016
bats_require_minimum_version 1.5.0

setup() {
    export KOI_LIBRARY="$BATS_TEST_DIRNAME/../koi"
    app="$BATS_TEST_TMPDIR/app script.sh"
}

# Assert a failed application reports exactly one diagnostic and location
# Usage: assert_location MESSAGE LOCATION
#   MESSAGE   full first diagnostic line
#   LOCATION  file:line and optional calling function
assert_location() {
    [ "$status" -eq 2 ]
    [ -z "$output" ]
    [ "$stderr" = "$1"$'\n  at '"$2" ]
}

@test "author errors include top-level locations by default" {
    cat > "$app" <<'BASH'
source "$KOI_LIBRARY"
koi::add_arg
BASH
    run --separate-stderr bash -eu "$app"
    assert_location 'koi: koi::add_arg: destination required' "$app:2"
}

@test "locations preserve relative source paths" {
    cat > "$app" <<'BASH'
source "$KOI_LIBRARY"
koi::add_arg
BASH
    run --separate-stderr bash -euc 'cd "$1"; bash -eu "./app script.sh"' app "$BATS_TEST_TMPDIR"
    assert_location 'koi: koi::add_arg: destination required' './app script.sh:2'
}

@test "declaration validation skips internal helpers and preserves a function named main" {
    cat > "$app" <<'BASH'
source "$KOI_LIBRARY"
main() {
    koi::add_arg __koi_bad -p -d Bad
}
main
BASH
    run --separate-stderr bash -eu "$app"
    assert_location "koi: koi::add_arg: invalid destination: '__koi_bad'" "$app:3 (main)"
}

@test "sourced declarations use their own file and omit the source pseudo-function" {
    local declarations="$BATS_TEST_TMPDIR/declarations with spaces.sh"
    cat > "$declarations" <<'BASH'
koi::add_arg
BASH
    cat > "$app" <<'BASH'
source "$KOI_LIBRARY"
source "$1"
BASH
    run --separate-stderr bash -eu "$app" "$declarations"
    assert_location 'koi: koi::add_arg: destination required' "$declarations:1"
}

@test "functions defined in sourced files retain their source locations" {
    local declarations="$BATS_TEST_TMPDIR/commands with spaces.sh"
    cat > "$declarations" <<'BASH'
deploy() {
    koi::add_arg
}
BASH
    cat > "$app" <<'BASH'
source "$KOI_LIBRARY"
source "$1"
deploy
BASH
    run --separate-stderr bash -eu "$app" "$declarations"
    assert_location 'koi: koi::add_arg: destination required' "$declarations:2 (deploy)"
}

@test "nested routed declarations report the leaf call instead of ancestor dispatch" {
    cat > "$app" <<'BASH'
source "$KOI_LIBRARY"
leaf() {
    koi::add_arg
}
branch() {
    koi::add_command leaf -f leaf -d Leaf
    koi::parse "$@" || return "$koi_status"
}
koi::add_command branch -f branch -d Branch
koi::run branch leaf
BASH
    run --separate-stderr bash -eu "$app"
    assert_location 'koi: koi::add_arg: destination required' "$app:3 (leaf)"
}

@test "deferred errors use the actual parse frame even when the message names a declaration API" {
    cat > "$app" <<'BASH'
source "$KOI_LIBRARY"
leaf() {
    local value
    koi::add_arg value -o -l value -d Value
    koi::add_validator value -f missing_callback
    koi::parse "$@" || return "$koi_status"
}
leaf --help
BASH
    run --separate-stderr bash -eu "$app"
    assert_location "koi: koi::add_validator: argument 'value': callback 'missing_callback' is not a Bash function" "$app:6 (leaf)"
}

@test "deferred root errors report the run call" {
    cat > "$app" <<'BASH'
source "$KOI_LIBRARY"
koi::add_command child -f missing_handler -d Child
koi::run --help
BASH
    run --separate-stderr bash -eu "$app"
    assert_location "koi: koi::run: missing handler 'missing_handler' for command 'child'" "$app:3"
}

@test "explicit location policy applies to root direct and routed author errors" {
    cat > "$app" <<'BASH'
source "$KOI_LIBRARY"
koi::config author-error-location "$1"
leaf() {
    koi::add_arg
}
case $2 in
    root)
        koi::add_arg
        ;;
    direct)
        leaf
        ;;
    routed)
        koi::add_command leaf -f leaf -d Leaf
        koi::run leaf
        ;;
esac
BASH
    local policy mode location
    for policy in true false; do
        for mode in root direct routed; do
            run --separate-stderr bash -eu "$app" "$policy" "$mode"
            if [[ $policy == true ]]; then
                location="$app:4 (leaf)"
                if [[ $mode == root ]]; then
                    location="$app:8"
                fi
                assert_location 'koi: koi::add_arg: destination required' "$location"
            else
                [ "$status" -eq 2 ]
                [ -z "$output" ]
                [ "$stderr" = 'koi: koi::add_arg: destination required' ]
            fi
        done
    done
}

@test "rejected settings preserve the effective policy and re-sourcing preserves the opt-out" {
    cat > "$app" <<'BASH'
source "$KOI_LIBRARY"
koi::config author-error-location false
source "$KOI_LIBRARY"
koi::config author-error-location true || :
koi::config author-error-location invalid || :
leaf() {
    koi::config author-error-location true || :
    koi::parse || return "$koi_status"
}
leaf || :
koi::add_arg
BASH
    run --separate-stderr bash -eu "$app"
    [ "$status" -eq 2 ]
    [ -z "$output" ]
    [ "$stderr" = "koi: koi::config: repeated config key: author-error-location
koi: koi::config: author-error-location must be true or false
koi: koi::config: script-only config key: author-error-location
koi: koi::add_arg: destination required" ]
}

@test "invalid configuration uses the default location and does not change it" {
    cat > "$app" <<'BASH'
source "$KOI_LIBRARY"
koi::config author-error-location invalid || :
koi::add_arg
BASH
    run --separate-stderr bash -eu "$app"
    [ "$status" -eq 2 ]
    [ -z "$output" ]
    [ "$stderr" = "koi: koi::config: author-error-location must be true or false
  at $app:2
koi: koi::add_arg: destination required
  at $app:3" ]
}

@test "user errors stay single-line with either location policy" {
    cat > "$app" <<'BASH'
source "$KOI_LIBRARY"
koi::config author-error-location "$1"
koi::config name app
leaf() {
    local value
    koi::add_arg value -p -r -d Value
    koi::parse || return "$koi_status"
}
leaf
BASH
    local policy
    for policy in true false; do
        run --separate-stderr bash -eu "$app" "$policy"
        [ "$status" -eq 2 ]
        [ -z "$output" ]
        [ "$stderr" = "app: missing required argument: 'value'" ]
    done
}

@test "author diagnostics preserve literal format characters and shell-looking text" {
    cat > "$app" <<'BASH'
source "$KOI_LIBRARY"
koi::add_command child "$1"
BASH
    local text=$'literal %s\n$(false)'
    run --separate-stderr bash -eu "$app" "$text"
    assert_location "koi: koi::add_command: unknown registration parameter: $text" "$app:2"
}

@test "unavailable source files and absent public API frames omit locations" {
    run --separate-stderr bash -euc 'source "$KOI_LIBRARY"; koi::add_arg'
    [ "$status" -eq 2 ]
    [ "$stderr" = 'koi: koi::add_arg: destination required' ]
    cat > "$app" <<'BASH'
source "$KOI_LIBRARY"
koi::internal::author_error koi::add_arg 'literal %s'
BASH
    run --separate-stderr bash -eu "$app"
    [ "$status" -eq 2 ]
    [ "$stderr" = 'koi: koi::add_arg: literal %s' ]
}

@test "reporting preserves shell options traps and caller-safe control flow" {
    cat > "$app" <<'BASH'
source "$KOI_LIBRARY"
trap ':' EXIT
before_options=$(set +o)
before_traps=$(trap -p)
if koi::add_arg; then
    exit 9
else
    result=$?
fi
[[ $result == 2 && $(set +o) == "$before_options" && $(trap -p) == "$before_traps" ]]
printf 'survived\n'
BASH
    run --separate-stderr bash -eu "$app"
    [ "$status" -eq 0 ]
    [ "$output" = survived ]
    [ "$stderr" = "koi: koi::add_arg: destination required"$'\n  at '"$app:5" ]
}
