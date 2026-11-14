#!/usr/bin/env bash
source koi

main() {
    local directory output verbose
    koi::add_arg directory -p -r -d 'Directory to archive'
    koi::add_arg output -o -s o -l output -D backup.tar.gz -d 'Archive path'
    koi::add_arg verbose -f -s v -l verbose -d 'Print progress'
    koi::parse "$@" || return "$koi_status"

    tar -czf "$output" -C "$directory" . || return "$?"
    if (( verbose )); then
        printf 'Created %s\n' "$output"
    fi
}

main "$@"
