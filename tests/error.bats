#!/usr/bin/env bats
# Single quotes preserve literal test data and expressions evaluated in child shells.
# shellcheck disable=SC2016

bats_require_minimum_version 1.5.0

setup() {
    # shellcheck source=koi
    source "$BATS_TEST_DIRNAME/../koi"
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
