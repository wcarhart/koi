#!/usr/bin/env bash

# shellcheck source=../../../koi
source "$(dirname -- "${BASH_SOURCE[0]}")/../../../koi" || exit $?

# Print a mock copy operation using scalar positionals
# Usage: copy_file [-v] SOURCE [DIRECTORY]
#   SOURCE        required source file (empty text is accepted)
#   DIRECTORY     destination directory (default: .)
#   -v, --verbose print progress
#   -h, --help    show help without requiring SOURCE
copy_file() {
    local source destination verbose
    __adddescription 'Print a mock copy operation using scalar positionals.'
    __addarg source -p -r -d 'Source file'
    __addarg verbose -f -s v -l verbose -d 'Print progress'
    __addarg destination -p -D . -n directory -d 'Destination directory'
    __parseargs "$@" || return "$koi_status"

    printf 'source=%q\ndestination=%q\nverbose=%s\n' "$source" "$destination" "$verbose"
}

copy_file "$@"
