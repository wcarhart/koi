#!/usr/bin/env bash
source koi

# Print the parsed value
# Usage: main "$@"
#   $@  arguments forwarded to koi
main() {
    local json yaml toml
    koi::add_arg json -f -l json -d 'Output JSON'
    koi::add_arg yaml -f -l yaml -d 'Output YAML'
    koi::add_arg toml -f -l toml -d 'Output TOML'
    koi::add_group --xor json yaml toml
    koi::parse "$@" || return "$koi_status"

    printf '%s\n' "json: $json"
    printf '%s\n' "yaml: $yaml"
    printf '%s\n' "toml: $toml"
}

main "$@"
