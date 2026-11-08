#!/usr/bin/env bash
# shellcheck disable=SC1090
source "${KOI_LIBRARY:?}"
__addcommand infra --function infra --description 'Manage infrastructure'
infra() {
    printf 'HANDLER EXECUTED\n'
}
unrelated() {
    printf 'UNRELATED EXECUTED\n'
}
__koirun "$@"
