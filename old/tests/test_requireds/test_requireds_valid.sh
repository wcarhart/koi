#!/bin/bash

koirequirehelpactions=0

# ========= TESTS ========= #
function test_required_valid_storevalue_required {
	__addarg "-a" "--aaa" "storevalue" "required" "" "help text"
	__parseargs "$@"
	echo "$aaa"
}

function test_required_valid_storevalue_required_none {
	__addarg "-a" "--aaa" "storevalue" "required" "" "help text"
	__parseargs "$@"
	echo "$aaa"
}

function test_required_valid_storevalue_optional {
	__addarg "-a" "--aaa" "storevalue" "optional" "" "help text"
	__parseargs "$@"
	echo "$aaa"
}

function test_required_valid_storearray_required {
	__addarg "-a" "--aaa" "storearray" "required" "" "help text"
	__parseargs "$@"
	echo "${aaa[@]}"
}

function test_required_valid_storearray_required_multiple {
	__addarg "-a" "--aaa" "storearray" "required" "" "help text"
	__parseargs "$@"
	echo "${aaa[@]}"
}

function test_required_valid_storearray_required_none {
	__addarg "-a" "--aaa" "storearray" "required" "" "help text"
	__parseargs "$@"
	echo "${aaa[@]}"
}

function test_required_valid_storearray_optional {
	__addarg "-a" "--aaa" "storearray" "optional" "" "help text"
	__parseargs "$@"
	echo "${aaa[@]}"
}

function test_required_valid_positionalvalue_required {
	__addarg "" "aaa" "positionalvalue" "required" "" "help text"
	__parseargs "$@"
	echo "$aaa"
}

function test_required_valid_positionalvalue_required_none {
	__addarg "" "aaa" "positionalvalue" "required" "" "help text"
	__parseargs "$@"
	echo "$aaa"
}

function test_required_valid_positionalvalue_optional {
	__addarg "" "aaa" "positionalvalue" "optional" "" "help text"
	__parseargs "$@"
	echo "$aaa"
}

function test_required_valid_positionalarray_required {
	__addarg "" "aaa" "positionalarray" "required" "" "help text"
	__parseargs "$@"
	echo "${aaa[@]}"
}

function test_required_valid_positionalarray_required_multiple {
	__addarg "" "aaa" "positionalarray" "required" "" "help text"
	__parseargs "$@"
	echo "${aaa[@]}"
}

function test_required_valid_positionalarray_required_none {
	__addarg "" "aaa" "positionalarray" "required" "" "help text"
	__parseargs "$@"
	echo "${aaa[@]}"
}

function test_required_valid_positionalarray_optional {
	__addarg "" "aaa" "positionalarray" "optional" "" "help text"
	__parseargs "$@"
	echo "${aaa[@]}"
}

function test_required_valid_flag_required {
	__addarg "-a" "--aaa" "flag" "required" "" "help text"
	__parseargs "$@"
	echo "$aaa"
}

function test_required_valid_flag_required_none {
	__addarg "-a" "--aaa" "flag" "required" "" "help text"
	__parseargs "$@"
	echo "$aaa"
}

function test_required_valid_flag_optional {
	__addarg "-a" "--aaa" "flag" "optional" "" "help text"
	__parseargs "$@"
	echo "$aaa"
}

# ========= ASSERTIONS ========= #
function koitest_run {
	runtest test_required_valid_storevalue_required "arg" "-a" "arg"
	runtest test_required_valid_storevalue_required_none __error__
	runtest test_required_valid_storevalue_optional ""
	runtest test_required_valid_storearray_required "arg" "-a" "arg"
	runtest test_required_valid_storearray_required_multiple "arg barg" "-a" "arg" "-a" "barg"
	runtest test_required_valid_storearray_required_none __error__
	runtest test_required_valid_storearray_optional ""
	runtest test_required_valid_positionalvalue_required "arg" "arg"
	runtest test_required_valid_positionalvalue_required_none __error__
	runtest test_required_valid_positionalvalue_optional ""
	runtest test_required_valid_positionalarray_required "arg" "arg"
	runtest test_required_valid_positionalarray_required_multiple "arg barg" "arg" "barg"
	runtest test_required_valid_positionalarray_required_none __error__
	runtest test_required_valid_positionalarray_optional ""
	runtest test_required_valid_flag_required "1" "-a"
	runtest test_required_valid_flag_required_none __error__
	runtest test_required_valid_flag_optional "0"
}