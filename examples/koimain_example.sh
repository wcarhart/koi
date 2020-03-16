#!/bin/bash
set -e

source ../koi
koiname=koimain_example
koidescription="examples of running with subcommands"

function __koimain {
	__addarg "-h" "--help" "help" "optional" "" "test help message"
	__addarg "-m" "--myval" "storevalue" "optional" "abc" "myval"
	__addarg "" "myarg" "positionalvalue" "optional" "" "myarg"
	__addarg "-f" "--myflag" "flag" "optional" "" "myflag"
	__parseargs "$@"

	echo "myval: $myval"
	echo "myarg: $myarg"
	echo "myflag: $myflag"
}

__koirun "$@"