#!/bin/bash

koirequirehelpactions=0

# ========= TESTS ========= #
function test_groups_invalid_too_few_arguments {
	__addarg "-f" "--flag" "flag" "optional" "" "help text"
	__addarg "-g" "--glad" "flag" "optional" "" "help text"
	__addgroup "flags" "XOR" "optional"
	__parseargs "$@"

	echo "$flag $glad"
}

function test_groups_invalid_name_blank {
	__addarg "-f" "--flag" "flag" "optional" "" "help text"
	__addarg "-g" "--glad" "flag" "optional" "" "help text"
	__addgroup "" "XOR" "optional" "--flag" "--glad"
	__parseargs "$@"

	echo "$flag $glad"
}

function test_groups_invalid_name_non_alphanumeric {
	__addarg "-f" "--flag" "flag" "optional" "" "help text"
	__addarg "-g" "--glad" "flag" "optional" "" "help text"
	__addgroup "--group" "XOR" "optional" "--flag" "--glad"
	__parseargs "$@"

	echo "$flag $glad"
}

function test_groups_invalid_name_starts_with_number {
	__addarg "-f" "--flag" "flag" "optional" "" "help text"
	__addarg "-g" "--glad" "flag" "optional" "" "help text"
	__addgroup "99group" "XOR" "optional" "--flag" "--glad"
	__parseargs "$@"

	echo "$flag $glad"
}

function test_groups_invalid_name_non_registered_argument {
	__addarg "-f" "--flag" "flag" "optional" "" "help text"
	__addarg "-g" "--glad" "flag" "optional" "" "help text"
	__addgroup "group" "XOR" "optional" "--flag" "--glad" "--vlad"
	__parseargs "$@"

	echo "$flag $glad"
}

function test_groups_invalid_property {
	__addarg "-f" "--flag" "flag" "optional" "" "help text"
	__addarg "-g" "--glad" "flag" "optional" "" "help text"
	__addgroup "group" "and" "optional" "--flag" "--glad"
	__parseargs "$@"

	echo "$flag $glad"
}

function test_groups_invalid_required {
	__addarg "-f" "--flag" "flag" "optional" "" "help text"
	__addarg "-g" "--glad" "flag" "optional" "" "help text"
	__addgroup "group" "AND" "notrequired" "--flag" "--glad"
	__parseargs "$@"

	echo "$flag $glad"
}

function test_groups_invalid_action_help {
	__addarg "-h" "--help" "help" "optional" "" "help text"
	__addarg "-f" "--flag" "flag" "optional" "" "help text"
	__addarg "-g" "--glad" "flag" "optional" "" "help text"
	__addgroup "group" "XOR" "optional" "--help" "--flag" "--glad"
	__parseargs "$@"

	echo "$help $flag $glad"
}

function test_groups_invalid_action_positionalvalue {
	__addarg "-f" "--flag" "flag" "optional" "" "help text"
	__addarg "-g" "--glad" "flag" "optional" "" "help text"
	__addarg "" "pos" "positionalvalue" "optional" "" "help text"
	__addgroup "group" "XOR" "optional" "--flag" "--glad" "pos"
	__parseargs "$@"

	echo "$flag $glad $pos"
}

function test_groups_invalid_action_positionalarray {
	__addarg "-f" "--flag" "flag" "optional" "" "help text"
	__addarg "-g" "--glad" "flag" "optional" "" "help text"
	__addarg "" "pos" "positionalarray" "optional" "" "help text"
	__addgroup "group" "XOR" "optional" "--flag" "--glad" "pos"
	__parseargs "$@"

	echo "$flag $glad ${pos[@]}"
}

function test_groups_invalid_argument_required {
	__addarg "-f" "--flag" "flag" "optional" "" "help text"
	__addarg "-g" "--glad" "flag" "required" "" "help text"
	__addgroup "group" "XOR" "optional" "--flag" "--glad"
	__parseargs "$@"

	echo "$flag $glad $pos"
}

function test_groups_invalid_shortoptions_only {
	__addarg "-f" "--flag" "flag" "optional" "" "help text"
	__addarg "-g" "--glad" "flag" "optional" "" "help text"
	__addgroup "group" "XOR" "optional" "-f" "-g"
	__parseargs "$@"

	echo "$flag $glad $pos"
}

# ========= ASSERTIONS ========= #
function koitest_run {
	runtest test_groups_invalid_too_few_arguments __error__ "--flag"
	runtest test_groups_invalid_name_blank __error__ "-f"
	runtest test_groups_invalid_name_non_alphanumeric __error__ "-g"
	runtest test_groups_invalid_name_starts_with_number __error__ "--glad"
	runtest test_groups_invalid_name_non_registered_argument __error__ "--flag"
	runtest test_groups_invalid_property __error__ "-g" "-f"
	runtest test_groups_invalid_required __error__ "-f" "-g"
	runtest test_groups_invalid_action_help __error__ "-g"
	runtest test_groups_invalid_action_positionalvalue __error__ "-g" "arg"
	runtest test_groups_invalid_action_positionalarray __error__ "-f" "arg" "arg"
	runtest test_groups_invalid_argument_required __error__ "--glad"
	runtest test_groups_invalid_shortoptions_only __error__ "-f" "-g"
}