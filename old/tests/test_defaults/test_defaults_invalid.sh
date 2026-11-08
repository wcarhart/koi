#!/bin/bash

koirequirehelpactions=0

# ========= TESTS ========= #
function test_default_invalid_required_with_default {
	__addarg "-a" "--aaa" "storevalue" "required" "arg" "help text"
	__parseargs "$@"
	echo "$aaa"
}

function test_default_invalid_help_with_default {
	__addarg "-h" "--help" "help" "optional" "myhelp" "help text"
	__parseargs "$@"
	echo "$help"
}

function test_default_invalid_flag_with_default {
	__addarg "-f" "--flag" "flag" "optional" "1" "help text"
	__parseargs "$@"
	echo "$flag"
}

function test_default_invalid_storearray_with_default {
	__addarg "-a" "--aaa" "storearray" "optional" "arg" "help text"
	__parseargs "$@"
	echo "${aaa[@]}"
}

function test_default_invalid_positionalvalue_with_default {
	__addarg "-a" "--aaa" "positionalvalue" "optional" "arg" "help text"
	__parseargs "$@"
	echo "$aaa"
}

function test_default_invalid_positionalarray_with_default {
	__addarg "-a" "--aaa" "positionalarray" "optional" "arg" "help text"
	__parseargs "$@"
	echo "${aaa[@]}"
}

# ========= ASSERTIONS ========= #
function koitest_run {
	runtest test_default_invalid_required_with_default __error__ "-a" "arg"
	runtest test_default_invalid_help_with_default __error__ "-h"
	runtest test_default_invalid_flag_with_default __error__ "-f"
	runtest test_default_invalid_storearray_with_default __error__ "-a" "arg" "-a" "barg"
	runtest test_default_invalid_positionalvalue_with_default __error__ "arg"
	runtest test_default_invalid_positionalarray_with_default __error__ "arg" "arg"
}