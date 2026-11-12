#!/usr/bin/env bash
source koi

archive_directory() {
    local source output
    __addarg source -o -s s -l source -r -d 'Source directory'
    __addarg output -o -s o -l output -r -d 'Archive path'
    __parseargs "$@" || return "$koi_status"

    tar -czf "$output" -C "$source" .
}

package_release() {
    local directory output
    __addarg directory -p -r -d 'Release directory'
    __addarg output -o -s o -l output -D release.tar.gz -d 'Release archive'
    __parseargs "$@" || return "$koi_status"

    archive_directory --source "$directory" --output "$output"
    printf 'Packaged %s\n' "$output"
}

package_release src --output release.tar.gz
