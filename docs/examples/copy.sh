#!/usr/bin/env bash
source ./koi

# Print a mock copy operation
# Usage: main [-v] SOURCE [DIRECTORY]
#   SOURCE        required source file
#   DIRECTORY     destination directory (default: .)
#   -v, --verbose print progress
main() {
    local source directory verbose
    koi::config description 'Preview a copy operation'
    koi::add_arg source -p -r -d 'Source file'
    koi::add_arg directory -p -D . -d 'Destination directory'
    koi::add_arg verbose -f -s v -l verbose -d 'Print progress'
    koi::parse "$@" || return "$koi_status"

    printf 'source=%s\ndirectory=%s\nverbose=%s\n' "$source" "$directory" "$verbose"
}

main "$@"
