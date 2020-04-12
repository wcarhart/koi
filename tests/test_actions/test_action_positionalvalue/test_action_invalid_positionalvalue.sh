#!/bin/bash

koirequirehelpactions=0

# ========= TESTS ========= #
function test_action_positionalvalue_invalid_with_shortname {
	__addarg "-a" "aaa" "positionalvalue" "optional" "" "help text"
	__parseargs "$@"
	echo "$aaa"
}

function test_action_positionalvalue_invalid_with_dash {
	__addarg "" "-aaa" "positionalvalue" "optional" "" "help text"
	__parseargs "$@"
	echo "$aaa"
}

function test_action_positionalvalue_invalid_with_dash_multiple {
	__addarg "" "--aaa" "positionalvalue" "optional" "" "help text"
	__parseargs "$@"
	echo "$aaa"
}

function test_action_positionalvalue_invalid_with_default {
	__addarg "" "aaa" "positionalvalue" "optional" "val" "help text"
	__parseargs "$@"
	echo "$aaa"
}

function test_action_positionalvalue_invalid_required_and_optional {
	__addarg "" "aaa" "positionalvalue" "optional" "" "help text"
	__addarg "" "bbb" "positionalvalue" "required" "" "help text"
	__parseargs "$@"
	echo "$aaa $bbb"
}

function test_action_positionalvalue_invalid_multiple_optional {
	__addarg "" "aaa" "positionalvalue" "optional" "" "help text"
	__addarg "" "bbb" "positionalvalue" "optional" "" "help text"
	__parseargs "$@"
	echo "$aaa $bbb"
}

# ========= ASSERTIONS ========= #
function koitest_run {
	runtest test_action_positionalvalue_invalid_with_shortname __error__ "arg"
	runtest test_action_positionalvalue_invalid_with_dash __error__ "arg"
	runtest test_action_positionalvalue_invalid_with_dash_multiple __error__ "arg"
	runtest test_action_positionalvalue_invalid_with_default __error__ "arg"
	runtest test_action_positionalvalue_invalid_required_and_optional __error__ "arg" "barg"
	runtest test_action_positionalvalue_invalid_multiple_optional __error__ "arg" "barg"
}