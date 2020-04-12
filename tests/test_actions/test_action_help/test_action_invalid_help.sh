#!/bin/bash

koirequirehelpactions=0

# ========= TESTS ========= #
function test_action_help_invalid_shortoption {
	__addarg "-g" "--help" "help" "optional" "" "help text"
	__parseargs "$@"
	echo "$help"
}

function test_action_help_invalid_longoption {
	__addarg "-h" "--gelp" "help" "optional" "" "help text"
	__parseargs "$@"
	echo "$gelp"
}

function test_action_help_invalid_with_default {
	__addarg "-h" "--help" "help" "optional" "help" "help text"
	__parseargs "$@"
	echo "$help"
}

function test_action_help_invalid_missing {
	__addarg "-h" "--help" "help" "optional" ""
	__parseargs "$@"
	echo "$help"
}

function test_action_help_invalid_blank {
	__addarg "-h" "--help" "help" "optional" "" ""
	__parseargs "$@"
	echo "$help"
}

function test_action_help_invalid_required {
	__addarg "-h" "--help" "help" "required" "" "help text"
	__parseargs "$@"
	echo "$help"
}

function test_action_help_invalid_verifyingfunction {
	__addarg "-h" "--help" "help" "optional" "" "help text" "__verifyhelp"
	__parseargs "$@"
	echo "$help"
}

function test_action_help_invalid_multiple_same_letter {
	__addarg "-h" "--help" "help" "optional" "" "help text"
	__addarg "-h" "--help" "help" "optional" "" "help text 2"
	__parseargs "$@"
	echo "$help"
}

function test_action_help_invalid_multiple_different_letter {
	__addarg "-h" "--help" "help" "optional" "" "help text"
	__addarg "-g" "--gelp" "help" "optional" "" "help text 2"
	__parseargs "$@"
	echo "$help $gelp"
}

function __verifyhelp {
	:
}

# ========= ASSERTIONS ========= #
function koitest_run {
	runtest test_action_help_invalid_shortoption __error__ "-g"
	runtest test_action_help_invalid_longoption __error__ "--gelp"
	runtest test_action_help_invalid_with_default __error__ "-h"
	runtest test_action_help_invalid_missing __error__ "-h"
	runtest test_action_help_invalid_blank __error__ "-h"
	runtest test_action_help_invalid_required __error__ "-h"
	runtest test_action_help_invalid_verifyingfunction __error__ "-h"
	runtest test_action_help_invalid_multiple_same_letter __error__ "-h"
	runtest test_action_help_invalid_multiple_different_letter __error__ "-h" "-g"
}