#!/bin/bash

koirequirehelpactions=0

# ========= TESTS ========= #
function test_dependencies_valid_one_dependent_flag {
	__addarg "-f" "--flag" "flag" "optional" "" "help text"
	__addarg "-g" "--glad" "flag" "optional" "" "help text"
	__adddep "--flag" "dependson" "--glad"
	__parseargs "$@"
	echo "$flag $glad"
}

function test_dependencies_valid_two_dependents_flags {
	__addarg "-f" "--flag" "flag" "optional" "" "help text"
	__addarg "-g" "--glad" "flag" "optional" "" "help text"
	__addarg "-v" "--vlad" "flag" "optional" "" "help text"
	__adddep "--flag" "--glad" "dependson" "--vlad"
	__parseargs "$@"
	echo "$flag $glad $vlad"
}

function test_dependencies_valid_three_dependents_flags {
	__addarg "-f" "--flag" "flag" "optional" "" "help text"
	__addarg "-g" "--glad" "flag" "optional" "" "help text"
	__addarg "-v" "--vlad" "flag" "optional" "" "help text"
	__addarg "-c" "--clad" "flag" "optional" "" "help text"
	__adddep "--flag" "--glad" "--vlad" "dependson" "--clad"
	__parseargs "$@"
	echo "$flag $glad $vlad $clad"
}

function test_dependencies_valid_mixed_types_valid {
	__addarg "-f" "--flag" "flag" "optional" "" "help text"
	__addarg "-a" "--arg" "storevalue" "optional" "" "help text"
	__addarg "-b" "--barg" "storevalue" "optional" "" "help text"
	__adddep "--arg" "--flag" "dependson" "--barg"
	__parseargs "$@"
	echo "$flag $arg $barg"
}

function test_dependencies_valid_mixed_types_invalid {
	__addarg "-f" "--flag" "flag" "optional" "" "help text"
	__addarg "-a" "--arg" "storevalue" "optional" "" "help text"
	__addarg "-b" "--barg" "storevalue" "optional" "" "help text"
	__adddep "--arg" "--flag" "dependson" "--barg"
	__parseargs "$@"
	echo "$flag $arg $barg"
}

function test_dependencies_valid_storearray_valid_a {
	__addarg "-f" "--flag" "flag" "optional" "" "help text"
	__addarg "-a" "--arg" "storearray" "optional" "" "help text"
	__adddep "--arg" "dependson" "--flag"
	__parseargs "$@"
	echo "$flag ${arg[@]}"
}

function test_dependencies_valid_storearray_valid_b {
	__addarg "-f" "--flag" "flag" "optional" "" "help text"
	__addarg "-a" "--arg" "storearray" "optional" "" "help text"
	__adddep "--arg" "dependson" "--flag"
	__parseargs "$@"
	echo "$flag ${arg[@]}"
}

function test_dependencies_valid_storearray_valid_c {
	__addarg "-f" "--flag" "flag" "optional" "" "help text"
	__addarg "-a" "--arg" "storearray" "optional" "" "help text"
	__addarg "-b" "--barg" "storearray" "optional" "" "help text"
	__adddep "--arg" "--barg" "dependson" "--flag"
	__parseargs "$@"
	echo "$flag ${arg[@]} ${barg[@]}"
}

function test_dependencies_valid_storearray_valid_d {
	__addarg "-f" "--flag" "flag" "optional" "" "help text"
	__addarg "-a" "--arg" "storearray" "optional" "" "help text"
	__addarg "-b" "--barg" "storearray" "optional" "" "help text"
	__adddep "--arg" "--barg" "dependson" "--flag"
	__parseargs "$@"
	echo "$flag ${arg[@]} ${barg[@]}"
}

function test_dependencies_valid_storearray_invalid_a {
	__addarg "-f" "--flag" "flag" "optional" "" "help text"
	__addarg "-a" "--arg" "storearray" "optional" "" "help text"
	__adddep "--arg" "dependson" "--flag"
	__parseargs "$@"
	echo "$flag ${arg[@]}"
}

function test_dependencies_valid_storearray_invalid_b {
	__addarg "-f" "--flag" "flag" "optional" "" "help text"
	__addarg "-a" "--arg" "storearray" "optional" "" "help text"
	__adddep "--arg" "dependson" "--flag"
	__parseargs "$@"
	echo "$flag ${arg[@]}"
}

function test_dependencies_valid_storearray_invalid_c {
	__addarg "-f" "--flag" "flag" "optional" "" "help text"
	__addarg "-a" "--arg" "storearray" "optional" "" "help text"
	__addarg "-b" "--barg" "storearray" "optional" "" "help text"
	__adddep "--arg" "--barg" "dependson" "--flag"
	__parseargs "$@"
	echo "$flag ${arg[@]} ${barg[@]}"
}

function test_dependencies_valid_storearray_invalid_d {
	__addarg "-f" "--flag" "flag" "optional" "" "help text"
	__addarg "-a" "--arg" "storearray" "optional" "" "help text"
	__addarg "-b" "--barg" "storearray" "optional" "" "help text"
	__adddep "--arg" "--barg" "dependson" "--flag"
	__parseargs "$@"
	echo "$flag ${arg[@]} ${barg[@]}"
}

function test_dependencies_valid_argument_named_dependson {
	__addarg "-f" "--flag" "flag" "optional" "" "help text"
	__addarg "" "--dependson" "flag" "optional" "" "help text"
	__adddep "--dependson" "dependson" "--flag"
	__parseargs "$@"
	echo "$flag $dependson"
}

function test_dependencies_valid_missing_dependency {
	__addarg "-f" "--flag" "flag" "optional" "" "help text"
	__addarg "-g" "--glad" "flag" "optional" "" "help text"
	__adddep "--glad" "dependson" "--flag"
	__parseargs "$@"
	echo "$flag $glad"
}

function test_dependencies_valid_missing_dependent {
	__addarg "-f" "--flag" "flag" "optional" "" "help text"
	__addarg "-g" "--glad" "flag" "optional" "" "help text"
	__adddep "--glad" "dependson" "--flag"
	__parseargs "$@"
	echo "$flag $glad"
}

function test_dependencies_valid_joint_arguments_a {
	__addarg "-f" "--flag" "flag" "optional" "" "help text"
	__addarg "-g" "--glad" "flag" "optional" "" "help text"
	__adddep "--glad" "dependson" "--flag"
	__parseargs "$@"
	echo "$flag $glad"
}

function test_dependencies_valid_joint_arguments_b {
	__addarg "-f" "--flag" "flag" "optional" "" "help text"
	__addarg "-g" "--glad" "flag" "optional" "" "help text"
	__addarg "-v" "--vlad" "flag" "optional" "" "help text"
	__adddep "--glad" "--vlad" "dependson" "--flag"
	__parseargs "$@"
	echo "$flag $glad $vlad"
}

function test_dependencies_valid_mutin_group {
	__addarg "-f" "--flag" "flag" "optional" "" "help text"
	__addarg "-g" "--glad" "flag" "optional" "" "help text"
	__addgroup "flags" "AND" "optional" "--flag" "--glad"
	__adddep "--glad" "dependson" "--flag"
	__parseargs "$@"
	echo "$flag $glad"
}

function test_dependencies_valid_mutor_group {
	__addarg "-f" "--flag" "flag" "optional" "" "help text"
	__addarg "-g" "--glad" "flag" "optional" "" "help text"
	__addgroup "flags" "OR" "optional" "--flag" "--glad"
	__adddep "--glad" "dependson" "--flag"
	__parseargs "$@"
	echo "$flag $glad"
}

function test_dependencies_valid_group_misc {
	__addarg "-f" "--flag" "flag" "optional" "" "help text"
	__addarg "-g" "--glad" "flag" "optional" "" "help text"
	__addarg "-v" "--vlad" "flag" "optional" "" "help text"
	__addarg "-c" "--clad" "flag" "optional" "" "help text"
	__addgroup "flags1" "XOR" "optional" "--flag" "--glad"
	__addgroup "flags2" "XOR" "optional" "--glad" "--vlad"
	__adddep "--flag" "--glad" "dependson" "--clad"
	__adddep "--vlad" "dependson" "--clad"
	__parseargs "$@"
	echo "$flag $glad $vlad $clad"
}

function test_dependencies_valid_dependents_in_mutex {
	__addarg "-f" "--flag" "flag" "optional" "" "help text"
	__addarg "-g" "--glad" "flag" "optional" "" "help text"
	__addarg "-v" "--vlad" "flag" "optional" "" "help text"
	__addgroup "flags" "XOR" "optional" "--flag" "--glad"
	__adddep "--flag" "--glad" "dependson" "--vlad"
	__parseargs "$@"
	echo "$flag $glad $vlad"
}

function test_dependencies_valid_multiple_dependents_single_dependency {
	__addarg "-f" "--flag" "flag" "optional" "" "help text"
	__addarg "-g" "--glad" "flag" "optional" "" "help text"
	__addarg "-v" "--vlad" "flag" "optional" "" "help text"
	__adddep "--flag" "--glad" "dependson" "--vlad"
	__parseargs "$@"
	echo "$flag $glad $vlad"
}

function test_dependencies_valid_single_dependent_multiple_dependencies_valid {
	__addarg "-f" "--flag" "flag" "optional" "" "help text"
	__addarg "-g" "--glad" "flag" "optional" "" "help text"
	__addarg "-v" "--vlad" "flag" "optional" "" "help text"
	__adddep "--flag" "dependson" "--vlad"
	__adddep "--flag" "dependson" "--glad"
	__parseargs "$@"
	echo "$flag $glad $vlad"
}

function test_dependencies_valid_single_dependent_multiple_dependencies_invalid {
	__addarg "-f" "--flag" "flag" "optional" "" "help text"
	__addarg "-g" "--glad" "flag" "optional" "" "help text"
	__addarg "-v" "--vlad" "flag" "optional" "" "help text"
	__adddep "--flag" "dependson" "--vlad"
	__adddep "--flag" "dependson" "--glad"
	__parseargs "$@"
	echo "$flag $glad $vlad"
}

function test_dependencies_valid_multiple_dependency_groups_valid {
	__addarg "-f" "--flag" "flag" "optional" "" "help text"
	__addarg "-g" "--glad" "flag" "optional" "" "help text"
	__addarg "-v" "--vlad" "flag" "optional" "" "help text"
	__addarg "-c" "--clad" "flag" "optional" "" "help text"
	__adddep "--flag" "dependson" "--glad"
	__adddep "--glad" "dependson" "--vlad"
	__adddep "--flag" "dependson" "--clad"
	__parseargs "$@"
	echo "$flag $glad $vlad $clad"
}

function test_dependencies_valid_multiple_dependency_groups_invalid_a {
	__addarg "-f" "--flag" "flag" "optional" "" "help text"
	__addarg "-g" "--glad" "flag" "optional" "" "help text"
	__addarg "-v" "--vlad" "flag" "optional" "" "help text"
	__addarg "-c" "--clad" "flag" "optional" "" "help text"
	__adddep "--flag" "dependson" "--glad"
	__adddep "--glad" "dependson" "--vlad"
	__adddep "--flag" "dependson" "--clad"
	__parseargs "$@"
	echo "$flag $glad $vlad $clad"
}

function test_dependencies_valid_multiple_dependency_groups_invalid_b {
	__addarg "-f" "--flag" "flag" "optional" "" "help text"
	__addarg "-g" "--glad" "flag" "optional" "" "help text"
	__addarg "-v" "--vlad" "flag" "optional" "" "help text"
	__addarg "-c" "--clad" "flag" "optional" "" "help text"
	__adddep "--flag" "dependson" "--glad"
	__adddep "--glad" "dependson" "--vlad"
	__adddep "--flag" "dependson" "--clad"
	__parseargs "$@"
	echo "$flag $glad $vlad $clad"
}

function test_dependencies_valid_required_a {
	__addarg "-f" "--flag" "flag" "optional" "" "help text"
	__addarg "-g" "--glad" "flag" "optional" "" "help text"
	__adddep "--glad" "dependson" "--flag"
	__parseargs "$@"
	echo "$flag $glad"
}

function test_dependencies_valid_required_b {
	__addarg "-f" "--flag" "flag" "optional" "" "help text"
	__addarg "-g" "--glad" "flag" "required" "" "help text"
	__adddep "--flag" "dependson" "--glad"
	__parseargs "$@"
	echo "$flag $glad"
}

function test_dependencies_valid_required_c {
	__addarg "-f" "--flag" "flag" "required" "" "help text"
	__addarg "-g" "--glad" "flag" "optional" "" "help text"
	__adddep "--glad" "dependson" "--flag"
	__parseargs "$@"
	echo "$flag $glad"
}

function test_dependencies_valid_required_d {
	__addarg "-f" "--flag" "flag" "required" "" "help text"
	__addarg "-g" "--glad" "flag" "required" "" "help text"
	__adddep "--glad" "dependson" "--flag"
	__parseargs "$@"
	echo "$flag $glad"
}

# ========= ASSERTIONS ========= #
function koitest_run {
	runtest test_dependencies_valid_one_dependent_flag "0 1" "-g"
	runtest test_dependencies_valid_two_dependents_flags "1 0 1" "-f" "-v"
	runtest test_dependencies_valid_three_dependents_flags "0 1 1 1" "-g" "-c" "-v"
	runtest test_dependencies_valid_mixed_types_valid "1  barg" "-f" "-b" "barg"
	runtest test_dependencies_valid_mixed_types_invalid __error__ "-a" "arg"
	runtest test_dependencies_valid_storearray_valid_a "1 arg" "-a" "arg" "-f"
	runtest test_dependencies_valid_storearray_valid_b "1 arg barg" "-a" "arg" "-f" "-a" "barg"
	runtest test_dependencies_valid_storearray_valid_c "1 arg barg" "-a" "arg" "-f" "-b" "barg"
	runtest test_dependencies_valid_storearray_valid_d "1 arg aarg barg bbarg" "-a" "arg" "-b" "barg" "-a" "aarg" "-f" "-b" "bbarg"
	runtest test_dependencies_valid_storearray_invalid_a __error__ "-a" "arg"
	runtest test_dependencies_valid_storearray_invalid_b __error__ "-a" "arg" "-a" "barg"
	runtest test_dependencies_valid_storearray_invalid_c __error__ "-b" "barg"
	runtest test_dependencies_valid_storearray_invalid_d __error__ "-a" "arg" "-b" "barg" "-a" "aarg" "-b" "bbarg"
	runtest test_dependencies_valid_argument_named_dependson "1 1" "-f" "--dependson"
	runtest test_dependencies_valid_missing_dependency __error__ "--glad"
	runtest test_dependencies_valid_missing_dependent "1 0" "--flag"
	runtest test_dependencies_valid_joint_arguments_a "1 1" "-fg"
	runtest test_dependencies_valid_joint_arguments_b "1 1 1" "-fvg"
	runtest test_dependencies_valid_mutin_group "1 1" "-f" "-g"
	runtest test_dependencies_valid_mutor_group "1 1" "-f" "-g"
	runtest test_dependencies_valid_group_misc "1 0 1 1" "-f" "-v" "-c"
	runtest test_dependencies_valid_dependents_in_mutex "0 1 1" "-v" "-g"
	runtest test_dependencies_valid_multiple_dependents_single_dependency "1 1 1" "-v" "-g" "-f"
	runtest test_dependencies_valid_single_dependent_multiple_dependencies_valid "1 1 1" "-f" "-v" "-g"
	runtest test_dependencies_valid_single_dependent_multiple_dependencies_invalid __error__ "-f" "-v"
	runtest test_dependencies_valid_multiple_dependency_groups_valid "0 1 1 0" "-g" "-v"
	runtest test_dependencies_valid_multiple_dependency_groups_invalid_a __error__ "-f" "-c" "-v"
	runtest test_dependencies_valid_multiple_dependency_groups_invalid_b __error__ "-g" "-c"
	runtest test_dependencies_valid_required_a "0 0"
	runtest test_dependencies_valid_required_b "0 1" "-g"
	runtest test_dependencies_valid_required_c "1 0" "-f"
	runtest test_dependencies_valid_required_d "1 1" "-g" "-f"
}