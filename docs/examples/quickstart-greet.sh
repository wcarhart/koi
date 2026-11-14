#!/usr/bin/env bash
source koi

# Greet the requested person
# Usage: main "$@"
#   $@  command line arguments forwarded to koi
main() {
    local name
    koi::add_arg name --option --short n --long name --description 'Who to greet' --default 'world'
    koi::parse "$@" || return "$koi_status"

    printf '%s\n' "Hello, ${name}!"
}

main "$@"
