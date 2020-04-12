#!/bin/bash

koirequirehelpactions=0

# ========= TESTS ========= #
function test_invalid_action {
	__addarg "-a" "--aaa" "mycoolaction" "optional" "" "help text"
	__parseargs "$@"
	echo "$aaa"
}

# ========= ASSERTIONS ========= #
function koitest_run {
	runtest test_invalid_action __error__ "--aaa" "arg"
}