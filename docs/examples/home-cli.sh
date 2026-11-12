#!/usr/bin/env bash
source koi

__koiconfig name cli
__koiconfig description 'Deploy and monitor your application'
__addcommand status -f status -d 'Show running services'
__addcommand deploy -f deploy -d 'Deploy services and infrastructure'

status() {
    local all
    __addarg all -f -s a -l all -d 'Include stopped services'
    __parseargs "$@" || return "$koi_status"

    local options=()
    if (( all )); then
        options+=(--all)
    fi
    docker compose ps "${options[@]}"
}

deploy() {
    __addcommand service -f deploy_service -d 'Start or update a service'
    __addcommand stack -f deploy_stack -d 'Apply an infrastructure stack'
    __parseargs "$@" || return "$koi_status"
}

deploy_service() {
    local name file
    __addarg name -p -r -d 'Service name'
    __addarg file -o -s f -l file -D compose.yaml -d 'Compose file'
    __parseargs "$@" || return "$koi_status"

    docker compose -f "$file" up -d "$name"
}

deploy_stack() {
    local directory
    __addarg directory -p -r -d 'Initialized Terraform directory'
    __parseargs "$@" || return "$koi_status"

    terraform -chdir="$directory" apply
}

__koirun "$@"
