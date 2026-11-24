#!/usr/bin/env bash
source koi

koi::config name app
koi::add_command deploy -f deploy_service -d 'Deploy services'
koi::add_command config -f config -d 'Manage configuration'

# Handle the deploy command
# Usage: deploy_service "$@"
#   $@  arguments forwarded to koi
deploy_service() {
    koi::parse "$@" || return "$koi_status"

    printf '%s\n' 'handler: deploy_service'
}

# Handle the config command
# Usage: config "$@"
#   $@  arguments forwarded to koi
config() {
    koi::add_command get -f config_get -d 'Read configuration'
    koi::add_command set -f config_set -d 'Write configuration'
    koi::parse "$@" || return "$koi_status"

    printf '%s\n' 'handler: config'
}

# Handle the get command
# Usage: config_get "$@"
#   $@  arguments forwarded to koi
config_get() {
    koi::parse "$@" || return "$koi_status"

    printf '%s\n' 'handler: config_get'
}

# Handle the set command
# Usage: config_set "$@"
#   $@  arguments forwarded to koi
config_set() {
    koi::parse "$@" || return "$koi_status"

    printf '%s\n' 'handler: config_set'
}

koi::run "$@"
