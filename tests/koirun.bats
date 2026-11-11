#!/usr/bin/env bats
# Script bodies are evaluated only in the test shell they configure.
# shellcheck disable=SC2016

bats_require_minimum_version 1.5.0

setup() {
    export KOI_LIBRARY="$BATS_TEST_DIRNAME/../koi"
}

# Run a fresh script with real script-scope root registration
# Usage: run_app BODY "$@"
#   BODY  Bash application source following the library import
#   $@    application arguments
run_app() {
    local body=$1
    shift
    printf 'source "$KOI_LIBRARY"\n__koiconfig description "Application"\n%s\n' "$body" > "$BATS_TEST_TMPDIR/app.sh"
    run --separate-stderr bash "$BATS_TEST_TMPDIR/app.sh" "$@"
}

@test "empty registry shows root help successfully" {
    run_app '__koirun "$@"'
    [ "$status" -eq 0 ]
    [ "$output" = 'Application

Usage: app.sh [-h]

Options:
  -h, --help  Show this help' ]
    [ -z "$stderr" ]
}

@test "root help aligns descriptions and never invokes or discovers handlers" {
    run_app '
        handler() { printf "BAD\n"; }
        unrelated() { printf "BAD\n"; }
        export -f unrelated
        __addcommand z -f handler -d $'"'"'First command\nContinuation'"'"'
        __addcommand alpha -f handler -d "Second command"
        __koirun "$@"
    ' --help
    [ "$status" -eq 0 ]
    [ "$output" = 'Application

Usage: app.sh [-h] COMMAND

Commands:
  z      First command
         Continuation
  alpha  Second command
  help   Show this help

Options:
  -h, --help  Show this help' ]
    [ -z "$stderr" ]
}

@test "leading help ignores subsequent tokens and the zero-argument setting" {
    local flag
    for flag in -h --help; do
        run_app '__koirun --koi-zero-argument-message "Need a command" "$@"' "$flag" ignored
        [ "$status" -eq 0 ]
        [[ "$output" == Application*Usage:* ]]
        [ -z "$stderr" ]
    done
}

@test "zero-argument messages preserve literal text" {
    run_app '__koirun --koi-zero-argument-message '"'"'Need %s $command'"'"' "$@"'
    [ "$status" -eq 2 ]
    [ -z "$output" ]
    [ "$stderr" = 'app.sh: Need %s $command' ]
}

@test "runner settings reject missing empty and repeated values" {
    local setting
    for setting in '--koi-zero-argument-message' '--koi-zero-argument-message ""' \
        '--koi-zero-argument-message One --koi-zero-argument-message Two' \
        '--koi-enable-help-on-unknown-commands --koi-enable-help-on-unknown-commands'; do
        run_app "__koirun $setting"
        [ "$status" -eq 2 ]
        [ -z "$output" ]
        [[ "$stderr" == *invalid* || "$stderr" == *repeated* ]]
    done
}

@test "runner settings accept either order" {
    run_app '__koirun --koi-enable-help-on-unknown-commands --koi-zero-argument-message Required "$@"' unknown --help
    [ "$status" -eq 0 ]
    run_app '__koirun --koi-zero-argument-message Required --koi-enable-help-on-unknown-commands "$@"' unknown --help
    [ "$status" -eq 0 ]
}

@test "unknown commands error by default even when help follows" {
    local command
    for command in unknown ''; do
        run_app '__koirun "$@"' "$command" --help
        [ "$status" -eq 2 ]
        [ -z "$output" ]
        [ "$stderr" = "app.sh: unknown command '$command'" ]
    done
}

@test "unknown-command override recognizes standalone help before the separator" {
    local flag
    for flag in -h --help; do
        run_app '__koirun --koi-enable-help-on-unknown-commands "$@"' unknown extra "$flag"
        [ "$status" -eq 0 ]
        [[ "$output" == Application*Usage:* ]]
        run_app '__koirun --koi-enable-help-on-unknown-commands "$@"' unknown -- "$flag"
        [ "$status" -eq 2 ]
        [ -z "$output" ]
    done
    run_app '__koirun --koi-enable-help-on-unknown-commands "$@"' unknown -vh
    [ "$status" -eq 2 ]
}

@test "unregistered functions and builtins are never dispatched" {
    local command
    for command in unrelated printf; do
        run_app '
            unrelated() { printf "BAD\n"; }
            export -f unrelated
            __koirun "$@"
        ' "$command"
        [ "$status" -eq 2 ]
        [ -z "$output" ]
    done
}

@test "registered handler receives exact remaining arguments" {
    run_app '
        __addcommand deploy -f handler -d Deploy
        handler() {
            printf "count=%s\n" "$#"
            printf "<%s>\n" "$@"
        }
        __koirun "$@"
    ' deploy '' 'two words' -x -- --koi-zero-argument-message
    [ "$status" -eq 0 ]
    [ "$output" = $'count=5\n<>\n<two words>\n<-x>\n<-->\n<--koi-zero-argument-message>' ]
    [ -z "$stderr" ]
}

@test "runner preserves arbitrary handler statuses" {
    local code
    for code in 0 1 2 7 42; do
        run_app '
            __addcommand deploy -f handler -d Deploy
            handler() { return "$1"; }
            __koirun "$@"
        ' deploy "$code"
        [ "$status" -eq "$code" ]
        [ -z "$output" ]
        [ -z "$stderr" ]
    done
}

@test "runner does not suppress normal errexit inside the handler" {
    run_app '
        set -e
        __addcommand deploy -f handler -d Deploy
        handler() {
            false
            printf "BAD\n"
        }
        __koirun "$@"
    ' deploy
    [ "$status" -eq 1 ]
    [ -z "$output" ]
}

@test "missing handlers block help and unrelated dispatch in registration order" {
    local arg
    for arg in --help deploy alpha; do
        run_app '
            handler() { printf "BAD\n"; }
            __addcommand deploy -f handler -d Deploy
            __addcommand z -f absent_z -d First
            __addcommand alpha -f absent_alpha -d Second
            __koirun "$@"
        ' "$arg"
        [ "$status" -eq 2 ]
        [ -z "$output" ]
        [ "$stderr" = "app.sh: missing handler 'absent_z' for command 'z'" ]
    done
}

@test "invalid registration is consumed without repeating diagnostics" {
    run_app '
        __addcommand 2>/dev/null
        __koirun --help
    '
    [ "$status" -eq 2 ]
    [ -z "$output" ]
    [ -z "$stderr" ]
}

@test "handler directory and environment changes survive dispatch" {
    run_app '
        __addcommand deploy -f handler -d Deploy
        handler() {
            cd / || return
            export KOI_RUN_TEST=changed
        }
        __koirun deploy || exit
        [[ $PWD == / && $KOI_RUN_TEST == changed ]]
    '
    [ "$status" -eq 0 ]
    [ -z "$stderr" ]
}

@test "selected command help uses its CLI alias and skips business logic" {
    run_app '
        __addcommand deploy -f actual_handler -d Deploy
        actual_handler() {
            __addarg env -o -s e -n env -d Environment
            __parseargs "$@" || return "$koi_status"
            printf "BAD\n"
        }
        __koirun "$@"
    ' deploy --help
    [ "$status" -eq 0 ]
    [[ "${lines[0]}" == Deploy && "${lines[1]}" == 'Usage: app.sh deploy [-h] [-e ENV]' ]]
    [[ "$output" != *BAD* ]]
    [ -z "$stderr" ]
}

@test "root arguments assign values before child dispatch" {
    run_app '
        set -u
        __addarg verbose -f -s v -d Verbose
        __addarg mode -o -s m -d Mode -D safe
        __addcommand deploy -f handler -d Deploy
        handler() {
            local env
            __addarg env -o -s e -d Environment
            __parseargs "$@" || return "$koi_status"
            printf "%s %s %s\n" "$verbose" "$mode" "$env"
        }
        __koirun "$@"
    ' -v -m fast deploy -e production
    [ "$status" -eq 0 ]
    [ "$output" = '1 fast production' ]
    [ -z "$stderr" ]
}

@test "root help lists arguments and bypasses requiredness and assignments" {
    run_app '
        __addarg token -o -l token -r -d Token
        __addcommand deploy -f handler -d Deploy
        handler() { printf "BAD\n"; }
        __koirun "$@" || exit
        [[ ! -v token ]]
    ' --help
    [ "$status" -eq 0 ]
    [[ "$output" == *'--token TOKEN'*'Commands:'*'deploy'*'Options:'* ]]
    [[ "$output" != *BAD* ]]
}

@test "root options are not recognized after child selection" {
    run_app '
        __addarg verbose -f -s v -d Verbose
        __addcommand deploy -f handler -d Deploy
        handler() {
            __parseargs "$@" || return "$koi_status"
            printf "BAD\n"
        }
        __koirun "$@"
    ' deploy -v
    [ "$status" -eq 2 ]
    [ -z "$output" ]
}

@test "root values consume command-like tokens and separator permits child selection" {
    run_app '
        __addarg mode -o -s m -d Mode
        __addcommand deploy -f handler -d Deploy
        handler() { printf "<%s> <%s>\n" "$mode" "$1"; }
        __koirun "$@"
    ' -m deploy -- deploy --help
    [ "$status" -eq 0 ]
    [ "$output" = '<deploy> <--help>' ]
}

@test "second runner call fails after success help or error and re-sourcing does not reset it" {
    local arg
    for arg in deploy --help unknown; do
        run_app '
            __addcommand deploy -f handler -d Deploy
            handler() { return 0; }
            __koirun "$@" >/dev/null 2>/dev/null
            source "$KOI_LIBRARY"
            __koirun --help
        ' "$arg"
        [ "$status" -eq 2 ]
        [ -z "$output" ]
        [[ "$stderr" == *'__koirun: call only once per script; __koirun has already been called' ]]
    done
}

@test "late root declarations fail but later direct parsing remains usable" {
    run_app '
        __koirun --help >/dev/null || exit
        __addarg late -f -l late -d Late 2>/dev/null
        [[ $? == 2 ]] || exit 9
        __addcommand late -f handler -d Late 2>/dev/null
        [[ $? == 2 ]] || exit 9
        handler() {
            __addarg mode -o -s m -d Mode
            __parseargs "$@" || return "$koi_status"
            printf "%s\n" "$mode"
        }
        handler -m safe
    '
    [ "$status" -eq 0 ]
    [ "$output" = safe ]
}

@test "top-level parsing rejects input without consuming root registration" {
    run_app '
        __addarg mode -o -s m -d Mode
        if __parseargs "$@"; then
            exit 9
        else
            [[ $? == 2 ]] || exit 9
        fi
        [[ $koi_status == 2 && $__koi_root_used == 0 ]] || exit 9
        handler() {
            __parseargs "$@" || return "$koi_status"
            printf "%s\n" "$mode"
        }
        __addcommand run -f handler -d Run
        __koirun "$@" run
    ' -m safe
    [ "$status" -eq 0 ]
    [ "$output" = safe ]
    [ "$stderr" = 'koi: __parseargs: must be called inside a function; use __koirun at top level' ]
}

@test "root help and errors return without terminating the sourcing shell" {
    run_app '
        __koirun "$@"
        result=$?
        printf "survived\n"
        exit "$result"
    ' unknown
    [ "$status" -eq 2 ]
    [ "$output" = survived ]
    [ "$stderr" = "app.sh: unknown command 'unknown'" ]
}
