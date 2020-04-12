#!/bin/bash

koirequirehelpactions=0

# ========= TESTS ========= #
function test_action_invalid_help_shortoption {
	__addarg "-g" "--help" "help" "optional" "" "help text"
	__parseargs "$@"
	echo "$help"
}

function test_action_invalid_help_longoption {
	__addarg "-h" "--gelp" "help" "optional" "" "help text"
	__parseargs "$@"
	echo "$gelp"
}

function test_action_invalid_help_with_default {
	__addarg "-h" "--help" "help" "optional" "help" "help text"
	__parseargs "$@"
	echo "$help"
}

function test_action_invalid_help_missing {
	__addarg "-h" "--help" "help" "optional" ""
	__parseargs "$@"
	echo "$help"
}

function test_action_invalid_help_blank {
	__addarg "-h" "--help" "help" "optional" "" ""
	__parseargs "$@"
	echo "$help"
}

function test_action_invalid_help_required {
	__addarg "-h" "--help" "help" "required" "" "help text"
	__parseargs "$@"
	echo "$help"
}

function test_action_invalid_help_verifyingfunction {
	__addarg "-h" "--help" "help" "optional" "" "help text" "__verifyhelp"
	__parseargs "$@"
	echo "$help"
}

function __verifyhelp {
	:
}

# ========= ASSERTIONS ========= #
function koitest_run {
	runtest test_action_invalid_help_shortoption __error__ "-g"
	runtest test_action_invalid_help_longoption __error__ "--gelp"
	runtest test_action_invalid_help_with_default __error__ "-h"
	runtest test_action_invalid_help_missing __error__ "-h"
	runtest test_action_invalid_help_blank __error__ "-h"
	runtest test_action_invalid_help_required __error__ "-h"
	runtest test_action_invalid_help_verifyingfunction __error__ "-h"
}