#!/bin/bash
set -e

source koi
koiname=koimain_example.sh
koidescription="Examples of running koi without subcommands via __koimain"

function __koimain {
	__addarg "-h" "--help" "help" "optional" "" "$koidescription"
	__addarg "-m" "--myval" "storevalue" "optional" "abc" "An optional argument"
	__addarg "" "myarg" "positionalvalue" "optional" "" "An optional positional argument"
	__addarg "-f" "--myflag" "flag" "optional" "" "An optional flag"
	__parseargs "$@"

	echo "myval: $myval"
	echo "myarg: $myarg"
	echo "myflag: $myflag"
}

__koirun "$@"