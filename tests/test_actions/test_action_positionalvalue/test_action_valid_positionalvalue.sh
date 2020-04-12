#!/bin/bash

koirequirehelpactions=0

# ========= TESTS ========= #
function test_action_positionalvalue_valid_required_singular {
	__addarg "" "aaa" "positionalvalue" "required" "" "help text"
	__parseargs "$@"
	echo "$aaa"
}

function test_action_positionalvalue_valid_required_multiple {
	__addarg "" "aaa" "positionalvalue" "required" "" "help text"
	__addarg "" "bbb" "positionalvalue" "required" "" "help text"
	__addarg "" "ccc" "positionalvalue" "required" "" "help text"
	__parseargs "$@"
	echo "$bbb $ccc $aaa"
}

function test_action_positionalvalue_valid_optional {
	__addarg "" "aaa" "positionalvalue" "optional" "" "help text"
	__parseargs "$@"
	echo "$aaa"
}

function test_action_positionalvalue_valid_with_dash {
	__addarg "" "aaa" "positionalvalue" "required" "" "help text"
	__parseargs "$@"
	echo "$aaa"
}

# ========= ASSERTIONS ========= #
function koitest_run {
	runtest test_action_positionalvalue_valid_required_singular "arg" "arg"
	runtest test_action_positionalvalue_valid_required_multiple "barg carg arg" "arg" "barg" "carg"
	runtest test_action_positionalvalue_valid_optional "arg" "arg"
	runtest test_action_positionalvalue_valid_optional "" ""
	runtest test_action_positionalvalue_valid_with_dash "-f" "-f"
}