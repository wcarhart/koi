#!/usr/bin/env bats
# Child shells evaluate their own application declarations.
# shellcheck disable=SC2016
bats_require_minimum_version 1.5.0

setup() {
    export KOI_LIBRARY="$BATS_TEST_DIRNAME/../koi"
    export KOI_INSPECTION="$BATS_TEST_DIRNAME/fixtures/inspection.sh"
}

# Run configuration scenarios with independent registration and output streams
# Usage: scenario BODY
#   BODY  Bash statements to execute after sourcing koi and the inspection helper
scenario() {
    run --separate-stderr bash -euc 'source "$KOI_LIBRARY"; source "$KOI_INSPECTION"; eval "$1"' app.sh "$1"
}

@test "boolean configuration validates exact values and permits both values at script scope" {
    local key value
    for key in help-subcommand verbose-help help-hints help-on-unknown-commands use-single-pipe-for-or-groups ignore-unknown-positionals error-on-scalar-duplicates; do
        for value in true false; do
            scenario "koi::config $key $value"
            [ "$status" -eq 0 ]
            [ -z "$output$stderr" ]
        done
        for value in TRUE False 1 0 yes no; do
            scenario "koi::config $key $value"
            [ "$status" -eq 2 ]
            [ "$stderr" = "koi: koi::config: $key must be true or false" ]
        done
    done
}

@test "root-only keys reject function scope and poison only that function block" {
    local key value
    while read -r key value; do
        scenario '
            bad() {
                koi::config '"$key $value"' 2>/dev/null || :
                koi::parse --help || return "$koi_status"
                return 9
            }
            if bad; then
                exit 8
            fi
            [[ $koi_status == 2 && $__koi_root_spec_valid == 1 ]]
            good() {
                koi::parse || return "$koi_status"
            }
            good
            koi::run --help >/dev/null
        '
        [ "$status" -eq 0 ]
        [ -z "$output$stderr" ]
    done <<'KEYS'
name app
description Text
help-width 80
help-subcommand true
verbose-help false
help-hints true
missing-command-message Required
help-on-unknown-commands true
KEYS
}

@test "duplicate configuration is an author error before help and a new block recovers" {
    scenario '
        bad() {
            koi::config ignore-unknown-positionals true
            koi::config ignore-unknown-positionals false 2>/dev/null || :
            koi::parse --help || return "$koi_status"
            return 9
        }
        if bad; then
            exit 8
        fi
        [[ $koi_status == 2 ]]
        good() {
            koi::config ignore-unknown-positionals true
            koi::parse surplus || return "$koi_status"
        }
        good
    '
    [ "$status" -eq 0 ]
    [ -z "$output$stderr" ]
}

@test "configuration-only blocks are consumed after help error and success" {
    scenario '
        leaf() {
            case ${1-} in
                configured)
                    shift
                    koi::config ignore-unknown-positionals true
                    ;;
            esac
            koi::parse "$@" || return "$koi_status"
        }
        leaf configured --help >/dev/null
        [[ ${#__koi_pending_meta[@]} == 0 ]]
        if leaf excess; then
            exit 9
        fi
        leaf configured excess
        if leaf excess; then
            exit 8
        fi
        leaf
        koi::run --help >/dev/null
        leaf configured excess
    '
    [ "$status" -eq 0 ]
    [ "$stderr" = $'koi: unsupported positional argument: \'excess\'\nkoi: unsupported positional argument: \'excess\'' ]
}

@test "root parsing policies do not become function defaults" {
    scenario '
        koi::config error-on-scalar-duplicates true
        koi::config ignore-unknown-positionals true
        leaf() {
            local value
            koi::add_arg value -o -s v -d Value
            koi::parse "$@" || return "$koi_status"
            [[ $value == second ]]
        }
        koi::add_command leaf -f leaf -d Leaf
        koi::run leaf -v first -v second
        if leaf surplus; then
            exit 9
        fi
    '
    [ "$status" -eq 0 ]
    [ "$stderr" = "koi: unsupported positional argument: 'surplus'" ]
}

@test "recursive and nested calls rebuild their own parsing policies" {
    scenario '
        leaf() {
            local depth=$1 value
            shift
            if (( depth > 0 )); then
                koi::config error-on-scalar-duplicates true
            fi
            koi::add_arg value -o -s v -d Value
            koi::parse "$@" || return "$koi_status"
            if (( depth > 0 )); then
                leaf 0 -v first -v second
            else
                [[ $value == second ]]
            fi
        }
        leaf 1 -v first
    '
    [ "$status" -eq 0 ]
    [ -z "$output$stderr" ]
}

@test "local false overrides routed OR formatting during ordinary and verbose help" {
    local request
    for request in 'branch child -h' 'help --verbose'; do
        scenario '
            koi::config use-single-pipe-for-or-groups true
            koi::config verbose-help true
            koi::add_command branch -f branch -d Branch
            branch() {
                koi::config use-single-pipe-for-or-groups false
                koi::add_command child -f child -d Child
                koi::parse "$@" || return "$koi_status"
            }
            child() {
                koi::add_arg a -f -s a -d A
                koi::add_arg b -f -s b -d B
                koi::add_group -o -r a b
                koi::parse "$@" || return "$koi_status"
                echo BAD
            }
            koi::run '"$request"
        [ "$status" -eq 0 ]
        [[ "$output" == *'branch child [-h] (-a || -b)'* ]]
        [[ "$output" != *BAD* ]]
        [ -z "$stderr" ]
    done
}

@test "inspection receives no synthetic arguments and retains explicit local policy" {
    scenario '
        leaf() {
            [[ $# == 0 ]] || return 9
            koi::config use-single-pipe-for-or-groups false
            koi::config error-on-scalar-duplicates true
            koi::config ignore-unknown-positionals false
            koi::parse "$@" || return "$koi_status"
            echo BAD
        }
        check() {
            [[ ${__koi_saved_meta[single-pipe]} == 0 &&
               ${__koi_saved_meta[error-on-scalar-duplicates]} == true &&
               ${__koi_saved_meta[ignore-unknown-positionals]} == false ]]
        }
        capture_spec leaf check
    '
    [ "$status" -eq 0 ]
    [ -z "$output$stderr" ]
}

@test "all former admin names can be explicitly registered without changing policy" {
    local spelling
    for spelling in koi-zero-argument-message koi-enable-help-on-unknown-commands koi-disable-help-subcommand koi-enable-verbose-help koi-enable-help-hints koi-use-single-pipe-for-or-groups koi-ignore-unknown-positionals koi-error-on-scalar-duplicates koi-error-on-duplicate koi-inspect; do
        scenario '
            leaf() {
                local flag
                koi::add_arg flag -f -l '"$spelling"' -d Flag
                koi::parse "$@" || return "$koi_status"
                [[ $flag == 1 ]]
            }
            leaf --'"$spelling"
        [ "$status" -eq 0 ]
        [ -z "$output$stderr" ]
        scenario 'koi::run --'"$spelling"
        [ "$status" -eq 2 ]
        [ "$stderr" = "koi: unsupported positional argument: '--$spelling'" ]
    done
}

@test "verbose help dependency is checked after declarations in either order" {
    local declarations
    for declarations in 'koi::config verbose-help true; koi::config help-subcommand false' \
        'koi::config help-subcommand false; koi::config verbose-help true'; do
        scenario "$declarations; koi::run --help"
        [ "$status" -eq 2 ]
        [ -z "$output" ]
        [ "$stderr" = 'koi: koi::run: verbose-help requires help-subcommand true' ]
    done
}

@test "explicit false keeps surplus errors and permits repeated scalar values" {
    scenario '
        leaf() {
            local value
            koi::config ignore-unknown-positionals false
            koi::config error-on-scalar-duplicates false
            koi::add_arg value -o -s v -d Value
            koi::parse "$@" || return "$koi_status"
            [[ $value == second ]]
        }
        leaf -v first -v second
        if leaf excess; then
            exit 9
        fi
    '
    [ "$status" -eq 0 ]
    [ "$stderr" = "koi: unsupported positional argument: 'excess'" ]
}
