#!/bin/bash

source ../../koi
koiname=jointargs.sh
koidescription="Testing joint arguments"

function testfunc {
	__addarg "-h" "--help" "help" "optional" "" "help text"
	__addarg "" "--flag" "flag" "optional" "" "help text"
	__addarg "-g" "--glad" "flag" "optional" "" "help text"
	__parseargs "$@"
	echo "flag: $flag"
	echo "glad: $glad"
}

__koirun "$@"
