#!/bin/bash

source ../../koi
koiname=deps_test.sh
koidescription='Example of dependent arguments'

function testfunc {
	__addarg "-h" "--help" "help" "optional" "" "help text"
	__addarg "-a" "--arg" "storevalue" "optional" "" "help text"
	__addarg "-b" "--barg" "storevalue" "optional" "" "help text"
	__addarg "-f" "--flag" "flag" "optional" "" "help text"
	__addarg "-g" "--glad" "flag" "optional" "" "help text"
	__addgroup "flags" "XOR" "optional" "--flag" "--glad"
	__adddep "--flag" "--glad" "dependson" "--arg"
	__adddep "--flag" "dependson" "--arg"
	__adddep "--flag" "dependson" "--barg"
	__adddep "--glad" "dependson" "--barg"
	__parseargs "$@"

	echo "arg:  $arg"
	echo "barg: $barg"
	echo "flag: $flag"
	echo "glad: $glad"
}

__koirun "$@"
