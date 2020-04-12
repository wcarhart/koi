#!/bin/bash

koirequirehelpactions=0

# ========= TESTS ========= #
function test_action_invalid_storearray_with_default {
	__addarg "-a" "--aaa" "storearray" "optional" "[10]" "help text"
	__parseargs "$@"
	echo "${aaa[@]}"
}

# ========= ASSERTIONS ========= #
function koitest_run {
	runtest test_action_invalid_storearray_with_default __error__ "arg"
}