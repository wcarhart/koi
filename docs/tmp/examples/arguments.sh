#!/usr/bin/env bash

# shellcheck source=../../../koi
source "$(dirname -- "${BASH_SOURCE[0]}")/../../../koi" || exit $?

# Print parsed scalar arguments without changing application state
# Usage: show_arguments -n NAME [-e ENV] [-m TEXT] [-v] [-q]
#   -n, --name NAME        required name; an explicitly empty value is accepted
#   -e, --environment ENV  environment (default: development)
#   -m, --message TEXT     literal text (default: empty)
#   -v, --verbose          enable verbose output
#   -q, --quiet            enable quiet mode; may be clustered with -v
#   -h, --help             show help without requiring NAME
#   --koi-error-on-duplicates  reject repeated values instead of keeping the last
# Prints shell-escaped values so empty strings, whitespace, and newlines are visible
show_arguments() {
    local name environment message verbose quiet

    __adddescription 'Inspect scalar options, defaults, flags, and literal argument values.'
    __addarg name -o -s n -l name -r -d 'Name to display'
    __addarg environment -o -s e -l environment -n env -D development -d 'Target environment'
    __addarg message -o -s m -l message -n text -D '' -d 'Literal text to display'
    __addarg verbose -f -s v -l verbose -d 'Enable verbose output'
    __addarg quiet -f -s q -l quiet -d 'Enable quiet mode'
    __parseargs "$@" || return "$koi_status"

    printf 'name=%q\nenvironment=%q\nmessage=%q\nverbose=%s\nquiet=%s\n' \
        "$name" "$environment" "$message" "$verbose" "$quiet"
}

show_arguments "$@"
