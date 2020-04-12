#!/bin/bash

koirequirehelpactions=0

# ========= TESTS ========= #
function test_action_flag_valid_required {
	__addarg "-f" "--flag" "flag" "required" "" "help text"
	__parseargs "$@"
	echo "$flag"
}

function test_action_flag_valid_no_consume_arguments {
	__addarg "-f" "--flag" "flag" "required" "" "help text"
	__addarg "-a" "--aaa" "storevalue" "required" "" "help text"
	__parseargs "$@"
	echo "$flag $aaa"
}

function test_action_flag_valid_optional_with_value {
	__addarg "-f" "--flag" "flag" "optional" "" "help text"
	__parseargs "$@"
	echo "$flag"
}

function test_action_flag_valid_optional_without_value {
	__addarg "-f" "--flag" "flag" "optional" "" "help text"
	__parseargs "$@"
	echo "$flag"
}

# ========= ASSERTIONS ========= #
function koitest_run {
	runtest test_action_flag_valid_required "1" "-f"
	runtest test_action_flag_valid_required __error__ ""
	runtest test_action_flag_valid_no_consume_arguments "1 arg" "-f" "-a" "arg"
	runtest test_action_flag_valid_optional_with_value "1" "-f"
	runtest test_action_flag_valid_optional_without_value "0"
}