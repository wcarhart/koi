#!/usr/bin/env bats
# Child Bash processes evaluate the snippets with a genuine top-level caller.
# shellcheck disable=SC2016

bats_require_minimum_version 1.5.0

setup() {
    export KOI_LIBRARY="$BATS_TEST_DIRNAME/../koi"
}

@test "executed and sourced top-level parsing rejects requests and preserves root state" {
    cat > "$BATS_TEST_TMPDIR/app.sh" <<'SCRIPT'
source "$KOI_LIBRARY"
__koiconfig name tool
__addarg value -o -s v -d Value
value=original
state_vars=(__koi_root_used __koi_root_spec_valid __koi_config)
for field in "${__koi_spec_fields[@]}"; do
    state_vars+=("__koi_root_$field")
done
before=$(declare -p "${state_vars[@]}")
if __parseargs "$@"; then
    exit 9
else
    result=$?
fi
[[ $result == 2 && $koi_status == 2 && $value == original ]]
[[ $(declare -p "${state_vars[@]}") == "$before" ]]
__koiconfig description Application
__addarg verbose -f -s V -d Verbose
handler() {
    __parseargs "$@" || return "$koi_status"
    [[ $value == parsed && $verbose == 1 ]]
    printf 'recovered\n'
}
__addcommand run -f handler -d Run
__koirun -v parsed -V run
SCRIPT
    local mode request
    for mode in executed sourced; do
        for request in '' '--help' '--koi-inspect spec' '--unknown'; do
            # Fixed requests intentionally split into tokens for the child script.
            # shellcheck disable=SC2086
            if [[ $mode == executed ]]; then
                run --separate-stderr bash -eu "$BATS_TEST_TMPDIR/app.sh" $request
            else
                run --separate-stderr bash -euc 'source "$1" "${@:2}"; echo survived' shell "$BATS_TEST_TMPDIR/app.sh" $request
            fi
            [ "$status" -eq 0 ]
            [[ "$output" == recovered* ]]
            [[ "$output" != *Usage:* ]]
            if [[ $mode == sourced ]]; then
                [ "$output" = $'recovered\nsurvived' ]
            fi
            [ "$stderr" = 'koi: __parseargs: must be called inside a function; use __koirun at top level' ]
        done
    done
}

@test "scope rejection leaves invalid root registration invalid" {
    run --separate-stderr bash -euc '
        source "$KOI_LIBRARY"
        __addarg 2>/dev/null || :
        if __parseargs --help; then
            exit 9
        fi
        [[ $koi_status == 2 && $__koi_root_used == 0 && $__koi_root_spec_valid == 0 ]]
        if __koirun --help; then
            exit 9
        else
            [[ $? == 2 && $__koi_root_used == 1 ]]
        fi
    '
    [ "$status" -eq 0 ]
    [ -z "$output" ]
    [ "$stderr" = 'koi: __parseargs: must be called inside a function; use __koirun at top level' ]
}

@test "moving only the parser into a function does not consume root declarations" {
    run --separate-stderr bash -euc '
        source "$KOI_LIBRARY"
        __addarg value -o -s v -d Value
        value=original
        main() {
            __parseargs "$@" || return "$koi_status"
        }
        if main -v supplied; then
            exit 9
        fi
        [[ $value == original && $__koi_root_used == 0 ]]
        [[ ${__koi_root_args[*]} == value ]]
    '
    [ "$status" -eq 0 ]
    [ -z "$output" ]
    [ "$stderr" = "koi: __parseargs: unsupported positional argument: '-v'" ]
}

@test "a real script main and a sourced parser inside it use function scope" {
    cat > "$BATS_TEST_TMPDIR/parse.sh" <<'SCRIPT'
__addarg value -p -r -d Value
__parseargs "$@" || return "$koi_status"
printf '%s\n' "$value"
SCRIPT
    cat > "$BATS_TEST_TMPDIR/main.sh" <<'SCRIPT'
source "$KOI_LIBRARY"
main() {
    local value
    source "$1" "${@:2}"
}
main "$@"
[[ $__koi_root_used == 0 ]]
SCRIPT
    run --separate-stderr bash -eu "$BATS_TEST_TMPDIR/main.sh" "$BATS_TEST_TMPDIR/parse.sh" supplied
    [ "$status" -eq 0 ]
    [ "$output" = supplied ]
    [ -z "$stderr" ]
}
