#!/usr/bin/env bash
source ./koi

# Print the parsed value
# Usage: main "$@"
#   $@  arguments forwarded to koi
main() {
    local name
    __addarg name -o -s n -l name -d 'Who to greet' -D 'world'
    __parseargs "$@" || return "$koi_status"

    printf '%s\n' "$name"
}

main "$@"
