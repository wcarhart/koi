#!/usr/bin/env bats
# Single quotes preserve literal test data and expressions evaluated in child shells.
# shellcheck disable=SC2016

bats_require_minimum_version 1.5.0

setup() {
    export KOI_LIBRARY="$BATS_TEST_DIRNAME/../koi"
    # shellcheck source=koi
    source "$KOI_LIBRARY"
}

@test "error helper writes a prefixed message to stderr and returns two" {
    run --separate-stderr __koi_error 'Something failed'
    [ "$status" -eq 2 ]
    [ -z "$output" ]
    [ "$stderr" = 'koi: Something failed' ]
}

@test "error helper joins text arguments without interpreting their contents" {
    run --separate-stderr __koi_error 'literal %s' '$value' '\n'
    [ "$status" -eq 2 ]
    [ -z "$output" ]
    [ "$stderr" = 'koi: literal %s $value \n' ]
}

@test "generic errors preserve both valid and invalid spec state" {
    for validity in 1 0; do
        run --separate-stderr bash -c '
            source "$KOI_LIBRARY" || exit
            __koi_pending_spec_valid=$1
            __koi_error Example
            result=$?
            [[ $result == 2 && $__koi_pending_spec_valid == "$1" ]]
        ' bash "$validity"
        [ "$status" -eq 0 ]
        [ -z "$output" ]
        [ "$stderr" = 'koi: Example' ]
    done
}
