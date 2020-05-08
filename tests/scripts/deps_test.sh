#!/bin/bash

source ../../koi
koiname=deps_test.sh
koidescription='Example of dependent arguments'

function testfunc {
	__addarg "-h" "--help" "help" "optional" "" "help text"
	__addarg "-a" "--arg" "storevalue" "optional" "" "help text"
	__addarg "-f" "--flag" "flag" "optional" "" "help text"
	__addarg "-g" "--glad" "flag" "optional" "" "help text"
	__addgroup "flags" "XOR" "optional" "--arg" "--glad" 
	__adddep "--flag" "--glad" "dependson" "--arg"
	__parseargs "$@"
}

__koirun "$@"
