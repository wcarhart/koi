#!/bin/bash
set -e

source ../../koi
koiname=mutex_example.sh
koidescription="Example of how to use groups with koi"

function testgroup {
	__addarg "-h" "--help" "help" "optional" "" "help text"
	__addarg "-f" "--flag" "flag" "optional" "" "help text"
	__addarg "-g" "--glad" "flag" "optional" "" "help text"
	__addarg "-v" "--vlad" "storevalue" "optional" "" "help text"
	__addarg "" "pos" "positionalvalue" "optional" "" "help text"
	__addgroup "flags" "AND" "optional" "--glad" "--flag" "--vlad"
	__parseargs "$@"

	echo "flag: $flag"
	echo "glad: $glad"
}

function mixed {
	__addarg "-h" "--help" "help" "optional" "" "help text"
	__addarg "-f" "--flag" "flag" "optional" "" "help text"
	__addarg "-a" "--arg" "storevalue" "optional" "" "help text"
	__addgroup "group" "XOR" "optional" "--flag" "--arg"
	__parseargs "$@"

	echo "flag: '$flag'"
	echo "arg: '$arg'"
}

__koirun "$@"
