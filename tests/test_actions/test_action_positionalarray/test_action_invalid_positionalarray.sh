#!/bin/bash

koirequirehelpactions=0

# ========= TESTS ========= #
function test_action_invalid_positionalarray_with_shortname {
	__addarg "-a" "aaa" "positionalarray" "optional" "" "help text"
	__parseargs "$@"
	echo "${aaa[@]}"
}

function test_action_invalid_positionalarray_with_dash {
	__addarg "" "-aaa" "positionalarray" "optional" "" "help text"
	__parseargs "$@"
	echo "${aaa[@]}"
}

function test_action_invalid_positionalarray_with_dash_multiple {
	__addarg "" "--aaa" "positionalarray" "optional" "" "help text"
	__parseargs "$@"
	echo "${aaa[@]}"
}

function test_action_invalid_positionalarray_with_default {
	__addarg "" "aaa" "positionalarray" "optional" "val" "help text"
	__parseargs "$@"
	echo "${aaa[@]}"
}

function test_action_invalid_positionalarray_multiple_a {
	__addarg "" "aaa" "positionalarray" "required" "" "help text"
	__addarg "" "bbb" "positionalarray" "required" "" "help text"
	echo "${aaa[@]} ${bbb[@]}"
}

function test_action_invalid_positionalarray_multiple_b {
	__addarg "" "aaa" "positionalarray" "optional" "" "help text"
	__addarg "" "bbb" "positionalarray" "optional" "" "help text"
	echo "${aaa[@]} ${bbb[@]}"
}

function test_action_invalid_positionalarray_multiple_c {
	__addarg "" "aaa" "positionalarray" "required" "" "help text"
	__addarg "" "bbb" "positionalarray" "optional" "" "help text"
	echo "${aaa[@]} ${bbb[@]}"
}

function test_action_invalid_positionalarray_with_positionalvalue_a {
	__addarg "" "aaa" "positionalarray" "required" "" "help text"
	__addarg "" "bbb" "positionalvalue" "required" "" "help text"
	__parseargs "$@"
	echo "${aaa[@]} $bbb"
}

function test_action_invalid_positionalarray_with_positionalvalue_b {
	__addarg "" "aaa" "positionalarray" "required" "" "help text"
	__addarg "" "bbb" "positionalvalue" "optional" "" "help text"
	__parseargs "$@"
	echo "${aaa[@]} $bbb"
}

function test_action_invalid_positionalarray_with_positionalvalue_c {
	__addarg "" "aaa" "positionalarray" "optional" "" "help text"
	__addarg "" "bbb" "positionalvalue" "required" "" "help text"
	__parseargs "$@"
	echo "${aaa[@]} $bbb"
}

function test_action_invalid_positionalarray_with_positionalvalue_d {
	__addarg "" "aaa" "positionalarray" "optional" "" "help text"
	__addarg "" "bbb" "positionalvalue" "optional" "" "help text"
	__parseargs "$@"
	echo "${aaa[@]} $bbb"
}

# ========= ASSERTIONS ========= #
function koitest_run {
	runtest test_action_invalid_positionalarray_with_shortname __error__ "arg"
	runtest test_action_invalid_positionalarray_with_dash __error__ "arg"
	runtest test_action_invalid_positionalarray_with_dash_multiple __error__ "arg"
	runtest test_action_invalid_positionalarray_with_default __error__ "arg"
	runtest test_action_invalid_positionalarray_multiple_a __error__ "arg" "barg"
	runtest test_action_invalid_positionalarray_multiple_b __error__ "arg" "barg"
	runtest test_action_invalid_positionalarray_multiple_c __error__ "arg" "barg"
	runtest test_action_invalid_positionalarray_with_positionalvalue_a __error__ "arg" "barg"
	runtest test_action_invalid_positionalarray_with_positionalvalue_b __error__ "arg" "barg"
	runtest test_action_invalid_positionalarray_with_positionalvalue_c __error__ "arg" "barg"
	runtest test_action_invalid_positionalarray_with_positionalvalue_d __error__ "arg" "barg"
}