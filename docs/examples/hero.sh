#!/usr/bin/env bash
source koi

main() {
    local name exclaim greeting
    koi::add_arg name --option -s n -l name -d 'Who to greet'
    koi::add_arg exclaim --flag -s e -l exclaim -d 'Greet loudly'
    koi::parse "$@" || return "$koi_status"

    greeting="Hello${name:+, $name}"
    if (( exclaim )); then
        greeting+='!'
    fi
    printf '%s\n' "$greeting"
}

main "$@"
