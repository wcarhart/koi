#!/bin/bash
set -e

source ../../koi
koiname=mutex_example.sh
koidescription="Example of how to use groups with koi"

function testgroup {
	__addarg "-h" "--help" "help" "optional" "" "help text"
	__addarg "-f" "--flag" "flag" "optional" "" "help text"
	__addarg "-g" "--glad" "flag" "optional" "" "help text"
	__addgroup "flags" "AND" "--glad" "--flag"
	__parseargs "$@"

	echo "flag: $flag"
	echo "glad: $glad"
}

__koirun "$@"
