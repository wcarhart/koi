#!/usr/bin/env bash
# shellcheck disable=SC1090
source "${KOI_LIBRARY:?}"
koi::config description "Manage infrastructure commands"
koi::add_command infra --function infra --description 'Manage infrastructure'
infra() {
    printf 'HANDLER EXECUTED\n'
}
unrelated() {
    printf 'UNRELATED EXECUTED\n'
}
koi::run "$@"
