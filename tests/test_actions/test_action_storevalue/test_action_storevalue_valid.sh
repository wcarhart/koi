#!/bin/bash

koirequirehelpactions=0

# ========= TESTS ========= #
function test_action_valid_storeavlue_optional_with_value {
	__addarg "-a" "--aaa" "storevalue" "optional" "" "help text"
	__parseargs "$@"
	echo "$aaa"
}

function test_action_valid_storeavlue_optional_without_value {
	__addarg "-a" "--aaa" "storevalue" "optional" "" "help text"
	__parseargs "$@"
	echo "$aaa"
}

function test_action_valid_storevalue_required {
	__addarg "-a" "--aaa" "storevalue" "required" "" "help text"
	__parseargs "$@"
	echo "$aaa"
}

function test_action_valid_storevalue_with_default {
	__addarg "-a" "--aaa" "storevalue" "optional" "foo" "help text"
	__parseargs "$@"
	echo "$aaa"
}

function test_action_valid_storevalue_multiple_a {
	__addarg "-a" "--aaa" "storevalue" "required" "" "help text"
	__addarg "-b" "--bbb" "storevalue" "required" "" "help text"
	__parseargs "$@"
	echo "$aaa $bbb"
}

function test_action_valid_storevalue_multiple_b {
	__addarg "-a" "--aaa" "storevalue" "required" "" "help text"
	__addarg "-b" "--bbb" "storevalue" "optional" "" "help text"
	__parseargs "$@"
	echo "$aaa $bbb"
}

function test_action_valid_storevalue_multiple_c {
	__addarg "-a" "--aaa" "storevalue" "optional" "" "help text"
	__addarg "-b" "--bbb" "storevalue" "optional" "" "help text"
	__parseargs "$@"
	echo "$aaa $bbb"
}

function test_action_valid_storevalue_overwrite {
	__addarg "-a" "--aaa" "storevalue" "required" "" "help text"
	__parseargs "$@"
	echo "$aaa"
}

# ========= ASSERTIONS ========= #
function koitest_run {
	runtest test_action_valid_storeavlue_optional_with_value "arg" "-a" "arg"
	runtest test_action_valid_storeavlue_optional_without_value ""
	runtest test_action_valid_storevalue_required "arg" "-a" "arg"
	runtest test_action_valid_storevalue_required __error__ ""
	runtest test_action_valid_storevalue_with_default "arg" "-a" "arg"
	runtest test_action_valid_storevalue_with_default "foo"
	runtest test_action_valid_storevalue_multiple_a "arg barg" "-a" "arg" "-b" "barg"
	runtest test_action_valid_storevalue_multiple_b "arg barg" "-a" "arg" "-b" "barg"
	runtest test_action_valid_storevalue_multiple_c "arg barg" "-a" "arg" "-b" "barg"
	runtest test_action_valid_storevalue_multiple_c " "
	runtest test_action_valid_storevalue_overwrite "barg" "-a" "arg" "-b" "barg"
}