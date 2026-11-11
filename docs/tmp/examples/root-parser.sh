#!/usr/bin/env bash

# shellcheck source=../../../koi
source "$(dirname -- "${BASH_SOURCE[0]}")/../../../koi" || exit $?

# Root descriptions are optional; help for this script starts with Usage.
mode=
verbose=0

__addarg mode -o -s m -l mode -D preview -d 'Operation mode'
__addarg verbose -f -s v -l verbose -d 'Enable verbose output'
__parseargs "$@" || exit "$koi_status"

printf 'mode=%q\nverbose=%s\n' "$mode" "$verbose"
