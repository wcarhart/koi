#!/usr/bin/env bash
source koi

# Greet the requested person
# Usage: main "$@"
#   $@  command line arguments forwarded to koi
main() {
    local name
    __addarg name --option --short n --long name --description 'Who to greet' --default 'world'
    __parseargs "$@" || return "$koi_status"

    printf '%s\n' "Hello, ${name}!"
}

main "$@"
