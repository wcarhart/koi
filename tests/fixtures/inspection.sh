#!/usr/bin/env bash

# Capture one spec and let a checker examine caller-owned arrays
# Usage: capture_spec HANDLER CHECKER
#   HANDLER  parsing function or __koirun
#   CHECKER  assertion function called after successful collection
# Returns the inspection or assertion status without printing the spec
capture_spec() {
    local __koi_test_handler=$1 __koi_test_checker=$2
    local -a __koi_saved_commands=()
    local -A __koi_saved_handlers=()
    local -A __koi_saved_descriptions=()
    local -a __koi_saved_args=()
    local -A __koi_saved_arg_shorts=()
    local -A __koi_saved_arg_longs=()
    local -A __koi_saved_arg_kinds=()
    local -A __koi_saved_arg_descriptions=()
    local -A __koi_saved_arg_requireds=()
    local -A __koi_saved_arg_defaults=()
    local -A __koi_saved_arg_display_names=()
    local -A __koi_saved_meta=()
    local -i __koi_saved_spec_valid=1
    local __koi_inspection_sink=__koi_saved __koi_inspection_received=0
    local __koi_inspection_handler=$__koi_test_handler
    local __koi_inspection_depth=$((${#FUNCNAME[@]} + 2))
    if [[ $__koi_test_handler == __koirun ]]; then
        __koi_inspection_depth=$((${#FUNCNAME[@]} + 1))
    fi
    "$__koi_test_handler" --koi-inspect spec || return $?
    [[ $__koi_inspection_received == 1 ]] || return 9
    "$__koi_test_checker"
}
