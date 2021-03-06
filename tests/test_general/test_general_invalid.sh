#!/bin/bash

koirequirehelpactions=0

# ========= TESTS ========= #
function test_general_invalid_addarg_arguments_less {
	__addarg "-h" "--help" "help"
	__parseargs "$@"
	echo "$help"
}

function test_general_invalid_addarg_arguments_more {
	__addarg "-a" "--aaa" "storevalue" "optional" "" "help text" "" "abcd" "asdf"
	__parseargs "$@"
	echo "$aaa"
}

function test_general_invalid_duplicate_names {
	__addarg "-n" "--name" "storevalue" "optional" "" "help text"
	__addarg "" "name" "positionalvalue" "optional" "" "help text"
	__parseargs "$@"
	echo "$name"
}

# ========= ASSERTIONS ========= #
function koitest_run {
	runtest test_general_invalid_addarg_arguments_less __error__ "-h"
	runtest test_general_invalid_addarg_arguments_more __error__ "--aaa" "arg"
	runtest test_general_invalid_duplicate_names __error__ "-n" "will"
}