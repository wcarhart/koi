#!/bin/bash

koirequirehelpactions=0

# ========= TESTS ========= #
function test_action_invalid_flag_with_default {
	__addarg "-f" "--flag" "flag" "optional" "1" "help text"
	__parseargs "$@"
	echo "$flag"
}

function test_action_invalid_flag_with_verifyingfunction {
	__addarg "-f" "--flag" "flag" "optional" "" "help text" "__verifyflag"
	__parseargs "$@"
	echo "$flag"
}

function __verifyflag {
	:
}

# ========= ASSERTIONS ========= #
function koitest_run {
	runtest test_action_invalid_flag_with_default __error__ "-f"
	runtest test_action_invalid_flag_with_verifyingfunction __error__ "-f"
}