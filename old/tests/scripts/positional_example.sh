#!/bin/bash
set -e

: <<- COMMENT
To use koi:
  1. source the koi script
  2. override the 'koiname' variable with the name of your script
  3. override the 'koidescription' variable with the description of your script

To add arguments:
  1. add arguments to each function with __addarg
  2. parse the arguments with __parseargs "$@"

To run the script, use the __koirun function at the very end of the script:
  __koirun "$@"
COMMENT

source ../../koi
koiname=positional_example.sh
koidescription="Examples of how to use positional arguments with koi"

function fetchtweets {
	__addarg "-h" "--help" "help" "optional" "" "Fetch a user's tweets"
	__addarg "" "apikey" "positionalvalue" "required" "" "Your Twitter API key"
	__addarg "" "user" "positionalvalue" "required" "" "The name of the user"
	__addarg "-n" "--num" "storevalue" "optional" "10" "The number of tweets to fetch"
	__parseargs "$@"
	# fetch tweets
}

function checkstockprice {
	__addarg "-h" "--help" "help" "optional" "" "Check a stock's price"
	__addarg "" "symbol" "positionalarray" "required" "" "The ticker symbol(s) to check"
	__addarg "-e" "--exchange" "storevalue" "optional" "NYSE" "The exchange to use"
	__addarg "-p" "--port" "storevalue" "required" "" "The port to use"
	__addarg "-q" "--quiet" "flag" "optional" "" "If included, run in quiet mode"
	__parseargs "$@"
	# check the stock price
}

__koirun "$@"
