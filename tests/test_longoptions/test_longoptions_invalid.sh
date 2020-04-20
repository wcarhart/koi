#!/bin/bash

koirequirehelpactions=0

# ========= TESTS ========= #
function test_longoption_invalid_missing {
	__addarg "-a" "" "storevalue" "optional" "" "help text"
	__parseargs "$@"
	echo "$a"
}

function test_longoption_invalid_starts_with_number {
	__addarg "-a" "--9a" "optional" "" "help text"
	__parseargs "$@"
	echo "$9a"
}

function test_longoption_invalid_single_dash {
	__addarg "-a" "-aaa" "optional" "" "help text"
	__parseargs "$@"
	echo "$aaa"
}

function test_longoption_invalid_non_alphanumeric {
	__addarg "-a" "--aa-a" "optional" "" "help text"
	__parseargs "$@"
	echo "$aaa"
}

function test_longoption_invalid_non_unique {
	__addarg "-a" "--aaa" "optional" "" "help text"
	__addarg "-b" "--aaa" "optional" "" "help text"
	__parseargs "$@"
	echo "$aaa"
}

function test_longoption_invalid_positionalvalue {
	__addarg "" "--aaa" "positionalvalue" "optional" "" "help text"
	__parseargs "$@"
	echo "$aaa"
}

function test_longoption_invalid_positionalarray {
	__addarg "" "--aaa" "positionalarray" "optional" "" "help text"
	__parseargs "$@"
	echo "$aaa"
}

function test_longoption_invalid_illegal_names {
	__addarg "" "--BASH" "storevalue" "optional" "" "help text"
	__addarg "" "--BASH_ENV" "storevalue" "optional" "" "help text"
	__addarg "" "--BASH_SUBSHELL" "storevalue" "optional" "" "help text"
	__addarg "" "--BASHPID" "storevalue" "optional" "" "help text"
	__addarg "" "--BASH_VERSINFO" "storevalue" "optional" "" "help text"
	__addarg "" "--BASH_VERSION" "storevalue" "optional" "" "help text"
	__addarg "" "--CDPATH" "storevalue" "optional" "" "help text"
	__addarg "" "--DIRSTACK" "storevalue" "optional" "" "help text"
	__addarg "" "--EDITOR" "storevalue" "optional" "" "help text"
	__addarg "" "--EUID" "storevalue" "optional" "" "help text"
	__addarg "" "--FUNCNAME" "storevalue" "optional" "" "help text"
	__addarg "" "--GLOBIGNORE" "storevalue" "optional" "" "help text"
	__addarg "" "--GROUPS" "storevalue" "optional" "" "help text"
	__addarg "" "--HOME" "storevalue" "optional" "" "help text"
	__addarg "" "--HOSTNAME" "storevalue" "optional" "" "help text"
	__addarg "" "--HOSTTYPE" "storevalue" "optional" "" "help text"
	__addarg "" "--IFS" "storevalue" "optional" "" "help text"
	__addarg "" "--IGNOREEOF" "storevalue" "optional" "" "help text"
	__addarg "" "--LC_COLLATE" "storevalue" "optional" "" "help text"
	__addarg "" "--LC_CTYPE" "storevalue" "optional" "" "help text"
	__addarg "" "--LINENO" "storevalue" "optional" "" "help text"
	__addarg "" "--MACHTYPE" "storevalue" "optional" "" "help text"
	__addarg "" "--OLDPWD" "storevalue" "optional" "" "help text"
	__addarg "" "--OSTYPE" "storevalue" "optional" "" "help text"
	__addarg "" "--PATH" "storevalue" "optional" "" "help text"
	__addarg "" "--PIPESTATUS" "storevalue" "optional" "" "help text"
	__addarg "" "--PPID" "storevalue" "optional" "" "help text"
	__addarg "" "--PROMPT_COMMAND" "storevalue" "optional" "" "help text"
	__addarg "" "--PS1" "storevalue" "optional" "" "help text"
	__addarg "" "--PS2" "storevalue" "optional" "" "help text"
	__addarg "" "--PS3" "storevalue" "optional" "" "help text"
	__addarg "" "--PS4" "storevalue" "optional" "" "help text"
	__addarg "" "--PWD" "storevalue" "optional" "" "help text"
	__addarg "" "--REPLY" "storevalue" "optional" "" "help text"
	__addarg "" "--SECONDS" "storevalue" "optional" "" "help text"
	__addarg "" "--SHELLOPTS" "storevalue" "optional" "" "help text"
	__addarg "" "--SHLVL" "storevalue" "optional" "" "help text"
	__addarg "" "--TMOUT" "storevalue" "optional" "" "help text"
	__addarg "" "--UID" "storevalue" "optional" "" "help text"
	__addarg "" "--koiname" "storevalue" "optional" "" "help text"
	__addarg "" "--koidescription" "storevalue" "optional" "" "help text"
	__addarg "" "--koihelpmenuprefix" "storevalue" "optional" "" "help text"
	__addarg "" "--koiwordwraplength" "storevalue" "optional" "" "help text"
	__addarg "" "--koishowhints" "storevalue" "optional" "" "help text"
	__addarg "" "--koicolorprimary" "storevalue" "optional" "" "help text"
	__addarg "" "--koicolorsecondary" "storevalue" "optional" "" "help text"
	__addarg "" "--koirequirehelpactions" "storevalue" "optional" "" "help text"
	__parseargs "$@"
	echo "done"
}

# ========= ASSERTIONS ========= #
function koitest_run {
	runtest test_longoption_invalid_missing __error__ "-a" "arg"
	runtest test_longoption_invalid_starts_with_number __error__ "--9a" "arg"
	runtest test_longoption_invalid_single_dash __error__ "-aaa" "arg"
	runtest test_longoption_invalid_non_alphanumeric __error__ "--aa-a" "arg"
	runtest test_longoption_invalid_non_unique __error__ "--aaa" "arg"
	runtest test_longoption_invalid_positionalvalue __error__ "aaa"
	runtest test_longoption_invalid_positionalarray __error__ "aaa"
	runtest test_longoption_invalid_illegal_names __error__ "--BASH" "bash"
}