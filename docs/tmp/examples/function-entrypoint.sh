#!/usr/bin/env bash

# shellcheck source=../../../koi
source "$(dirname -- "${BASH_SOURCE[0]}")/../../../koi" || exit $?

# Parse a function entrypoint without a runner or description
# Usage: main [-m MODE] [-v]
#   -m, --mode MODE  operation mode (default: preview)
#   -v, --verbose    enable verbose output
#   -h, --help       show help and skip business logic
main() {
    local mode verbose
    __addarg mode -o -s m -l mode -D preview -d 'Operation mode'
    __addarg verbose -f -s v -l verbose -d 'Enable verbose output'
    __parseargs "$@" || return "$koi_status"

    printf 'mode=%q\nverbose=%s\n' "$mode" "$verbose"
}

main "$@"
