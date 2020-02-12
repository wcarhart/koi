#!/bin/bash
set -e

: <<- COMMENT
To use koi, you need to do three things:
  1. source the koi script
  2. override the 'koiname' variable
  3. override the 'koidescription' variable

To run the script, use the __koirun function at the very end of the script:
  __koirun "$@"
COMMENT

source koi
koiname=workflow_example.sh
koidescription="Examples of potential workflow-related commands you could make with koi"

# ============ CLI FUNCTIONS ============ #

# Here's an example of of koi only using long options (starting with --)
function start {
	__addarg "-h" "--help" "help" "optional" "" "Start a workflow given a workflow script"
	__addarg "" "--script" "filepath" "required" "" "The workflow script"
	__addarg "" "--name" "storevalue" "required" "" "The name of the workflow"
	__addarg "" "--user" "storevalue" "optional" "`whoami`" "The workflow user"
	__parseargs "$@"

	# start your workflow!
}

function checkstatus {
	__addarg "-h" "--help" "help" "optional" "" "Check the status of an existing workflow"
	__addarg "" "--name" "storevalue" "required" "" "The name of the workflow to check"
	__parseargs "$@"

	# check your workflow
}

# ============ RUN LOGIC ============ #
__koirun "$@"
