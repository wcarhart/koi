#!/bin/bash

koirequirehelpactions=0

# ========= TESTS ========= #
function test_action_storearray_valid_multiple_values {
	__addarg "-a" "--aaa" "storearray" "required" "" "help text"
	__parseargs "$@"
	echo "${aaa[@]}"
}

function test_action_storearray_valid_single_value {
	__addarg "-a" "--aaa" "storearray" "required" "" "help text"
	__parseargs "$@"
	echo "${aaa[@]}"
}

function test_action_storearray_valid_required_without_values {
	__addarg "-a" "--aaa" "storearray" "required" "" "help text"
	__parseargs "$@"
	echo "${aaa[@]}"
}

function test_action_storearray_valid_optional_with_values {
	__addarg "-a" "--aaa" "storearray" "optional" "" "help text"
	__parseargs "$@"
	echo "${aaa[@]}"
}

function test_action_storearray_valid_optional_without_values {
	__addarg "-a" "--aaa" "storearray" "optional" "" "help text"
	__parseargs "$@"
	echo "${aaa[@]}"
}

# ========= ASSERTIONS ========= #
function koitest_run {
	runtest test_action_storearray_valid_multiple_values "arg barg carg" "-a" "arg" "--aaa" "barg" "-a" "carg"
	runtest test_action_storearray_valid_single_value "arg" "-a" "arg"
	runtest test_action_storearray_valid_required_without_values __error__ ""
	runtest test_action_storearray_valid_optional_with_values "arg barg" "-a" "arg" "-a" "barg"
	runtest test_action_storearray_valid_optional_without_values "" ""
}