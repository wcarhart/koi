#!/usr/bin/env bash
source koi

koi::config name cli
koi::config description 'Deploy and monitor your application'
koi::add_command status -f status -d 'Show running services'
koi::add_command deploy -f deploy -d 'Deploy services and infrastructure'

status() {
    local all
    koi::add_arg all -f -s a -l all -d 'Include stopped services'
    koi::parse "$@" || return "$koi_status"

    local options=()
    if (( all )); then
        options+=(--all)
    fi
    docker compose ps "${options[@]}"
}

deploy() {
    koi::add_command service -f deploy_service -d 'Start or update a service'
    koi::add_command stack -f deploy_stack -d 'Apply an infrastructure stack'
    koi::parse "$@" || return "$koi_status"
}

deploy_service() {
    local name file
    koi::add_arg name -p -r -d 'Service name'
    koi::add_arg file -o -s f -l file -D compose.yaml -d 'Compose file'
    koi::parse "$@" || return "$koi_status"

    docker compose -f "$file" up -d "$name"
}

deploy_stack() {
    local directory
    koi::add_arg directory -p -r -d 'Initialized Terraform directory'
    koi::parse "$@" || return "$koi_status"

    terraform -chdir="$directory" apply
}

koi::run "$@"
