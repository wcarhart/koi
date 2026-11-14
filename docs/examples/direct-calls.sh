#!/usr/bin/env bash
source koi

archive_directory() {
    local source output
    koi::add_arg source -o -s s -l source -r -d 'Source directory'
    koi::add_arg output -o -s o -l output -r -d 'Archive path'
    koi::parse "$@" || return "$koi_status"

    tar -czf "$output" -C "$source" .
}

package_release() {
    local directory output
    koi::add_arg directory -p -r -d 'Release directory'
    koi::add_arg output -o -s o -l output -D release.tar.gz -d 'Release archive'
    koi::parse "$@" || return "$koi_status"

    archive_directory --source "$directory" --output "$output"
    printf 'Packaged %s\n' "$output"
}

package_release src --output release.tar.gz
