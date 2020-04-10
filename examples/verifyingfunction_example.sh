#!/bin/bash
set -e

source koi
koiname=verifyingfunction_example.sh
koidescription="Examples of verifying functions"

function run {
	__addarg "-h" "--help" "help" "optional" "" "Help text"
	__addarg "" "file" "positionalarray" "required" "" "A file argument" "__verifyfile"
	__parseargs "$@"

	for f in "${file[@]}" ; do
		echo "File: $f"
	done
}

function __verifyfile {
	if [[ ! -f "$1" ]] ; then
		__errortext "$koiname: err: no such file '$1'"
		return 1
	fi
}

__koirun "$@"