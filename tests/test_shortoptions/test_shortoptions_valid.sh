#!/bin/bash

koirequirehelpactions=0

# ========= TESTS ========= #
function test_shortoption_valid_no_shortoption_with_longoption_singular {
	__addarg "" "--long" "storevalue" "optional" "" "help text"
	__parseargs "$@"
	echo "$long"
}

function test_shortoption_valid_no_shortoption_with_longoption_multiple {
	__addarg "" "--aaa" "storevalue" "optional" "" "help text"
	__addarg "" "--bbb" "storevalue" "optional" "" "help text"
	__parseargs "$@"
	echo "$aaa $bbb"
}

function test_shortoption_valid_valid_shortoption_singular {
	__addarg "-a" "--aaa" "storevalue" "optional" "" "help text"
	__parseargs "$@"
	echo "$aaa"
}

function test_shortoption_valid_valid_shortoption_multiple {
	__addarg "-a" "--aaa" "storevalue" "optional" "" "help text"
	__addarg "-b" "--bbb" "storevalue" "optional" "" "help text"
	__parseargs "$@"
	echo "$aaa $bbb"
}

# ========= ASSERTIONS ========= #
function koitest_run {
	runtest test_shortoption_valid_no_shortoption_with_longoption_singular long "--long" "long"
	runtest test_shortoption_valid_no_shortoption_with_longoption_multiple "arg barg" "--aaa" "arg" "--bbb" "barg"
	runtest test_shortoption_valid_valid_shortoption_singular arg "-a" "arg"
	runtest test_shortoption_valid_valid_shortoption_multiple "arg barg" "-a" "arg" "-b" "barg"
}