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
    printf 'source "$KOI_LIBRARY"\nkoi::config description "Application"\n%s\n' "$body" > "$BATS_TEST_TMPDIR/app.sh"
    run --separate-stderr bash "$BATS_TEST_TMPDIR/app.sh" "$@"
}

@test "empty registry shows root help successfully" {
    run_app 'koi::run "$@"'
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
        koi::add_command z -f handler -d $'"'"'First command\nContinuation'"'"'
        koi::add_command alpha -f handler -d "Second command"
        koi::run "$@"
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
        run_app 'koi::run --koi-zero-argument-message "Need a command" "$@"' "$flag" ignored
        [ "$status" -eq 0 ]
        [[ "$output" == Application*Usage:* ]]
        [ -z "$stderr" ]
    done
}

@test "zero-argument messages preserve literal text" {
    run_app 'koi::run --koi-zero-argument-message '"'"'Need %s $command'"'"' "$@"'
    [ "$status" -eq 2 ]
    [ -z "$output" ]
    [ "$stderr" = 'app.sh: Need %s $command' ]
}

@test "runner settings reject missing empty and repeated values" {
    local setting
    for setting in '--koi-zero-argument-message' '--koi-zero-argument-message ""' \
        '--koi-zero-argument-message One --koi-zero-argument-message Two' \
        '--koi-enable-help-on-unknown-commands --koi-enable-help-on-unknown-commands'; do
        run_app "koi::run $setting"
        [ "$status" -eq 2 ]
        [ -z "$output" ]
        [[ "$stderr" == *invalid* || "$stderr" == *repeated* ]]
    done
}

@test "runner settings accept either order" {
    run_app 'koi::run --koi-enable-help-on-unknown-commands --koi-zero-argument-message Required "$@"' unknown --help
    [ "$status" -eq 0 ]
    run_app 'koi::run --koi-zero-argument-message Required --koi-enable-help-on-unknown-commands "$@"' unknown --help
    [ "$status" -eq 0 ]
}

@test "unknown commands error by default even when help follows" {
    local command
    for command in unknown ''; do
        run_app 'koi::run "$@"' "$command" --help
        [ "$status" -eq 2 ]
        [ -z "$output" ]
        [ "$stderr" = "app.sh: unknown command '$command'" ]
    done
}

@test "unknown-command override recognizes standalone help before the separator" {
    local flag
    for flag in -h --help; do
        run_app 'koi::run --koi-enable-help-on-unknown-commands "$@"' unknown extra "$flag"
        [ "$status" -eq 0 ]
        [[ "$output" == Application*Usage:* ]]
        run_app 'koi::run --koi-enable-help-on-unknown-commands "$@"' unknown -- "$flag"
        [ "$status" -eq 2 ]
        [ -z "$output" ]
    done
    run_app 'koi::run --koi-enable-help-on-unknown-commands "$@"' unknown -vh
    [ "$status" -eq 2 ]
}

@test "unregistered functions and builtins are never dispatched" {
    local command
    for command in unrelated printf; do
        run_app '
            unrelated() { printf "BAD\n"; }
            export -f unrelated
            koi::run "$@"
        ' "$command"
        [ "$status" -eq 2 ]
        [ -z "$output" ]
    done
}

@test "registered handler receives exact remaining arguments" {
    run_app '
        koi::add_command deploy -f handler -d Deploy
        handler() {
            printf "count=%s\n" "$#"
            printf "<%s>\n" "$@"
        }
        koi::run "$@"
    ' deploy '' 'two words' -x -- --koi-zero-argument-message
    [ "$status" -eq 0 ]
    [ "$output" = $'count=5\n<>\n<two words>\n<-x>\n<-->\n<--koi-zero-argument-message>' ]
    [ -z "$stderr" ]
}

@test "runner preserves arbitrary handler statuses" {
    local code
    for code in 0 1 2 7 42; do
        run_app '
            koi::add_command deploy -f handler -d Deploy
            handler() { return "$1"; }
            koi::run "$@"
        ' deploy "$code"
        [ "$status" -eq "$code" ]
        [ -z "$output" ]
        [ -z "$stderr" ]
    done
}

@test "runner does not suppress normal errexit inside the handler" {
    run_app '
        set -e
        koi::add_command deploy -f handler -d Deploy
        handler() {
            false
            printf "BAD\n"
        }
        koi::run "$@"
    ' deploy
    [ "$status" -eq 1 ]
    [ -z "$output" ]
}

@test "missing handlers block help and unrelated dispatch in registration order" {
    local arg
    for arg in --help deploy alpha; do
        run_app '
            handler() { printf "BAD\n"; }
            koi::add_command deploy -f handler -d Deploy
            koi::add_command z -f absent_z -d First
            koi::add_command alpha -f absent_alpha -d Second
            koi::run "$@"
        ' "$arg"
        [ "$status" -eq 2 ]
        [ -z "$output" ]
        [ "$stderr" = "app.sh: missing handler 'absent_z' for command 'z'" ]
    done
}

@test "invalid registration is consumed without repeating diagnostics" {
    run_app '
        koi::add_command 2>/dev/null
        koi::run --help
    '
    [ "$status" -eq 2 ]
    [ -z "$output" ]
    [ -z "$stderr" ]
}

@test "handler directory and environment changes survive dispatch" {
    run_app '
        koi::add_command deploy -f handler -d Deploy
        handler() {
            cd / || return
            export KOI_RUN_TEST=changed
        }
        koi::run deploy || exit
        [[ $PWD == / && $KOI_RUN_TEST == changed ]]
    '
    [ "$status" -eq 0 ]
    [ -z "$stderr" ]
}

@test "selected command help uses its CLI alias and skips business logic" {
    run_app '
        koi::add_command deploy -f actual_handler -d Deploy
        actual_handler() {
            koi::add_arg env -o -s e -n env -d Environment
            koi::parse "$@" || return "$koi_status"
            printf "BAD\n"
        }
        koi::run "$@"
    ' deploy --help
    [ "$status" -eq 0 ]
    [[ "${lines[0]}" == Deploy && "${lines[1]}" == 'Usage: app.sh deploy [-h] [-e ENV]' ]]
    [[ "$output" != *BAD* ]]
    [ -z "$stderr" ]
}

@test "root arguments assign values before child dispatch" {
    run_app '
        set -u
        koi::add_arg verbose -f -s v -d Verbose
        koi::add_arg mode -o -s m -d Mode -D safe
        koi::add_command deploy -f handler -d Deploy
        handler() {
            local env
            koi::add_arg env -o -s e -d Environment
            koi::parse "$@" || return "$koi_status"
            printf "%s %s %s\n" "$verbose" "$mode" "$env"
        }
        koi::run "$@"
    ' -v -m fast deploy -e production
    [ "$status" -eq 0 ]
    [ "$output" = '1 fast production' ]
    [ -z "$stderr" ]
}

@test "root help lists arguments and bypasses requiredness and assignments" {
    run_app '
        koi::add_arg token -o -l token -r -d Token
        koi::add_command deploy -f handler -d Deploy
        handler() { printf "BAD\n"; }
        koi::run "$@" || exit
        [[ ! -v token ]]
    ' --help
    [ "$status" -eq 0 ]
    [[ "$output" == *'--token TOKEN'*'Commands:'*'deploy'*'Options:'* ]]
    [[ "$output" != *BAD* ]]
}

@test "root options are not recognized after child selection" {
    run_app '
        koi::add_arg verbose -f -s v -d Verbose
        koi::add_command deploy -f handler -d Deploy
        handler() {
            koi::parse "$@" || return "$koi_status"
            printf "BAD\n"
        }
        koi::run "$@"
    ' deploy -v
    [ "$status" -eq 2 ]
    [ -z "$output" ]
}

@test "root values consume command-like tokens and separator permits child selection" {
    run_app '
        koi::add_arg mode -o -s m -d Mode
        koi::add_command deploy -f handler -d Deploy
        handler() { printf "<%s> <%s>\n" "$mode" "$1"; }
        koi::run "$@"
    ' -m deploy -- deploy --help
    [ "$status" -eq 0 ]
    [ "$output" = '<deploy> <--help>' ]
}

@test "second runner call fails after success help or error and re-sourcing does not reset it" {
    local arg
    for arg in deploy --help unknown; do
        run_app '
            koi::add_command deploy -f handler -d Deploy
            handler() { return 0; }
            koi::run "$@" >/dev/null 2>/dev/null
            source "$KOI_LIBRARY"
            koi::run --help
        ' "$arg"
        [ "$status" -eq 2 ]
        [ -z "$output" ]
        [[ "$stderr" == *'koi::run: call only once per script; koi::run has already been called' ]]
    done
}

@test "late root declarations fail but later direct parsing remains usable" {
    run_app '
        koi::run --help >/dev/null || exit
        koi::add_arg late -f -l late -d Late 2>/dev/null
        [[ $? == 2 ]] || exit 9
        koi::add_command late -f handler -d Late 2>/dev/null
        [[ $? == 2 ]] || exit 9
        handler() {
            koi::add_arg mode -o -s m -d Mode
            koi::parse "$@" || return "$koi_status"
            printf "%s\n" "$mode"
        }
        handler -m safe
    '
    [ "$status" -eq 0 ]
    [ "$output" = safe ]
}

@test "top-level parsing rejects input without consuming root registration" {
    run_app '
        koi::add_arg mode -o -s m -d Mode
        if koi::parse "$@"; then
            exit 9
        else
            [[ $? == 2 ]] || exit 9
        fi
        [[ $koi_status == 2 && $__koi_root_used == 0 ]] || exit 9
        handler() {
            koi::parse "$@" || return "$koi_status"
            printf "%s\n" "$mode"
        }
        koi::add_command run -f handler -d Run
        koi::run "$@" run
    ' -m safe
    [ "$status" -eq 0 ]
    [ "$output" = safe ]
    [ "$stderr" = 'koi: koi::parse: must be called inside a function; use koi::run at top level' ]
}

@test "root help and errors return without terminating the sourcing shell" {
    run_app '
        koi::run "$@"
        result=$?
        printf "survived\n"
        exit "$result"
    ' unknown
    [ "$status" -eq 2 ]
    [ "$output" = survived ]
    [ "$stderr" = "app.sh: unknown command 'unknown'" ]
}

@test "namespaced handlers dispatch through guarded parents and preserve child status" {
    run --separate-stderr bash -c '
        source "$KOI_LIBRARY"
        koi::add_command parent -f app::parent -d Parent
        app::parent() {
            koi::add_command deploy --function app::internal::deploy -d Deploy
            koi::parse "$@" || return "$koi_status"
            echo BAD-parent
        }
        app::internal::deploy() {
            koi::parse "$@" || return "$koi_status"
            printf "deployed\n"
            return 37
        }
        koi::run parent deploy
    '
    [ "$status" -eq 37 ]
    [ "$output" = deployed ]
    [ -z "$stderr" ]
}

@test "detailed help enters namespaced handlers and stops at their guard" {
    run --separate-stderr bash -c '
        source "$KOI_LIBRARY"
        koi::add_command deploy -f app::deploy -d Deploy
        app::deploy() {
            koi::add_arg detail -o -l detail -d "Namespaced details"
            koi::parse "$@" || return "$koi_status"
            echo BAD
        }
        koi::run deploy --help
    '
    [ "$status" -eq 0 ]
    [[ "$output" == *"Namespaced details"* ]]
    [[ "$output" != *BAD* ]]
    [ -z "$stderr" ]
}
