#!/usr/bin/env bats
# Bash snippets intentionally evaluate their own variables.
# shellcheck disable=SC2016

bats_require_minimum_version 1.5.0

setup() {
    export KOI_LIBRARY="$BATS_TEST_DIRNAME/../koi"
}

@test "repeated calls rebuild specs and defaults without retaining metadata" {
    run --separate-stderr bash -uc '
        source "$KOI_LIBRARY"
        configure() {
            local mode verbose
            __addarg mode -o -s m -d Mode -D safe
            __addarg verbose -f -s v -d Verbose
            __parseargs "$@" || return "$koi_status"
            printf "%s %s\n" "$mode" "$verbose"
        }
        configure -m fast -v || exit
        configure || exit
        for ((i=0; i<100; i++)); do
            configure >/dev/null || exit
        done
        for field in "${__koi_spec_fields[@]}"; do
            declare -n buffer="__koi_pending_$field"
            (( ${#buffer[@]} == 0 )) || exit 9
        done
        [[ $__koi_pending_spec_valid == 1 ]]
    '
    [ "$status" -eq 0 ]
    [ "$output" = $'fast 1\nsafe 0' ]
    [ -z "$stderr" ]
}

@test "direct nesting and recursion preserve caller locals with reused spellings" {
    run --separate-stderr bash -uc '
        source "$KOI_LIBRARY"
        inner() {
            local mode
            __addarg mode -o -s m -d Mode
            __parseargs "$@" || return "$koi_status"
            printf "inner:%s\n" "$mode"
        }
        outer() {
            local mode
            inner -m before || return
            __addarg mode -o -s m -d Mode
            __parseargs "$@" || return "$koi_status"
            inner -m after || return
            printf "outer:%s\n" "$mode"
        }
        recurse() {
            local mode
            __addarg mode -o -s m -d Depth
            __parseargs "$@" || return "$koi_status"
            if (( mode > 0 )); then
                recurse -m "$((mode-1))" || return
            fi
            printf "depth:%s\n" "$mode"
        }
        outer -m original || exit
        recurse -m 2
    '
    [ "$status" -eq 0 ]
    [ "$output" = $'inner:before\ninner:after\nouter:original\ndepth:0\ndepth:1\ndepth:2' ]
    [ -z "$stderr" ]
}

@test "authors may intentionally assign ancestor locals and globals" {
    run --separate-stderr bash -uc '
        source "$KOI_LIBRARY"
        assign() {
            __addarg mode -o -s m -d Mode
            __parseargs "$@" || return "$koi_status"
        }
        outer() {
            local mode=old
            assign -m local || return
            [[ $mode == local ]]
        }
        outer || exit
        assign -m global || exit
        [[ $mode == global ]]
    '
    [ "$status" -eq 0 ]
    [ -z "$stderr" ]
}

@test "conditional declarations are rebuilt and zero-declaration calls are empty" {
    run --separate-stderr bash -uc '
        source "$KOI_LIBRARY"
        conditional() {
            local verbose
            if (( enabled )); then
                __addarg verbose -f -s v -d Verbose
            fi
            __parseargs "$@" || return "$koi_status"
        }
        enabled=1
        conditional -v || exit
        enabled=0
        conditional -v 2>/dev/null
        [[ $? == 2 ]] || exit 9
        conditional || exit
        enabled=1
        conditional -v
    '
    [ "$status" -eq 0 ]
    [ -z "$stderr" ]
}

@test "all parser outcomes discard the cycle and isolate validity" {
    run --separate-stderr bash -uc '
        source "$KOI_LIBRARY"
        configure() {
            local mode=old
            if [[ $case == invalid ]]; then
                __addarg 2>/dev/null
            fi
            __addarg mode -o -s m -r -d Mode
            __parseargs "$@" || return "$koi_status"
            [[ $mode == safe ]]
        }
        case=invalid
        configure -m safe 2>/dev/null
        [[ $? == 2 ]] || exit 9
        case=valid
        configure 2>/dev/null
        [[ $? == 2 ]] || exit 9
        configure --help >/dev/null || exit
        configure -m safe || exit
        readonly_case() {
            local -r mode=old
            __addarg mode -o -s m -d Mode
            __parseargs "$@" || return "$koi_status"
        }
        readonly_case -m safe 2>/dev/null
        [[ $? == 2 ]] || exit 9
        configure -m safe
    '
    [ "$status" -eq 0 ]
    [ -z "$output" ]
    [ -z "$stderr" ]
}

@test "pending function registration cannot alter root registration or validity" {
    run --separate-stderr bash -uc '
        source "$KOI_LIBRARY"
        __koiconfig description Application
        __addcommand visible -f visible -d Visible
        visible() { return 0; }
        build() {
            __addcommand leaked -f visible -d Hidden
            __addarg 2>/dev/null
            __parseargs "$@" || return "$koi_status"
        }
        build 2>/dev/null
        [[ $? == 2 ]] || exit 9
        __koirun --help
    ' app.sh
    [ "$status" -eq 0 ]
    [[ "$output" == *visible* ]]
    [[ "$output" != *leaked* ]]
    [ -z "$stderr" ]
}

@test "nested routing assigns parent arguments and suppresses parent business logic" {
    run --separate-stderr bash -uc '
        source "$KOI_LIBRARY"
        __koiconfig description Application
        __addcommand infra -f infra -d Infra
        infra() {
            local mode
            __addarg mode -o -s m -d Mode -D safe
            __addcommand deploy -f deploy -d Deploy
            __parseargs "$@" || return "$koi_status"
            printf "BAD\n"
        }
        deploy() {
            local mode
            __addarg mode -o -s m -d Mode
            __parseargs "$@" || return "$koi_status"
            printf "child:%s\n" "$mode"
            return 42
        }
        __koirun infra -m parent deploy -m child
    ' app.sh
    [ "$status" -eq 42 ]
    [ "$output" = child:child ]
    [ -z "$stderr" ]
}

@test "a branch without child selection shows help and skips business logic" {
    run --separate-stderr bash -uc '
        source "$KOI_LIBRARY"
        child() { printf "child\n"; }
        parent() {
            __addcommand child -f child -d Child
            __parseargs "$@" || return "$koi_status"
            printf "default\n"
        }
        parent || exit
        parent child
    '
    [ "$status" -eq 0 ]
    [[ "$output" == Usage:*COMMAND*child ]]
    [[ "$output" != *default* ]]
    [ -z "$stderr" ]
}

@test "child statuses are published after the child finishes its business logic" {
    local code
    for code in 0 1 2 42; do
        run --separate-stderr bash -uc '
            source "$KOI_LIBRARY"
            child() {
                __parseargs || return "$koi_status"
                return "$1"
            }
            parent() {
                __addcommand child -f child -d Child
                __parseargs "$@" || return "$koi_status"
                printf "BAD\n"
            }
            if parent child "$1"; then
                result=0
            else
                result=$?
            fi
            [[ $result == "$1" && $koi_status == "$1" ]]
        ' app.sh "$code"
        [ "$status" -eq 0 ]
        [ -z "$output" ]
        [ -z "$stderr" ]
    done
}

@test "nested help lists immediate children with a complete command path" {
    run --separate-stderr bash -uc '
        source "$KOI_LIBRARY"
        __koiconfig description Application
        __addcommand a -f node -d A
        node() {
            __addcommand a -f node -d Next
            __parseargs "$@" || return "$koi_status"
            printf "BAD\n"
        }
        __koirun "$@"
    ' app.sh a a a a a a a a a a a a --help
    [ "$status" -eq 0 ]
    [[ "${lines[0]}" == Next && "${lines[1]}" == 'Usage: app.sh a a a a a a a a a a a a [-h] COMMAND' ]]
    [[ "$output" == *'Commands:'*'Next'* ]]
    [[ "$output" != *BAD* ]]
    [ -z "$stderr" ]
}

@test "preparation helpers and later direct calls do not inherit routed help paths" {
    run --separate-stderr bash -uc '
        source "$KOI_LIBRARY"
        __koiconfig description Application
        __addcommand alias -f handler -d Handler
        helper() {
            __parseargs "$@" || return "$koi_status"
        }
        handler() {
            helper --help || return
            __parseargs "$@" || return "$koi_status"
            helper --help
        }
        __koirun alias --help || exit
        printf "AFTER\n"
        handler --help
    ' app.sh
    [ "$status" -eq 0 ]
    [[ "$output" == 'Usage: app.sh [-h]'*'Usage: app.sh alias [-h]'*AFTER*'Usage: app.sh [-h]'* ]]
    [ "$(printf '%s\n' "$output" | rg -c '^Usage: app.sh alias')" -eq 1 ]
    [ -z "$stderr" ]
}

@test "recursive direct calls of a routed handler do not consume its route" {
    run --separate-stderr bash -uc '
        source "$KOI_LIBRARY"
        __koiconfig description Application
        __addcommand alias -f handler -d Handler
        handler() {
            local help_only=0
            if [[ ${1-} == nested ]]; then
                shift
                help_only=1
            fi
            if (( ! help_only )); then
                handler nested --help || return
            fi
            __parseargs "$@" || return "$koi_status"
        }
        __koirun alias --help
    ' app.sh
    [ "$status" -eq 0 ]
    [[ "$output" == 'Usage: app.sh [-h]'*'Usage: app.sh alias [-h]'* ]]
    [ -z "$stderr" ]
}

@test "guarded dispatch remains explicit when errexit is suppressed" {
    run --separate-stderr bash -euc '
        source "$KOI_LIBRARY"
        child() {
            __addarg mode -o -s m -r -d Mode
            __parseargs "$@" || return "$koi_status"
            printf "BAD\n"
        }
        parent() {
            __addcommand child -f child -d Child
            __parseargs "$@" || return "$koi_status"
            printf "BAD\n"
        }
        if parent child; then
            exit 9
        else
            [[ $? == 2 ]]
        fi
    '
    [ "$status" -eq 0 ]
    [ -z "$output" ]
    [[ "$stderr" == *'missing required argument'* ]]
}

@test "script-scope sourced declarations are root declarations" {
    printf '%s\n' '__addarg verbose -f -s v -d Verbose' > "$BATS_TEST_TMPDIR/args.sh"
    run --separate-stderr bash -uc '
        source "$KOI_LIBRARY"
        __koiconfig description Application
        source "$1"
        __parseargs -v || exit "$koi_status"
        [[ $verbose == 1 ]]
    ' app.sh "$BATS_TEST_TMPDIR/args.sh"
    [ "$status" -eq 0 ]
    [ -z "$stderr" ]
}

@test "main is an ordinary function in bash -c and can parse repeatedly" {
    run --separate-stderr bash -uc '
        source "$KOI_LIBRARY"
        main() {
            local mode
            __addarg mode -o -s m -d Mode
            __parseargs "$@" || return "$koi_status"
            printf "%s\n" "$mode"
        }
        main -m first || exit
        main -m second || exit
        [[ $__koi_root_used == 0 ]]
    '
    [ "$status" -eq 0 ]
    [ "$output" = $'first\nsecond' ]
    [ -z "$stderr" ]
}

@test "sourcing declaration files inside functions uses their pending block" {
    printf '%s\n' '__addarg mode -o -s m -d Mode' > "$BATS_TEST_TMPDIR/args.sh"
    run --separate-stderr bash -uc '
        source "$KOI_LIBRARY"
        configure() {
            local mode
            source "$1"
            __parseargs -m safe || return "$koi_status"
            printf "%s\n" "$mode"
        }
        configure "$1" || exit
        configure "$1" || exit
        [[ $__koi_root_used == 0 ]]
    ' app.sh "$BATS_TEST_TMPDIR/args.sh"
    [ "$status" -eq 0 ]
    [ "$output" = $'safe\nsafe' ]
    [ -z "$stderr" ]
}
