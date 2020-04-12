#!/bin/bash

# ========= TESTS ========= #
function test_general_valid_combinations_a {
	__addarg "-h" "--help" "help" "optional" "" "help text"
	__addarg "-f" "--flag" "flag" "optional" "" "help text"
	__addarg "" "aaa" "positionalarray" "optional" "" "help text"
	__addarg "-b" "--bbb" "storearray" "required" "" "help text"
	__parseargs "$@"
	echo "$flag ${aaa[@]} ${bbb[@]}"
}

function test_general_valid_combinations_b {
	__addarg "-h" "--help" "help" "optional" "" "help text"
	__addarg "" "value0" "positionalvalue" "required" "" "help text"
	__addarg "" "value1" "positionalvalue" "required" "" "help text"
	__addarg "-a" "--aaa" "storevalue" "required" "" "help text"
	__addarg "-b" "--bbb" "storevalue" "optional" "10" "help text"
	__addarg "-c" "--ccc" "flag" "optional" "" "help text"
	__addarg "-d" "--ddd" "flag" "required" "" "help text"
	__parseargs "$@"
	echo "$bbb $value1 $ccc $aaa $value0 $ddd"
}

function test_general_valid_combinations_c {
	__addarg "-h" "--help" "help" "optional" "" "help text"
	__addarg "-a" "--aaa" "storearray" "optional" "" "help text" "verifytest ab"
	__addarg "-b" "--bbb" "storevalue" "optional" "" "help text" "verifytest ab"
	__addarg "-f" "--flag" "flag" "optional" "" "help text"
	__parseargs "$@"
	echo "${aaa[@]} ${bbb[@]} $flag"
}

function verifytest {
	if [[ "${1}${2}" != "abc" ]] ; then
		__errortext "incorrect"
	fi
}

# ========= ASSERTIONS ========= #
function koitest_run {
	runtest test_general_valid_combinations_a "1 pos0 pos1 barg0 barg1" "pos0" "-b" "barg0" "-f" "-b" "barg1" "pos1"
	runtest test_general_valid_combinations_b "10 pos1 0 arg pos0 1" "-d" "pos0" "-a" "arg" "pos1"
	runtest test_general_valid_combinations_c "c c c 0" "-a" "c" "-b" "c" "--aaa" "c"
}