#!/usr/bin/env bash
source ./koi

# Print a mock copy operation
# Usage: main [-v] SOURCE [DIRECTORY]
#   SOURCE        required source file
#   DIRECTORY     destination directory (default: .)
#   -v, --verbose print progress
main() {
    local source directory verbose
    __adddescription 'Preview a copy operation'
    __addarg source -p -r -d 'Source file'
    __addarg directory -p -D . -d 'Destination directory'
    __addarg verbose -f -s v -l verbose -d 'Print progress'
    __parseargs "$@" || return "$koi_status"

    printf 'source=%s\ndirectory=%s\nverbose=%s\n' "$source" "$directory" "$verbose"
}

main "$@"
