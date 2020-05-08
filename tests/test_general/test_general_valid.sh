#!/bin/bash

koirequirehelpactions=0

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
	__addarg "-a" "--aaa" "storearray" "optional" "" "help text" "__verifytest ab"
	__addarg "-b" "--bbb" "storevalue" "optional" "" "help text" "__verifytest ab"
	__addarg "-f" "--flag" "flag" "optional" "" "help text"
	__parseargs "$@"
	echo "${aaa[@]} ${bbb[@]} $flag"
}

function test_general_valid_combinations_d {
	__addarg "-a" "--arg" "storevalue" "optional" "" "help text"
	__addarg "-b" "--barg" "storevalue" "optional" "" "help text"
	__addarg "-f" "--flag" "flag" "optional" "" "help text"
	__parseargs "$@"
	echo "$arg $barg $flag"
}

function test_general_valid_crash_on_empty_arguments_a {
	__addarg "-a" "--aaa" "storevalue" "optional" "" "help text"
	__parseargs "$@"
	echo "$aaa"
}

function test_general_valid_crash_on_empty_arguments_b {
	__addarg "-a" "--aaa" "storevalue" "optional" "foo" "help text"
	__parseargs "$@"
	echo "$aaa"
}

function __verifytest {
	if [[ "${1}${2}" != "abc" ]] ; then
		__errortext "incorrect"
	fi
}

# ========= ASSERTIONS ========= #
function koitest_run {
	local function_list
	function_list=$(cat <<- EndOfExpected
	cleanup
	help
	indendedtext
	koitest_run
	list
	runtest
	test_general_valid_combinations_a
	test_general_valid_combinations_b
	test_general_valid_combinations_c
	test_general_valid_crash_on_empty_arguments_a
	test_general_valid_crash_on_empty_arguments_b
	EndOfExpected
	)
	runtest test_general_valid_combinations_a "1 pos0 pos1 barg0 barg1" "pos0" "-b" "barg0" "-f" "-b" "barg1" "pos1"
	runtest test_general_valid_combinations_b "10 pos1 0 arg pos0 1" "-d" "pos0" "-a" "arg" "pos1"
	runtest test_general_valid_combinations_c "c c c 0" "-a" "c" "-b" "c" "--aaa" "c"
	runtest test_general_valid_combinations_d "-b -f 0" "-a" "-b" "-b" "-f"
	runtest test_general_valid_crash_on_empty_arguments_a __error__ ""
	runtest test_general_valid_crash_on_empty_arguments_b __error__ ""
	runtest __listfunctions "$function_list"
}