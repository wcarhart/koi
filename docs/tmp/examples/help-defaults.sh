#!/usr/bin/env bash

# shellcheck source=../../../koi
source "$(dirname -- "${BASH_SOURCE[0]}")/../../../koi" || exit $?

# Omit root configuration to demonstrate the default help policy and script name.
__addcommand greet -f greet -d 'Print a mock greeting'

# Print a greeting after successful leaf parsing
# Usage: greet [-n NAME]
#   -n, --name NAME  greeting recipient (default: world)
greet() {
    local name

    __addarg name -o -s n -l name -D world -d 'Greeting recipient'
    __parseargs "$@" || return "$koi_status"

    printf 'Hello, %s!\n' "$name"
}

__koirun "$@"
