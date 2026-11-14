#!/usr/bin/env bash
source ./koi

koi::config name 'app'
koi::config description 'Manage your application'
koi::config help-width 80
koi::add_command status -f status -d 'Show application status'

# Show application status
# Usage: status "$@"
#   $@  arguments forwarded to koi
status() {
    koi::parse "$@" || return "$koi_status"

    printf 'Ready\n'
}

koi::run "$@"
