#!/bin/bash

koirequirehelpactions=0

# ========= TESTS ========= #
function test_action_storearray_invalid_with_default {
	__addarg "-a" "--aaa" "storearray" "optional" "[10]" "help text"
	__parseargs "$@"
	echo "${aaa[@]}"
}

# ========= ASSERTIONS ========= #
function koitest_run {
	runtest test_action_storearray_invalid_with_default __error__ "arg"
}