#!/usr/bin/env bats
# Child shells evaluate their own expressions and Bats isolates tests.
# shellcheck disable=SC2016,SC2030,SC2031

bats_require_minimum_version 1.5.0

setup() {
    export KOI_LIBRARY="$BATS_TEST_DIRNAME/../koi"
    # shellcheck source=koi
    source "$KOI_LIBRARY"
}

@test "empty registry shows root help successfully" {
    run --separate-stderr __koirun
    [ "$status" -eq 0 ]
    [[ "$output" == Usage:*'COMMAND [args]'* ]]
    [[ "$output" == *$'Commands:\n  (none)'* ]]
    [ -z "$stderr" ]
}

@test "root help aligns descriptions without invoking defined handlers" {
    handler_z() {
        printf 'BAD\n'
    }
    handler_a() {
        printf 'BAD\n'
    }
    __addcommand z -f handler_z -d $'First command\nContinuation'
    __addcommand alpha -f handler_a -d 'Second command'
    run --separate-stderr __koirun
    [ "$status" -eq 0 ]
    [[ "$output" == *$'Commands:\n  z      First command\n         Continuation\n  alpha  Second command\n\nOptions:\n  -h, --help  Show this help' ]]
    [ -z "$stderr" ]
}

@test "root help never calls handlers or discovers ambient functions" {
    run --separate-stderr bash "$BATS_TEST_DIRNAME/fixtures/commands.sh" --help
    [ "$status" -eq 0 ]
    [ "$output" = 'Usage: commands.sh COMMAND [args]

Commands:
  infra  Manage infrastructure

Options:
  -h, --help  Show this help' ]
    [ -z "$stderr" ]
}

@test "leading help ignores subsequent tokens and the zero-argument setting" {
    local flag
    for flag in -h --help; do
        run --separate-stderr __koirun --koi-zero-argument-message 'Need a command' "$flag" ignored
        [ "$status" -eq 0 ]
        [[ "$output" == Usage:* ]]
        [ -z "$stderr" ]
    done
}

@test "zero-argument messages use the script prefix and preserve literal text" {
    run --separate-stderr bash -c 'source "$KOI_LIBRARY"; __koirun --koi-zero-argument-message "$1"' app.sh 'Need %s $command'
    [ "$status" -eq 2 ]
    [ -z "$output" ]
    [ "$stderr" = 'app.sh: Need %s $command' ]
}

@test "runner settings reject missing empty or repeated values" {
    run --separate-stderr __koirun --koi-zero-argument-message
    [ "$status" -eq 2 ]
    [ -z "$output" ]
    [[ "$stderr" == *'invalid or repeated --koi-zero-argument-message' ]]
    run --separate-stderr __koirun --koi-zero-argument-message ''
    [ "$status" -eq 2 ]
    run --separate-stderr __koirun --koi-zero-argument-message One --koi-zero-argument-message Two
    [ "$status" -eq 2 ]
    run --separate-stderr __koirun --koi-enable-help-on-unknown-commands --koi-enable-help-on-unknown-commands
    [ "$status" -eq 2 ]
    [ -z "$output" ]
    [[ "$stderr" == *'repeated --koi-enable-help-on-unknown-commands' ]]
}

@test "runner settings work in either order" {
    run --separate-stderr __koirun --koi-enable-help-on-unknown-commands --koi-zero-argument-message Required
    [ "$status" -eq 2 ]
    [[ "$stderr" == *': Required' ]]
    run --separate-stderr __koirun --koi-zero-argument-message Required --koi-enable-help-on-unknown-commands unknown --help
    [ "$status" -eq 0 ]
    [[ "$output" == Usage:* ]]
    [ -z "$stderr" ]
}

@test "unknown commands error by default even when help follows" {
    local command
    for command in unknown ''; do
        run --separate-stderr bash -c 'source "$KOI_LIBRARY"; __koirun "$1" --help' app.sh "$command"
        [ "$status" -eq 2 ]
        [ -z "$output" ]
        [ "$stderr" = "app.sh: unknown command '$command'" ]
    done
}

@test "unknown-command override only recognizes standalone help before the separator" {
    local flag
    for flag in -h --help; do
        run --separate-stderr __koirun --koi-enable-help-on-unknown-commands unknown extra "$flag"
        [ "$status" -eq 0 ]
        [[ "$output" == Usage:* ]]
        [ -z "$stderr" ]
        run --separate-stderr __koirun --koi-enable-help-on-unknown-commands unknown -- "$flag"
        [ "$status" -eq 2 ]
        [ -z "$output" ]
    done
    run --separate-stderr __koirun --koi-enable-help-on-unknown-commands unknown
    [ "$status" -eq 2 ]
    run --separate-stderr __koirun --koi-enable-help-on-unknown-commands unknown -vh
    [ "$status" -eq 2 ]
}

@test "unregistered functions and builtins are never dispatched" {
    run --separate-stderr bash -c '
        source "$KOI_LIBRARY"
        unrelated() {
            printf "BAD\n"
        }
        export -f unrelated
        __koirun unrelated
    '
    [ "$status" -eq 2 ]
    [ -z "$output" ]
    run --separate-stderr __koirun printf
    [ "$status" -eq 2 ]
    [ -z "$output" ]
}

@test "registered handler receives exact remaining arguments" {
    run --separate-stderr bash -c '
        source "$KOI_LIBRARY"
        __addcommand deploy -f actual_handler -d Deploy
        actual_handler() {
            printf "count=%s\n" "$#"
            printf "<%s>\n" "$@"
        }
        __koirun deploy "" "two words" -x -- --koi-zero-argument-message
    '
    [ "$status" -eq 0 ]
    [ "$output" = $'count=5\n<>\n<two words>\n<-x>\n<-->\n<--koi-zero-argument-message>' ]
    [ -z "$stderr" ]
}

@test "runner returns the handler status including non-parser failure codes" {
    local code
    for code in 0 1 7 42; do
        run --separate-stderr bash -c '
            source "$KOI_LIBRARY"
            __addcommand deploy -f handler -d Deploy
            handler() {
                return "$1"
            }
            __koirun deploy "$1"
        ' app.sh "$code"
        [ "$status" -eq "$code" ]
        [ -z "$output" ]
        [ -z "$stderr" ]
    done
}

@test "runner does not suppress normal errexit inside the handler" {
    run --separate-stderr bash -ec '
        source "$KOI_LIBRARY"
        __addcommand deploy -f handler -d Deploy
        handler() {
            false
            printf "BAD\n"
        }
        __koirun deploy
    '
    [ "$status" -eq 1 ]
    [ -z "$output" ]
    [ -z "$stderr" ]
}

@test "missing selected handlers produce script-prefixed errors" {
    __addcommand deploy -f absent -d Deploy
    run --separate-stderr __koirun deploy
    [ "$status" -eq 2 ]
    [ -z "$output" ]
    [[ "$stderr" == *": missing handler 'absent' for command 'deploy'" ]]
}

@test "invalid specs return without repeating diagnostics even for root help" {
    run --separate-stderr bash -c '
        source "$KOI_LIBRARY"
        __addcommand 2>/dev/null
        __koirun --help
    '
    [ "$status" -eq 2 ]
    [ -z "$output" ]
    [ -z "$stderr" ]
}

@test "handler changes to the directory and environment survive dispatch" {
    run --separate-stderr bash -c '
        source "$KOI_LIBRARY"
        __addcommand deploy -f handler -d Deploy
        handler() {
            cd / || return
            export KOI_RUN_TEST=changed
        }
        __koirun deploy || exit
        [[ $PWD == / && $KOI_RUN_TEST == changed ]]
    '
    [ "$status" -eq 0 ]
    [ -z "$output" ]
    [ -z "$stderr" ]
}

@test "selected command help uses the CLI name and skips business logic" {
    cat > "$BATS_TEST_TMPDIR/app.sh" <<'SCRIPT'
source "$KOI_LIBRARY"
__addcommand deploy -f actual_handler -d Deploy
actual_handler() {
    __addarg env -o -s e -l environment -n env -d Environment
    __parseargs "$@" || return "$koi_status"
    printf 'BUSINESS\n'
}
__koirun --koi-enable-help-on-unknown-commands "$@"
SCRIPT
    run --separate-stderr bash "$BATS_TEST_TMPDIR/app.sh" deploy --help
    [ "$status" -eq 0 ]
    [[ "${lines[0]}" == 'Usage: app.sh deploy [-h] [-e ENV]' ]]
    [[ "$output" != *BUSINESS* ]]
    [ -z "$stderr" ]
}

@test "dispatch integrates argument registration parsing and business logic" {
    run --separate-stderr bash -c '
        source "$KOI_LIBRARY"
        __addcommand deploy -f handler -d Deploy
        handler() {
            local env dry
            __addarg env -o -s e -l environment -d Environment
            __addarg dry -f -s d -l dry-run -d Dry
            __parseargs "$@" || return "$koi_status"
            printf "%s %s\n" "$env" "$dry"
        }
        __koirun deploy -e production -d
    '
    [ "$status" -eq 0 ]
    [ "$output" = 'production 1' ]
    [ -z "$stderr" ]
}

@test "command usage context disappears before later direct function calls" {
    run --separate-stderr bash -c '
        source "$KOI_LIBRARY"
        __addcommand deploy -f handler -d Deploy
        handler() {
            __parseargs "$@" || return "$koi_status"
        }
        __koirun deploy --help || exit
        printf "AFTER\n"
        handler --help
    ' app.sh
    [ "$status" -eq 0 ]
    [[ "$output" == 'Usage: app.sh deploy [-h]'*'AFTER'*'Usage: app.sh [-h]'* ]]
    [ -z "$stderr" ]
}

@test "root help and errors return without terminating the sourcing shell" {
    run --separate-stderr bash -c '
        source "$KOI_LIBRARY"
        __koirun --help || exit
        __koirun unknown
        result=$?
        printf "survived\n"
        exit "$result"
    ' app.sh
    [ "$status" -eq 2 ]
    [[ "$output" == *survived ]]
    [ "$stderr" = "app.sh: unknown command 'unknown'" ]
}

@test "missing handlers block root help, settings, unknown-command help and unrelated dispatch" {
    valid_handler() {
        printf 'BAD\n'
    }
    __addcommand deploy -f valid_handler -d Deploy
    __addcommand commit -f absent_commit -d Commit
    run --separate-stderr __koirun
    [ "$status" -eq 2 ]
    [ -z "$output" ]
    [[ "$stderr" == *": missing handler 'absent_commit' for command 'commit'" ]]
    local flag
    for flag in -h --help; do
        run --separate-stderr __koirun "$flag"
        [ "$status" -eq 2 ]
        [ -z "$output" ]
        [[ "$stderr" == *": missing handler 'absent_commit' for command 'commit'" ]]
    done
    run --separate-stderr __koirun deploy
    [ "$status" -eq 2 ]
    [ -z "$output" ]
    [[ "$stderr" == *": missing handler 'absent_commit' for command 'commit'" ]]
    run --separate-stderr __koirun --koi-enable-help-on-unknown-commands unknown --help
    [ "$status" -eq 2 ]
    [ -z "$output" ]
    [[ "$stderr" == *": missing handler 'absent_commit' for command 'commit'" ]]
    run --separate-stderr __koirun --koi-zero-argument-message Custom
    [ "$status" -eq 2 ]
    [ -z "$output" ]
    [[ "$stderr" == *": missing handler 'absent_commit' for command 'commit'" ]]
}

@test "first missing handler is reported in registration order" {
    __addcommand z -f absent_z -d First
    __addcommand alpha -f absent_alpha -d Second
    run --separate-stderr __koirun alpha
    [ "$status" -eq 2 ]
    [ -z "$output" ]
    [[ "$stderr" == *": missing handler 'absent_z' for command 'z'" ]]
}

@test "defining a missing handler repairs later runner calls without resetting state" {
    run --separate-stderr bash -c '
        source "$KOI_LIBRARY" || exit
        __addcommand deploy -f handler -d Deploy || exit
        if __koirun --help; then
            exit 9
        else
            result=$?
        fi
        [[ $result == 2 && $__koi_spec_valid == 1 ]] || exit 9
        handler() {
            printf "repaired\n"
        }
        __koirun deploy
    ' app.sh
    [ "$status" -eq 0 ]
    [ "$output" = repaired ]
    [ "$stderr" = "app.sh: missing handler 'handler' for command 'deploy'" ]
}
