#!/bin/bash
set -e

source koi
koiname=verifyingfunction_example.sh
koidescription="Examples of verifying functions"

function run {
	__addarg "-h" "--help" "help" "optional" "" "Help text"
	__addarg "" "file" "positionalarray" "required" "" "A file argument" "__verifyfiletype json"
	__parseargs "$@"

	for f in "${file[@]}" ; do
		echo "File: $f"
	done
}

__koirun "$@"