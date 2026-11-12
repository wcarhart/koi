#!/usr/bin/env bash
source koi

main() {
    local name exclaim greeting
    __addarg name --option -s n -l name -d 'Who to greet'
    __addarg exclaim --flag -s e -l exclaim -d 'Greet loudly'
    __parseargs "$@" || return "$koi_status"

    greeting="Hello${name:+, $name}"
    if (( exclaim )); then
        greeting+='!'
    fi
    printf '%s\n' "$greeting"
}

main "$@"
