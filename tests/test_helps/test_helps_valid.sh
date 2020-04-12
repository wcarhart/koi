#!/bin/bash

koirequirehelpactions=0

# ========= TESTS ========= #
function test_help_valid {
	__addarg "-h" "--help" "help" "optional" "" "help text"
	__parseargs "$@"
	echo "help"
}

# ========= ASSERTIONS ========= #
function koitest_run {
	runtest test_help_valid "help"
}