#!/usr/bin/env bash
source koi

main() {
    local name identifier token
    koi::add_arg name -o -s n -l name -d Name -D world
    koi::add_arg identifier -o -s i -l identifier -d Identifier -D anonymous
    koi::add_arg token -o -s t -l token -d Token
    koi::add_group --xor name identifier
    koi::parse "$@" || return "$koi_status"

    printf '%s\n' "name: $name"
    printf '%s\n' "identifier: $identifier"
    printf '%s\n' "token: $token"
}

main "$@"
