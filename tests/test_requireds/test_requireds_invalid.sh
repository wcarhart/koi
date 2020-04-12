#!/bin/bash

koirequirehelpactions=0

# ========= TESTS ========= #
function test_required_invalid_not_optional_or_required {
	__addarg "-a" "--aaa" "storevalue" "Required" "" "help text"
	__parseargs "$@"
	echo "$aaa"
}

function test_required_invalid_help {
	__addarg "-h" "--help" "help" "required" "" "help text"
	__parseargs "$@"
	echo "$help"
}

# ========= ASSERTIONS ========= #
function koitest_run {
	runtest test_required_invalid_not_optional_or_required __error__ "-a" "arg"
	runtest test_required_invalid_help __error__ "-h"
}