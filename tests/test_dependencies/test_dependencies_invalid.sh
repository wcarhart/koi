#!/bin/bash

koirequirehelpactions=0

# ========= TESTS ========= #
function test_dependencies_invalid_too_few_arguments {
	__addarg "-f" "--flag" "flag" "optional" "" "help text"
	__addarg "-g" "--glad" "flag" "optional" "" "help text"
	__adddep "--flag" "--glad"
	__parseargs "$@"
	echo "$flag $glad"
}

function test_dependencies_invalid_mutex_group_a {
	__addarg "-f" "--flag" "flag" "optional" "" "help text"
	__addarg "-g" "--glad" "flag" "optional" "" "help text"
	__addgroup "flags" "XOR" "optional" "--flag" "--glad"
	__adddep "--flag" "dependson" "--glad"
	__parseargs "$@"
	echo "$flag $glad"
}

function test_dependencies_invalid_mutex_group_b {
	__addarg "-f" "--flag" "flag" "optional" "" "help text"
	__addarg "-g" "--glad" "flag" "optional" "" "help text"
	__adddep "--flag" "dependson" "--glad"
	__addgroup "flags" "XOR" "optional" "--flag" "--glad"
	__parseargs "$@"
	echo "$flag $glad"
}

function test_dependencies_invalid_dependent_not_registered {
	__addarg "-f" "--flag" "flag" "optional" "" "help text"
	__adddep "--glad" "dependson" "--flag"
	__parseargs "$@"
	echo "$flag"
}

function test_dependencies_invalid_dependency_not_registered {
	__addarg "-f" "--flag" "flag" "optional" "" "help text"
	__adddep "--flag" "dependson" "--glad"
	__parseargs "$@"
	echo "$flag"
}

function test_dependencies_invalid_no_property {
	__addarg "-f" "--flag" "flag" "optional" "" "help text"
	__addarg "-g" "--glad" "flag" "optional" "" "help text"
	__addarg "-v" "--vlad" "flag" "optional" "" "help text"
	__adddep "--flag" "--glad" "--vlad"
	__parseargs "$@"
	echo "$flag $glad $vlad"
}

function test_dependencies_invalid_depend_on_itself {
	__addarg "-f" "--flag" "flag" "optional" "" "help text"
	__adddep "--flag" "dependson" "--flag"
	__parseargs "$@"
	echo "$flag"
}

function test_dependencies_invalid_positionalvalue_a {
	__addarg "-f" "--flag" "flag" "optional" "" "help text"
	__addarg "" "arg" "positionalvalue" "optional" "" "help text"
	__adddep "--flag" "dependson" "arg"
	__parseargs "$@"
	echo "$flag $arg"
}

function test_dependencies_invalid_positionalvalue_b {
	__addarg "-f" "--flag" "flag" "optional" "" "help text"
	__addarg "" "arg" "positionalvalue" "optional" "" "help text"
	__adddep "arg" "dependson" "--flag"
	__parseargs "$@"
	echo "$flag $arg"
}

function test_dependencies_invalid_positionalarray_a {
	__addarg "-f" "--flag" "flag" "optional" "" "help text"
	__addarg "" "arg" "positionalarray" "optional" "" "help text"
	__adddep "--flag" "dependson" "arg"
	__parseargs "$@"
	echo "$flag $arg"
}

function test_dependencies_invalid_positionalarray_b {
	__addarg "-f" "--flag" "flag" "optional" "" "help text"
	__addarg "" "arg" "positionalarray" "optional" "" "help text"
	__adddep "arg" "dependson" "--flag"
	__parseargs "$@"
	echo "$flag $arg"
}

function test_dependencies_invalid_help_a {
	__addarg "-h" "--help" "help" "optional" "" "help text"
	__addarg "-f" "--flag" "flag" "optional" "" "help text"
	__adddep "--flag" "dependson" "--help"
	__parseargs "$@"
	echo "$flag $help"
}

function test_dependencies_invalid_help_b {
	__addarg "-h" "--help" "help" "optional" "" "help text"
	__addarg "-f" "--flag" "flag" "optional" "" "help text"
	__adddep "--help" "dependson" "--flag"
	__parseargs "$@"
	echo "$flag $help"
}

function test_dependencies_invalid_duplicate_adddep_entries_simple {
	__addarg "-f" "--flag" "flag" "optional" "" "help text"
	__addarg "-g" "--glad" "flag" "optional" "" "help text"
	__adddep "--flag" "dependson" "--glad"
	__adddep "--flag" "dependson" "--glad"
	__parseargs "$@"
	echo "$flag $glad"
}

function test_dependencies_invalid_duplicate_adddep_entries_complex {
	__addarg "-a" "--arg" "storevalue" "optional" "" "help text"
	__addarg "-b" "--barg" "storevalue" "optional" "" "help text"
	__addarg "-f" "--flag" "flag" "optional" "" "help text"
	__addarg "-g" "--glad" "flag" "optional" "" "help text"
	__addgroup "flags" "XOR" "optional" "--flag" "--glad"
	__adddep "--flag" "--glad" "dependson" "--arg"
	__adddep "--flag" "dependson" "--arg"
	__adddep "--flag" "dependson" "--barg"
	__adddep "--glad" "dependson" "--barg"
	__parseargs "$@"
	echo "$arg $barg $flag $glad"
}

function test_dependencies_invalid_use_shortoption_a {
	__addarg "-f" "--flag" "flag" "optional" "" "help text"
	__addarg "-g" "--glad" "flag" "optional" "" "help text"
	__adddep "-f" "dependson" "--glad"
	echo "$flag $glad"
}

function test_dependencies_invalid_use_shortoption_b {
	__addarg "-f" "--flag" "flag" "optional" "" "help text"
	__addarg "-g" "--glad" "flag" "optional" "" "help text"
	__adddep "--flag" "dependson" "-g"
	echo "$flag $glad"
}

# ========= ASSERTIONS ========= #
function koitest_run {
	runtest test_dependencies_invalid_too_few_arguments __error__ "-f"
	runtest test_dependencies_invalid_mutex_group_a __error__ "-f"
	runtest test_dependencies_invalid_mutex_group_b __error__ "-g"
	runtest test_dependencies_invalid_dependent_not_registered __error__ "-f"
	runtest test_dependencies_invalid_dependency_not_registered __error__ "-f"
	runtest test_dependencies_invalid_no_property __error__ "-f"
	runtest test_dependencies_invalid_depend_on_itself __error__ "-f"
	runtest test_dependencies_invalid_positionalvalue_a __error__ "-f"
	runtest test_dependencies_invalid_positionalvalue_b __error__ "f"
	runtest test_dependencies_invalid_positionalarray_a __error__ "-f"
	runtest test_dependencies_invalid_positionalarray_b __error__ "f"
	runtest test_dependencies_invalid_help_a __error__ "-h"
	runtest test_dependencies_invalid_help_b __error__ "-f"
	runtest test_dependencies_invalid_duplicate_adddep_entries_simple __error__ "-g"
	runtest test_dependencies_invalid_duplicate_adddep_entries_complex __error__ "-g"
	runtest test_dependencies_invalid_use_shortoption_a __error__ "-g"
	runtest test_dependencies_invalid_use_shortoption_b __error__ "-g" "-b" "barg" "-a" "arg"
}