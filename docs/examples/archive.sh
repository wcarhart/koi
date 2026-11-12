#!/usr/bin/env bash
source koi

main() {
    local directory output verbose
    __addarg directory -p -r -d 'Directory to archive'
    __addarg output -o -s o -l output -D backup.tar.gz -d 'Archive path'
    __addarg verbose -f -s v -l verbose -d 'Print progress'
    __parseargs "$@" || return "$koi_status"

    tar -czf "$output" -C "$directory" . || return "$?"
    if (( verbose )); then
        printf 'Created %s\n' "$output"
    fi
}

main "$@"
