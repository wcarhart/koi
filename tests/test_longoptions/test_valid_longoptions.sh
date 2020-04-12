#!/bin/bash

koirequirehelpactions=0

# ========= TESTS ========= #
function test_valid_longoption_singular {
	__addarg "-a" "--aaa" "storevalue" "optional" "" "help text"
	__parseargs "$@"
	echo "$aaa"
}

function test_valid_longoption_multiple {
	__addarg "-a" "--aaa" "storevalue" "optional" "" "help text"
	__addarg "-b" "--bbb" "storevalue" "optional" "" "help text"
	__parseargs "$@"
	echo "$aaa $bbb"
}

function test_valid_longoption_contains_number {
	__addarg "-a" "--a0" "storevalue" "optional" "" "help text"
	__parseargs "$@"
	echo "$a0"
}

# ========= ASSERTIONS ========= #
function koitest_run {
	runtest test_valid_longoption_singular arg "--aaa" "arg"
	runtest test_valid_longoption_multiple "arg barg" "--aaa" "arg" "--bbb" "barg"
	runtest test_valid_longoption_contains_number arg "--a0" "arg"
}