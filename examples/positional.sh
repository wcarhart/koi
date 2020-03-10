#!/bin/bash
set -e

source ../koi
koiname=positional.sh
koidescription="test of positional arguments"

function test {
	__addarg "-h" "--help" "help" "optional" "" "test a positional argument"
	__addarg "" "pos2" "positionalarray" "optional" "abc" "another positional array"
	__parseargs "$@"
	echo "$pos"
}

__koirun "$@"
