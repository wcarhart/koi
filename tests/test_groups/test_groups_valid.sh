#!/bin/bash

koirequirehelpactions=0

# ========= TESTS ========= #
function test_groups_valid_optional_mutex_blank {
	__addarg "-f" "--flag" "flag" "optional" "" "help text"
	__addarg "-g" "--glad" "flag" "optional" "" "help text"
	__addgroup "flags" "XOR" "optional" "--flag" "--glad"
	__parseargs "$@"

	echo "$flag $glad"
}

function test_groups_valid_optional_mutin_blank {
	__addarg "-f" "--flag" "flag" "optional" "" "help text"
	__addarg "-g" "--glad" "flag" "optional" "" "help text"
	__addgroup "flags" "AND" "optional" "--flag" "--glad"
	__parseargs "$@"

	echo "$flag $glad"
}

function test_groups_valid_optional_mutor_blank {
	__addarg "-f" "--flag" "flag" "optional" "" "help text"
	__addarg "-g" "--glad" "flag" "optional" "" "help text"
	__addgroup "flags" "OR" "optional" "--flag" "--glad"
	__parseargs "$@"

	echo "$flag $glad"
}

function test_groups_valid_optional_two_mutex {
	__addarg "-f" "--flag" "flag" "optional" "" "help text"
	__addarg "-g" "--glad" "flag" "optional" "" "help text"
	__addgroup "flags" "XOR" "optional" "--flag" "--glad"
	__parseargs "$@"

	echo "$flag $glad"
}

function test_groups_valid_optional_two_mutin {
	__addarg "-f" "--flag" "flag" "optional" "" "help text"
	__addarg "-g" "--glad" "flag" "optional" "" "help text"
	__addgroup "flags" "AND" "optional" "--flag" "--glad"
	__parseargs "$@"

	echo "$flag $glad"
}

function test_groups_valid_optional_two_mutor {
	__addarg "-f" "--flag" "flag" "optional" "" "help text"
	__addarg "-g" "--glad" "flag" "optional" "" "help text"
	__addgroup "flags" "OR" "optional" "--flag" "--glad"
	__parseargs "$@"

	echo "$flag $glad"
}

function test_groups_valid_optional_three_mutex {
	__addarg "-f" "--flag" "flag" "optional" "" "help text"
	__addarg "-g" "--glad" "flag" "optional" "" "help text"
	__addarg "-v" "--vlad" "flag" "optional" "" "help text"
	__addgroup "flags" "XOR" "optional" "--flag" "--glad" "--vlad"
	__parseargs "$@"

	echo "$flag $glad $vlad"
}

function test_groups_valid_optional_three_mutin {
	__addarg "-f" "--flag" "flag" "optional" "" "help text"
	__addarg "-g" "--glad" "flag" "optional" "" "help text"
	__addarg "-v" "--vlad" "flag" "optional" "" "help text"
	__addgroup "flags" "AND" "optional" "--flag" "--glad" "--vlad"
	__parseargs "$@"

	echo "$flag $glad $vlad"
}

function test_groups_valid_optional_three_mutor {
	__addarg "-f" "--flag" "flag" "optional" "" "help text"
	__addarg "-g" "--glad" "flag" "optional" "" "help text"
	__addarg "-v" "--vlad" "flag" "optional" "" "help text"
	__addgroup "flags" "OR" "optional" "--flag" "--glad" "--vlad"
	__parseargs "$@"

	echo "$flag $glad $vlad"
}

function test_groups_valid_required_two_mutex {
	__addarg "-f" "--flag" "flag" "optional" "" "help text"
	__addarg "-g" "--glad" "flag" "optional" "" "help text"
	__addgroup "flags" "XOR" "required" "--flag" "--glad"
	__parseargs "$@"

	echo "$flag $glad"
}

function test_groups_valid_required_two_mutin {
	__addarg "-f" "--flag" "flag" "optional" "" "help text"
	__addarg "-g" "--glad" "flag" "optional" "" "help text"
	__addgroup "flags" "AND" "required" "--flag" "--glad"
	__parseargs "$@"

	echo "$flag $glad"
}

function test_groups_valid_required_two_mutor {
	__addarg "-f" "--flag" "flag" "optional" "" "help text"
	__addarg "-g" "--glad" "flag" "optional" "" "help text"
	__addgroup "flags" "OR" "required" "--flag" "--glad"
	__parseargs "$@"

	echo "$flag $glad"
}

function test_groups_valid_required_three_mutex {
	__addarg "-f" "--flag" "flag" "optional" "" "help text"
	__addarg "-g" "--glad" "flag" "optional" "" "help text"
	__addarg "-v" "--vlad" "flag" "optional" "" "help text"
	__addgroup "flags" "XOR" "required" "--flag" "--glad" "--vlad"
	__parseargs "$@"

	echo "$flag $glad $vlad"
}

function test_groups_valid_required_three_mutin {
	__addarg "-f" "--flag" "flag" "optional" "" "help text"
	__addarg "-g" "--glad" "flag" "optional" "" "help text"
	__addarg "-v" "--vlad" "flag" "optional" "" "help text"
	__addgroup "flags" "AND" "required" "--flag" "--glad" "--vlad"
	__parseargs "$@"

	echo "$flag $glad $vlad"
}

function test_groups_valid_required_three_mutor {
	__addarg "-f" "--flag" "flag" "optional" "" "help text"
	__addarg "-g" "--glad" "flag" "optional" "" "help text"
	__addarg "-v" "--vlad" "flag" "optional" "" "help text"
	__addgroup "flags" "OR" "required" "--flag" "--glad" "--vlad"
	__parseargs "$@"

	echo "$flag $glad $vlad"
}

function test_groups_valid_optional_mixed_blank {
	__addarg "-f" "--flag" "flag" "optional" "" "help text"
	__addarg "-a" "--arg" "storevalue" "optional" "" "help text"
	__addgroup "group" "XOR" "optional" "--flag" "--arg"
	__parseargs "$@"

	echo "$flag $arg"
}

function test_groups_valid_optional_mixed_a {
	__addarg "-f" "--flag" "flag" "optional" "" "help text"
	__addarg "-a" "--arg" "storevalue" "optional" "" "help text"
	__addgroup "group" "XOR" "optional" "--flag" "--arg"
	__parseargs "$@"

	echo "$flag $arg"
}

function test_groups_valid_optional_mixed_b {
	__addarg "-a" "--arg" "storevalue" "optional" "" "help text"
	__addarg "-b" "--barg" "storevalue" "optional" "" "help text"
	__addgroup "group" "AND" "optional" "--flag" "--arg"
	__parseargs "$@"

	echo "$arg $barg"
}

function test_groups_valid_required_mixed_a {
	__addarg "-f" "--flag" "flag" "optional" "" "help text"
	__addarg "-a" "--arg" "storevalue" "optional" "" "help text"
	__addgroup "group" "XOR" "required" "--flag" "--arg"
	__parseargs "$@"

	echo "$flag $arg"
}

function test_groups_valid_required_mixed_b {
	__addarg "-a" "--arg" "storevalue" "optional" "" "help text"
	__addarg "-b" "--barg" "storevalue" "optional" "" "help text"
	__addgroup "group" "AND" "required" "--flag" "--arg"
	__parseargs "$@"

	echo "$arg $barg"
}

function test_group_valid_no_short_option {
	__addarg "" "--flag" "flag" "optional" "" "help text"
	__addarg "-g" "--glad" "flag" "optional" "" "help text"
	__addgroup "flags" "AND" "required" "--flag" "--glad"
	__parseargs "$@"

	echo "$flag $glad"
}

# ========= ASSERTIONS ========= #
function koitest_run {
	runtest test_groups_valid_optional_mutex_blank "0 0"
	runtest test_groups_valid_optional_mutin_blank "0 0"
	runtest test_groups_valid_optional_mutor_blank "0 0"
	runtest test_groups_valid_optional_two_mutex "1 0" "-f"
	runtest test_groups_valid_optional_two_mutin "1 1" "-f" "-g"
	runtest test_groups_valid_optional_two_mutor "0 1" "-g"
	runtest test_groups_valid_optional_three_mutex "0 1 0" "-g"
	runtest test_groups_valid_optional_three_mutin "1 1 1" "-g" "-f" "-v"
	runtest test_groups_valid_optional_three_mutor "0 0 1" "-v"
	runtest test_groups_valid_required_two_mutex "1 0" "-f"
	runtest test_groups_valid_required_two_mutin "1 1" "-f" "-g"
	runtest test_groups_valid_required_two_mutor "0 1" "-g"
	runtest test_groups_valid_required_three_mutex "0 1 0" "-g"
	runtest test_groups_valid_required_three_mutin "1 1 1" "-g" "-f" "-v"
	runtest test_groups_valid_required_three_mutor "0 0 1" "-v"
	runtest test_groups_valid_optional_mixed_blank "0 "
	runtest test_groups_valid_optional_mixed_a "0 value" "--arg" "value"
	runtest test_groups_valid_optional_mixed_b "avalue bvalue" "-b" "bvalue" "--arg" "avalue"
	runtest test_groups_valid_required_mixed_a "0 value" "--arg" "value"
	runtest test_groups_valid_required_mixed_b "avalue bvalue" "-b" "bvalue" "--arg" "avalue"
	runtest test_group_valid_no_short_option "1 1" "-g" "--flag"
}