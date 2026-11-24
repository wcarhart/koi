#!/usr/bin/env bash
source koi

koi::config name 'app.sh'

# Print the parsed value
# Usage: main "$@"
#   $@  arguments forwarded to koi
main() {
    local upload token account
    koi::add_arg upload -f -l upload -d 'Upload files'
    koi::add_arg token -o -l token -d 'Authentication token'
    koi::add_arg account -o -l account -d 'Account name'
    koi::add_dependency upload --requires token account
    koi::parse "$@" || return "$koi_status"

    printf '%s\n' "upload: $upload"
    printf '%s\n' "token: $token"
    printf '%s\n' "account: $account"
}

main "$@"
