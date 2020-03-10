#!/bin/bash
set -e

source ../koi
koiname=positional.sh
koidescription="test of positional arguments"

function test {
	__addarg "-h" "--help" "help" "optional" "" "test a positional argument"
	__addarg "" "symbol" "positionalarray" "required" "" "ticker symbols"
	__addarg "-u" "--user" "storearray" "optional" "" "users to use"
	__addarg "-p" "--port" "storevalue" "required" "" "port to use"
	__addarg "-q" "--quiet" "flag" "optional" "" "run in quiet mode"
	__parseargs "$@"
	echo "symbols: ${symbol[@]}"
	echo "user: $user"
	echo "port: $port"
	echo "quiet: $quiet"
}

__koirun "$@"
