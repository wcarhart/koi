#!/usr/bin/env bats

bats_require_minimum_version 1.5.0

setup() {
    # shellcheck source=koi
    source "$BATS_TEST_DIRNAME/../koi"
}

# Attempt an invalid declaration and verify it leaves the registry unchanged.
# Usage: reject_registration "$@"
#   $@  the declaration arguments
reject_registration() {
    local before after result
    before=$(declare -p __koi_commands __koi_handlers __koi_descriptions)
    __addcommand "$@"
    result=$?
    after=$(declare -p __koi_commands __koi_handlers __koi_descriptions)
    if [[ $before != "$after" ]]; then
        printf 'Registry changed after rejection\n' >&2
        return 1
    fi
    return "$result"
}

@test "long options register command metadata" {
    __addcommand deploy --function deploy_application --description "Deploy application"
    [ "${__koi_commands[0]}" = deploy ]
    [ "${__koi_handlers[deploy]}" = deploy_application ]
    [ "${__koi_descriptions[deploy]}" = 'Deploy application' ]
}

@test "short options register command metadata" {
    __addcommand deploy -f deploy_application -d 'Deploy application'
    [ "${__koi_commands[0]}" = deploy ]
    [ "${__koi_handlers[deploy]}" = deploy_application ]
    [ "${__koi_descriptions[deploy]}" = 'Deploy application' ]
}

@test "option aliases can be mixed and supplied in either order" {
    __addcommand deploy -d 'Deploy application' --function deploy_application
    [ "${__koi_handlers[deploy]}" = deploy_application ]
    [ "${__koi_descriptions[deploy]}" = 'Deploy application' ]
}

@test "registration is silent and does not require a defined handler" {
    run --separate-stderr __addcommand deploy -f not_defined -d Deploy
    [ "$status" -eq 0 ]
    [ -z "$output" ]
    [ -z "$stderr" ]
}

@test "command names accept digits, hyphens and underscores" {
    __addcommand 1-deploy_job -f _deploy_job2 -d Deploy
    [ "${__koi_commands[0]}" = 1-deploy_job ]
    [ "${__koi_handlers[1-deploy_job]}" = _deploy_job2 ]
}

@test "description preserves whitespace and shell-looking text literally" {
    local description=$'  first line\nsecond "$value" \\ end  '
    __addcommand deploy -f deploy -d "$description"
    [ "${__koi_descriptions[deploy]}" = "$description" ]
}

@test "missing command name fails without registration" {
    run --separate-stderr reject_registration
    [ "$status" -eq 2 ]
    [ -z "$output" ]
    [ "$stderr" = 'koi: __addcommand: command name required' ]
}

@test "invalid command names fail without registration" {
    for name in '' 'two words' 'bad/name' '-name' '_name'; do
        run --separate-stderr reject_registration "$name" -f handler -d Description
        [ "$status" -eq 2 ]
        [ -z "$output" ]
        [ "$stderr" = "koi: __addcommand: invalid command name: '$name'" ]
    done
}

@test "missing or invalid handler fails without registration" {
    for handler in '' 'bad-name' 'two words' '1handler'; do
        run --separate-stderr reject_registration deploy -f "$handler" -d Description
        [ "$status" -eq 2 ]
        [ -z "$output" ]
        [ "$stderr" = 'koi: __addcommand: handler identifier required' ]
    done
    run --separate-stderr reject_registration deploy -d Description
    [ "$status" -eq 2 ]
    [ "$stderr" = 'koi: __addcommand: handler identifier required' ]
}

@test "missing or empty description fails without registration" {
    run --separate-stderr reject_registration deploy -f handler
    [ "$status" -eq 2 ]
    [ -z "$output" ]
    [ "$stderr" = 'koi: __addcommand: nonempty description required' ]
    run --separate-stderr reject_registration deploy -f handler -d ''
    [ "$status" -eq 2 ]
    [ -z "$output" ]
    [ "$stderr" = 'koi: __addcommand: nonempty description required' ]
}

@test "options missing a value fail without registration" {
    for option in -f --function; do
        run --separate-stderr reject_registration deploy "$option"
        [ "$status" -eq 2 ]
        [ -z "$output" ]
        [ "$stderr" = 'koi: __addcommand: invalid --function' ]
    done
    for option in -d --description; do
        run --separate-stderr reject_registration deploy -f handler "$option"
        [ "$status" -eq 2 ]
        [ -z "$output" ]
        [ "$stderr" = 'koi: __addcommand: invalid --description' ]
    done
}

@test "duplicate function options fail across short and long aliases" {
    for first in -f --function; do
        for second in -f --function; do
            run --separate-stderr reject_registration deploy "$first" handler "$second" other -d Description
            [ "$status" -eq 2 ]
            [ -z "$output" ]
            [ "$stderr" = 'koi: __addcommand: invalid --function' ]
        done
    done
}

@test "duplicate description options fail across short and long aliases" {
    for first in -d --description; do
        for second in -d --description; do
            run --separate-stderr reject_registration deploy -f handler "$first" Description "$second" Other
            [ "$status" -eq 2 ]
            [ -z "$output" ]
            [ "$stderr" = 'koi: __addcommand: invalid --description' ]
        done
    done
}

@test "duplicate command preserves the existing registration" {
    __addcommand deploy -f original -d Original
    run --separate-stderr reject_registration deploy -f replacement -d Replacement
    [ "$status" -eq 2 ]
    [ -z "$output" ]
    [ "$stderr" = 'koi: duplicate command: deploy' ]
}

@test "unknown options including reserved help flags are rejected" {
    for option in --unknown -h --help; do
        run --separate-stderr reject_registration deploy -f handler "$option" Description
        [ "$status" -eq 2 ]
        [ -z "$output" ]
        [ "$stderr" = "koi: __addcommand: unknown registration parameter: $option" ]
    done
}
