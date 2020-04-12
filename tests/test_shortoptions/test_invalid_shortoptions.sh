#!/bin/bash

koirequirehelpactions=0

# ========= TESTS ========= #
function test_non_alphanumeric_shortoption {
	__addarg "-_" "--aaa" "storevalue" "optional" "" "help text"
	__parseargs "$@"
	echo "$aaa"
}

function test_non_unique_shortoptions {
	__addarg "-a" "--aaa" "storevalue" "optional" "" "help text"
	__addarg "-a" "--bbb" "storevalue" "optional" "" "help text"
	__parseargs "$@"
	echo "$aaa $bbb"
}

function test_number_shortoptions {
	__addarg "-9" "--aaa" "storevalue" "optional" "" "help text"
	__parseargs "$@"
	echo "$aaa"
}

function test_invalid_length_long {
	__addarg "-aaa" "--aaa" "storevalue" "optional" "" "help text"
	__parseargs "$@"
	echo "$aaa"
}

function test_invalid_length_short {
	__addarg "-" "--aaa" "storevalue" "optional" "" "help text"
	__parseargs "$@"
	echo "$aaa"
}

function test_invalid_no_dash {
	__addarg "a" "--aaa" "storevalue" "optional" "" "help text"
	__parseargs "$@"
	echo "$aaa"
}

function test_invalid_more_than_one_dash {
	__addarg "--aaa" "--aaa" "storevalue" "optional" "" "help text"
	__parseargs "$@"
	echo "$aaa"
}

# ========= ASSERTIONS ========= #
function koitest_run {
	runtest test_non_alphanumeric_shortoption __error__ "-_" "arg"
	runtest test_non_unique_shortoptions __error__ "-a" "arg" "-a" "arg"
	runtest test_number_shortoptions __error__ "-9" "arg"
	runtest test_invalid_length_long __error__ "-aaa" "arg"
	runtest test_invalid_length_short __error__ "-" "arg"
	runtest test_invalid_no_dash __error__ "a" "arg"
	runtest test_invalid_more_than_one_dash __error__ "--aaa" "arg"
}