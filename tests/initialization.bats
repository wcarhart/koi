#!/usr/bin/env bats
# Single quotes preserve literal test data and expressions evaluated in child shells.
# shellcheck disable=SC2016

bats_require_minimum_version 1.5.0

setup() {
    export KOI_LIBRARY="$BATS_TEST_DIRNAME/../koi"
}

@test "sourcing is silent and initializes an empty registry" {
    run --separate-stderr bash -c '
        source "$KOI_LIBRARY" || exit
        [[ $__koi_initialized == 1 && ${#__koi_commands[@]} == 0 &&
           ${#__koi_handlers[@]} == 0 && ${#__koi_descriptions[@]} == 0 ]]
    '
    [ "$status" -eq 0 ]
    [ -z "$output" ]
    [ -z "$stderr" ]
}

@test "sourcing preserves shell options" {
    run --separate-stderr bash -c '
        set -eu
        set -o pipefail
        before=$(set +o)
        flags=$-
        source "$KOI_LIBRARY" || exit
        [[ $(set +o) == "$before" && $- == "$flags" ]]
    '
    [ "$status" -eq 0 ]
    [ -z "$output" ]
    [ -z "$stderr" ]
}

@test "sourcing preserves traps" {
    run --separate-stderr bash -c '
        trap ":" USR1
        before=$(trap -p)
        source "$KOI_LIBRARY" || exit
        [[ $(trap -p) == "$before" ]]
    '
    [ "$status" -eq 0 ]
    [ -z "$output" ]
    [ -z "$stderr" ]
}

@test "repeated sourcing preserves registered names and metadata" {
    run --separate-stderr bash -c '
        source "$KOI_LIBRARY" || exit
        __addcommand deploy -f handler -d Description || exit
        source "$KOI_LIBRARY" || exit
        [[ ${#__koi_commands[@]} == 1 && ${__koi_commands[0]} == deploy &&
           ${__koi_handlers[deploy]} == handler && ${__koi_descriptions[deploy]} == Description ]]
    '
    [ "$status" -eq 0 ]
    [ -z "$output" ]
    [ -z "$stderr" ]
}

@test "unsupported Bash returns an error without exiting the sourcing shell" {
    if [[ ! -x /bin/bash ]]; then
        skip 'no system Bash'
    fi
    if /bin/bash -c '(( BASH_VERSINFO[0] > 5 || (BASH_VERSINFO[0] == 5 && BASH_VERSINFO[1] >= 2) ))'; then
        skip 'system Bash meets the minimum version'
    fi
    run --separate-stderr /bin/bash -c '
        source "$KOI_LIBRARY"
        result=$?
        printf "survived\n"
        exit "$result"
    '
    [ "$status" -eq 2 ]
    [ "$output" = survived ]
    [ "$stderr" = 'koi: requires Bash >= 5.2' ]
}

@test "non-Bash sourcing returns an error without exiting the sourcing shell" {
    if ! command -v zsh >/dev/null; then
        skip 'zsh unavailable'
    fi
    run --separate-stderr zsh -c '
        source "$KOI_LIBRARY"
        result=$?
        printf "survived\n"
        exit "$result"
    '
    [ "$status" -eq 2 ]
    [ "$output" = survived ]
    [ "$stderr" = 'koi: requires Bash >= 5.2' ]
}
