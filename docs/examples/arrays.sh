#!/usr/bin/env bash
source koi

# Print repeated includes and input files
# Usage: main "$@"
#   $@  required SOURCE TARGET, optional files and repeated --include PATH
main() {
    local source target value
    local -a include files
    koi::add_arg include -o -a -s I -l include -n PATH -d 'Include a path'
    koi::add_arg source -p -r -d 'Source label'
    koi::add_arg target -p -r -d 'Target label'
    koi::add_arg files -p -a -d 'Input files'
    koi::parse "$@" || return "$koi_status"

    printf 'source=<%s>\ntarget=<%s>\n' "$source" "$target"
    for value in "${include[@]}"; do
        printf 'include=<%s>\n' "$value"
    done
    for value in "${files[@]}"; do
        printf 'file=<%s>\n' "$value"
    done
}

main "$@"
