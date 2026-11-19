#!/usr/bin/env bats
# Scenarios are evaluated in fresh application shells.
# shellcheck disable=SC2016
bats_require_minimum_version 1.5.0

setup() {
    export KOI_LIBRARY="$BATS_TEST_DIRNAME/../koi"
    export KOI_INSPECTION="$BATS_TEST_DIRNAME/fixtures/inspection.sh"
}

# Run a complete application scenario in a fresh shell
# Usage: scenario SOURCE
#   SOURCE  Bash declarations and assertions following library loading
scenario() {
    run --separate-stderr bash -euc 'source "$KOI_LIBRARY"; eval "$1"' app.sh "$1"
}

@test "default and explicit continue validate and assign before direct or routed actions" {
    for policy in default continue; do
        for route in direct routed; do
            scenario '
                policy='"$policy"'
                route='"$route"'
                child() { koi::parse "$@" || return "$koi_status"; }
                parent() {
                    local count environment
                    if [[ $policy != default ]]; then
                        koi::config missing-command "$policy"
                    fi
                    koi::add_command child -f child -d Child
                    koi::add_arg count -o -s n -r -d Count
                    koi::add_validator count --integer
                    koi::add_arg environment -o -s e -D staging -d Environment
                    koi::parse "$@" || return "$koi_status"
                    printf "%s:%s\n" "$count" "$environment"
                }
                if [[ $route == routed ]]; then
                    koi::add_command parent -f parent -d Parent
                    koi::run parent -n 3
                else
                    parent -n 3
                fi
            '
            [ "$status" -eq 0 ]
            [ "$output" = 3:staging ]
            [ -z "$stderr" ]
        done
    done
}

@test "continue rejects missing required values validators and relationships without assigning" {
    for args in '' '-n bad -t present' '-n 3'; do
        scenario '
            count=stale
            token=stale
            child() { :; }
            parent() {
                koi::add_command child -f child -d Child
                koi::add_arg count -o -s n -r -d Count
                koi::add_validator count --integer
                koi::add_arg token -o -s t -d Token
                koi::add_dependency count token
                koi::parse "$@" || return "$koi_status"
                echo BAD
            }
            if parent '"$args"'; then
                exit 9
            else
                [[ $? == 2 && $koi_status == 2 ]]
            fi
            [[ $count == stale && $token == stale ]]
        '
        [ "$status" -eq 0 ]
        [ -z "$output" ]
        [ -n "$stderr" ]
    done
}

@test "help and error policies bypass validation and assignment when no child is selected" {
    for policy in help error; do
        scenario '
            policy='"$policy"'
            count=stale
            reject() { echo BAD; return 1; }
            child() { :; }
            parent() {
                koi::config missing-command "$policy"
                koi::add_command child -f child -d Child
                koi::add_arg count -o -s n -r -d Count
                koi::add_validator count -f reject -m Rejected
                koi::parse "$@" || return "$koi_status"
                echo BAD
            }
            if parent; then
                [[ $policy == help && $koi_status == 0 ]]
            else
                [[ $policy == error && $? == 2 && $koi_status == 2 ]]
            fi
            [[ $count == stale ]]
        '
        [ "$status" -eq 0 ]
        [[ "$output" != *BAD* ]]
        if [[ $policy == help ]]; then
            [[ "$output" == *'[-h] -n COUNT COMMAND'* ]]
            [ -z "$stderr" ]
        else
            [ -z "$output" ]
            [ "$stderr" = 'koi: missing required command' ]
        fi
    done
}

@test "all policies preserve child status and prevent parent fallthrough" {
    for policy in continue help error; do
        for code in 0 1 2 42; do
            scenario '
                child() {
                    koi::parse "$@" || return "$koi_status"
                    return '"$code"'
                }
                parent() {
                    koi::config missing-command '"$policy"'
                    koi::add_command child -f child -d Child
                    koi::parse "$@" || return "$koi_status"
                    echo BAD
                }
                if parent child; then
                    [[ '"$code"' == 0 ]]
                else
                    [[ $? == '"$code"' ]]
                fi
            '
            [ "$status" -eq 0 ]
            [ -z "$output$stderr" ]
        done
    done
}

@test "explicit help overrides every policy but malformed input and unknown commands remain errors" {
    for policy in continue help error; do
        for args in '--help' '--bogus' 'typo'; do
            scenario '
                child() { :; }
                parent() {
                    koi::config missing-command '"$policy"'
                    koi::add_command child -f child -d Child
                    koi::parse "$@" || return "$koi_status"
                    echo BAD
                }
                parent '"$args"'
            '
            [[ "$output" != *BAD* ]]
            if [[ $args == --help ]]; then
                [ "$status" -eq 0 ]
                [ -z "$stderr" ]
                if [[ $policy == continue ]]; then
                    [[ "$output" == *'[-h] [COMMAND]'* ]]
                else
                    [[ "$output" == *'[-h] COMMAND'* ]]
                fi
            else
                [ "$status" -eq 2 ]
                [ -z "$output" ]
                [ -n "$stderr" ]
            fi
        done
    done
}

@test "policies neither inherit nor survive consumption and have no effect on leaves" {
    scenario '
        grandchild() { :; }
        child() {
            koi::add_command grandchild -f grandchild -d Grandchild
            koi::parse "$@" || return "$koi_status"
            echo child
        }
        parent() {
            koi::config missing-command help
            koi::add_command child -f child -d Child
            koi::parse "$@" || return "$koi_status"
            echo BAD
        }
        parent child
        sibling() {
            koi::add_command child -f child -d Child
            if [[ ${1-} == configured ]]; then
                shift
                koi::config missing-command help
            fi
            koi::parse "$@" || return "$koi_status"
            echo sibling
        }
        sibling configured >/dev/null
        sibling
        for policy in continue help error; do
            leaf() {
                koi::config missing-command "$policy"
                koi::parse "$@" || return "$koi_status"
                echo leaf
            }
            leaf
        done
    '
    [ "$status" -eq 0 ]
    [ "$output" = $'child\nsibling\nleaf\nleaf\nleaf' ]
    [ -z "$stderr" ]
}

@test "inspection and verbose help stop before branch default actions" {
    scenario '
        source "$KOI_INSPECTION"
        child() { koi::parse "$@" || return "$koi_status"; echo BAD; }
        parent() {
            koi::config missing-command continue
            koi::add_command child -f child -d Child
            koi::parse "$@" || return "$koi_status"
            echo BAD
        }
        check() { [[ ${__koi_saved_meta[missing-command]} == continue ]]; }
        capture_spec parent check
        koi::config verbose-help true
        koi::add_command parent -f parent -d Parent
        koi::run help --verbose
    '
    [ "$status" -eq 0 ]
    [[ "$output" == *'parent [-h] [COMMAND]'* ]]
    [[ "$output" != *BAD* ]]
    [ -z "$stderr" ]
}

@test "missing-command rejects root scope invalid values and duplicates and recovers" {
    scenario 'koi::config missing-command continue'
    [ "$status" -eq 2 ]
    [ "$stderr" = 'koi: koi::config: function-only config key: missing-command' ]
    for declaration in 'bogus' 'CONTINUE' 'true' '""' 'continue; koi::config missing-command help'; do
        scenario '
            bad() {
                koi::config missing-command '"$declaration"' 2>/dev/null || :
                koi::parse --help || return "$koi_status"
                echo BAD
            }
            if bad; then
                exit 9
            else
                [[ $? == 2 ]]
            fi
            good() { koi::parse || return "$koi_status"; }
            good
            koi::run --help >/dev/null
        '
        [ "$status" -eq 0 ]
        [[ "$output" != *BAD* ]]
    done
}

@test "continue enforces groups while help and error skip supplied value validation" {
    scenario '
        child() { :; }
        parent() {
            local count=stale a=stale b=stale
            koi::config missing-command "$1"
            shift
            koi::add_command child -f child -d Child
            koi::add_arg count -o -s n -d Count
            koi::add_validator count --integer
            koi::add_arg a -f -s a -d A
            koi::add_arg b -f -s b -d B
            koi::add_group --xor --required a b
            koi::parse "$@" || return "$koi_status"
            printf "%s:%s:%s\n" "$count" "$a" "$b"
        }
        if parent continue -n 3 2>/dev/null; then
            exit 9
        else
            [[ $? == 2 ]]
        fi
        parent continue -n 3 -a
        parent help -n bad >/dev/null
        if parent error -n bad; then
            exit 8
        else
            [[ $? == 2 ]]
        fi
    '
    [ "$status" -eq 0 ]
    [ "$output" = 3:1:0 ]
    [ "$stderr" = 'koi: missing required command' ]
}
