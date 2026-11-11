#!/usr/bin/env bash

# shellcheck source=../../../koi
source "$(dirname -- "${BASH_SOURCE[0]}")/../../../koi" || exit $?

__koiconfig description 'Try runner errors and the opt-in root help fallback for unknown commands.'

__addcommand ping -f ping -d 'Print a mock connectivity response'

# Print a mock response without connecting to a host
# Usage: ping [-n NAME]
#   -n, --name NAME  display name (default: local)
ping() {
    local name

    __addarg name -o -s n -l name -D local -d 'Display name; no connection is attempted'
    __parseargs "$@" || return "$koi_status"

    printf 'Mock response from %q.\n' "$name"
}

__koirun \
    --koi-zero-argument-message 'Choose a command, or use --help to see available commands.' \
    --koi-enable-help-on-unknown-commands \
    "$@"
