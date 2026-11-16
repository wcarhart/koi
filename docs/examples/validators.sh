#!/usr/bin/env bash
source koi

# Accept a known deployment environment
# Usage: valid_environment VALUE
#   VALUE  literal environment name
# Returns 0 to accept, 1 to reject
valid_environment() {
    [[ $1 == development || $1 == staging || $1 == production ]]
}

# Print accepted settings
main() {
    local count environment
    koi::add_arg count -o -l count -D 1 -d 'Integer count'
    koi::add_validator count --integer
    koi::add_arg environment -o -l environment -D development -d 'Deployment environment'
    koi::add_validator environment -f valid_environment -m 'must be development, staging, or production'
    koi::parse "$@" || return "$koi_status"

    printf 'count: %s\nenvironment: %s\n' "$count" "$environment"
}

main "$@"
