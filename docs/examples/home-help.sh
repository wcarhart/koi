#!/usr/bin/env bash
source koi

__koiconfig name cli
__koiconfig description 'Back up project files'
__addcommand archive -f archive -d 'Create a compressed archive'

archive() {
    local directory output
    __addarg directory -p -r -d 'Directory to archive'
    __addarg output -o -s o -l output -D backup.tar.gz -d 'Archive path'
    __parseargs "$@" || return "$koi_status"

    tar -czf "$output" -C "$directory" .
}

__koirun "$@"
