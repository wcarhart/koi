#!/usr/bin/env bash

# shellcheck source=../../../koi
source "$(dirname -- "${BASH_SOURCE[0]}")/../../../koi" || exit $?

__koiconfig description 'Replace generated help commands while retaining automatic help flags.'

__addcommand help -f custom_help -d 'Show custom guidance'
__addcommand tools -f tools -d 'Explore tools with their own custom help command'

# Print custom guidance after parsing optional topic selection
# Usage: custom_help [-t TOPIC]
#   -t, --topic TOPIC  topic to describe (default: overview)
# Demonstrates that -h still produces automatic help instead of this custom output
custom_help() {
    local topic

    __addarg topic -o -s t -l topic -D overview -d 'Guidance topic'
    __parseargs "$@" || return "$koi_status"

    printf 'Custom guidance for topic %q. No external documentation is loaded.\n' "$topic"
}

# Route to custom nested help or a mock tool operation
# Usage: tools COMMAND
#   COMMAND  help or run
tools() {
    __addcommand help -f custom_help -d 'Show custom tool guidance'
    __addcommand run -f run_tool -d 'Preview a tool invocation'
    __parseargs "$@" || return "$koi_status"
}

# Print a mock tool invocation
# Usage: run_tool [-n NAME]
#   -n, --name NAME  tool name (default: formatter)
run_tool() {
    local name

    __addarg name -o -s n -l name -D formatter -d 'Tool name'
    __parseargs "$@" || return "$koi_status"

    printf 'Would run tool %q.\n' "$name"
}

__koirun --koi-disable-help-subcommand "$@"
