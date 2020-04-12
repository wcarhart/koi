#!/bin/bash

koirequirehelpactions=0

# ========= TESTS ========= #
function test_valid_help {
	__addarg "-h" "--help" "help" "optional" "" "help text"
	__addarg "-a" "--aaa" "storevalue" "optional" "" "help text"
	__addarg "-b" "--bbb" "storevalue" "optional" "" "help text"
	__parseargs "$@"
}

# ========= ASSERTIONS ========= #
function koitest_run {
	runtest test_valid_help "${koicolorsecondary}koi test_valid_help [-h] [-a AAA] [-b BBB]${__reset}\nhelp text\n      -a, --aaa    help text\n      -b, --bbb    help text\n" "-h"
}