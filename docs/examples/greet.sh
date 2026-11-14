#!/usr/bin/env bash
source ./koi

# Print the parsed value
# Usage: main "$@"
#   $@  arguments forwarded to koi
main() {
    local name
    koi::add_arg name -o -s n -l name -d 'Who to greet' -D 'world'
    koi::parse "$@" || return "$koi_status"

    printf '%s\n' "name: $name"
}

main "$@"
