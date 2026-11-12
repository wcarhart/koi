#!/usr/bin/env bash
source ./koi

__koiconfig name 'app'
__koiconfig description 'Manage your application'
__koiconfig help-width 80
__addcommand status -f status -d 'Show application status'

# Show application status
# Usage: status "$@"
#   $@  arguments forwarded to koi
status() {
    __parseargs "$@" || return "$koi_status"

    printf 'Ready\n'
}

__koirun "$@"
