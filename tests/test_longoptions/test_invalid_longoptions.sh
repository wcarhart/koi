#!/bin/bash

koirequirehelpactions=0

# ========= TESTS ========= #
function test_invalid_longoption_missing {
	__addarg "-a" "" "storevalue" "optional" "" "help text"
	__parseargs "$@"
	echo "$a"
}

function test_invalid_longoption_starts_with_number {
	__addarg "-a" "--9a" "optional" "" "help text"
	__parseargs "$@"
	echo "$9a"
}

function test_invalid_longoption_single_dash {
	__addarg "-a" "-aaa" "optional" "" "help text"
	__parseargs "$@"
	echo "$aaa"
}

function test_invalid_longoption_non_alphanumeric {
	__addarg "-a" "--aa-a" "optional" "" "help text"
	__parseargs "$@"
	echo "$aaa"
}

function test_invalid_longoption_non_unique {
	__addarg "-a" "--aaa" "optional" "" "help text"
	__addarg "-b" "--aaa" "optional" "" "help text"
	__parseargs "$@"
	echo "$aaa"
}

function test_invalid_longoption_positionalvalue {
	__addarg "" "--aaa" "positionalvalue" "optional" "" "help text"
	__parseargs "$@"
	echo "$aaa"
}

function test_invalid_longoption_positionalarray {
	__addarg "" "--aaa" "positionalarray" "optional" "" "help text"
	__parseargs "$@"
	echo "$aaa"
}

# ========= ASSERTIONS ========= #
function koitest_run {
	runtest test_invalid_longoption_missing __error__ "-a" "arg"
	runtest test_invalid_longoption_starts_with_number __error__ "--9a" "arg"
	runtest test_invalid_longoption_single_dash __error__ "-aaa" "arg"
	runtest test_invalid_longoption_non_alphanumeric __error__ "--aa-a" "arg"
	runtest test_invalid_longoption_non_unique __error__ "--aaa" "arg"
	runtest test_invalid_longoption_positionalvalue __error__ "aaa"
	runtest test_invalid_longoption_positionalarray __error__ "aaa"
}