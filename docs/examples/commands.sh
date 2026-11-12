#!/usr/bin/env bash
source ./koi

__koiconfig name app
__koiconfig description 'Manage deployments'
__addcommand deploy -f deploy -d 'Deployment commands'

# Register deployment commands
# Usage: deploy COMMAND "$@"
#   COMMAND  deployment command to select
#   $@       arguments forwarded to the selected command
deploy() {
    __addcommand app -f deploy_app -d 'Deploy an application'
    __parseargs "$@" || return "$koi_status"
}

# Print a mock application deployment
# Usage: deploy_app [-e ENVIRONMENT]
#   -e, --environment ENVIRONMENT  deployment environment (default: staging)
deploy_app() {
    local environment
    __addarg environment -o -s e -l environment -D staging -d 'Deployment environment'
    __parseargs "$@" || return "$koi_status"

    printf 'Would deploy to %s\n' "$environment"
}

__koirun "$@"
