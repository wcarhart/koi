#!/usr/bin/env bats
# Single quotes preserve literal test data and expressions evaluated in child shells.
# shellcheck disable=SC2016

bats_require_minimum_version 1.5.0

setup() {
    export KOI_LIBRARY="$BATS_TEST_DIRNAME/../koi"
    # shellcheck source=koi
    source "$KOI_LIBRARY"
}

@test "empty registry produces no output" {
    run --separate-stderr __koirun
    [ "$status" -eq 0 ]
    [ -z "$output" ]
    [ -z "$stderr" ]
}

@test "runner prints only names in registration order" {
    __addcommand z --function z --description 'First command'
    __addcommand a --function a --description 'Second command'
    run --separate-stderr __koirun
    [ "$status" -eq 0 ]
    [ "$output" = $'z\na' ]
    [ -z "$stderr" ]
}

@test "runner currently ignores its arguments" {
    __addcommand deploy -f handler -d Description
    run --separate-stderr __koirun anything --help
    [ "$status" -eq 0 ]
    [ "$output" = deploy ]
    [ -z "$stderr" ]
}

@test "repeated listings preserve registrations" {
    run --separate-stderr bash -c '
        source "$KOI_LIBRARY" || exit
        __addcommand deploy -f handler -d Description || exit
        __koirun || exit
        __koirun
    '
    [ "$status" -eq 0 ]
    [ "$output" = $'deploy\ndeploy' ]
    [ -z "$stderr" ]
}

@test "simple script lists explicit commands without calling or discovering functions" {
    run --separate-stderr bash "$BATS_TEST_DIRNAME/fixtures/commands.sh"
    [ "$status" -eq 0 ]
    [ "$output" = infra ]
    [ -z "$stderr" ]
}

@test "invalid specs still list commands without repeating diagnostics" {
    run --separate-stderr bash -c '
        source "$KOI_LIBRARY" || exit
        __addcommand deploy -f handler -d Deploy || exit
        __addcommand
        result=$?
        [[ $result == 2 && $__koi_spec_valid == 0 ]] || exit 1
        __koirun || exit
        [[ $__koi_spec_valid == 0 ]]
    '
    [ "$status" -eq 0 ]
    [ "$output" = deploy ]
    [ "$stderr" = 'koi: __addcommand: command name required' ]
}
