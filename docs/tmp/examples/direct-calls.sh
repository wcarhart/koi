#!/usr/bin/env bash

# shellcheck source=../../../koi
source "$(dirname -- "${BASH_SOURCE[0]}")/../../../koi" || exit $?

# Print values from one independent parsing context
# Usage: show_context [-m MODE] [-v]
#   -m, --mode MODE  helper mode (default: safe)
#   -v, --verbose    helper verbosity (default: off)
show_context() {
    local mode verbose

    __adddescription 'Parse one helper call with fresh defaults and local destinations.'
    __addarg mode -o -s m -l mode -D safe -d 'Helper mode'
    __addarg verbose -f -s v -l verbose -d 'Helper verbosity'
    __parseargs "$@" || return "$koi_status"

    printf 'helper: mode=%q verbose=%s\n' "$mode" "$verbose"
}

# Demonstrate repeated parsing without overwriting the caller's local destinations
# Usage: main [-m MODE] [-v] [-H]
#   -m, --mode MODE       caller mode (default: parent)
#   -v, --verbose         caller verbosity
#   -H, --helper-help     show direct helper help between normal helper calls
main() {
    local mode verbose helper_help

    __adddescription 'Call a koi-powered helper repeatedly while preserving the caller context.'
    __addarg mode -o -s m -l mode -D parent -d 'Caller mode'
    __addarg verbose -f -s v -l verbose -d 'Caller verbosity'
    __addarg helper_help -f -s H -l helper-help -d 'Include help for a direct helper invocation'
    __parseargs "$@" || return "$koi_status"

    printf 'caller before: mode=%q verbose=%s\n' "$mode" "$verbose"
    show_context -m first -v || return $?
    if (( helper_help )); then
        show_context --help || return $?
    fi
    show_context || return $?
    show_context -m last || return $?
    printf 'caller after: mode=%q verbose=%s\n' "$mode" "$verbose"
}

main "$@"
