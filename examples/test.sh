#!/bin/bash
set -e

source ../koi

function testfunc {
	__addarg "-h" "--help" "help" "optional" "" "Help text"
	__addarg "" "mycoolarg" "positionalarray" "required" "" "A really, really, really, really, really long help text that goes on and on and on for a really long time to make a point"
	__addarg "-f" "--flag" "flag" "optional" "" "Another argument, this time a flag, with a super, super, super long description that's way longer than it should be"
	__addarg "-g" "--glag" "flag" "optional" "" "Another argument, this time a flag, aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa with a super, super, super long description that's way longer than it should be and it just keeps going and going and going and going and when will it ever stop jesus christ"
	# __addarg "-s" "--stor" "storevalue" "required" "" "help text"
	__parseargs "$@"

	for a in "${mycoolarg[@]}" ; do
		echo "found arg: '$a'"
	done
}

__koirun "$@"