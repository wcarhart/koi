#!/usr/bin/env bash
source koi

koi::config name cli
koi::config description 'Back up project files'
koi::add_command archive -f archive -d 'Create a compressed archive'

archive() {
    local directory output
    koi::add_arg directory -p -r -d 'Directory to archive'
    koi::add_arg output -o -s o -l output -D backup.tar.gz -d 'Archive path'
    koi::parse "$@" || return "$koi_status"

    tar -czf "$output" -C "$directory" .
}

koi::run "$@"
