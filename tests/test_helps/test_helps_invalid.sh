#!/bin/bash

koirequirehelpactions=0

# ========= TESTS ========= #
function test_help_invalid_blank {
	__addarg "-h" "--help" "help" "optional" "" ""
	__parseargs "$@"
	echo "$help"
}

# ========= ASSERTIONS ========= #
function koitest_run {
	runtest test_help_invalid_blank __error__ "-h"
}