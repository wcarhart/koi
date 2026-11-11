#!/usr/bin/env bash

# shellcheck source=../../../koi
source "$(dirname -- "${BASH_SOURCE[0]}")/../../../koi" || exit $?

__koiconfig name deploy-demo
__koiconfig description 'Explore nested deployment commands. All operations print their inputs without deploying anything.'
__koiconfig help-width 72

profile=
__addarg profile -o -s e -l profile -D local -d 'Root connection profile'
__addcommand deploy -f deploy -d 'Choose an application or database deployment'
__addcommand status -f status -d 'Show a mock deployment status'
__addcommand inspect -f status -d 'Inspect deployment status using an alias'

# Route a deployment to an application or database operation
# Usage: deploy [-e ENV] COMMAND
#   -e, --environment ENV  deployment environment (default: staging)
#   COMMAND               app or database
deploy() {
    local environment

    __addarg environment -o -s e -l environment -n env -D staging -d 'Deployment environment'
    __addcommand app -f deploy_app -d 'Preview an application deployment'
    __addcommand database -f database -d 'Choose a database maintenance operation'
    __parseargs "$@" || return "$koi_status"
}

# Print a mock application deployment using independent root and command values
# Usage: deploy_app -n NAME [-e REVISION] [-d]
#   -n, --name NAME          required application name
#   -e, --revision REVISION  application revision (default: latest)
#   -d, --dry-run            explicitly request a dry run; this demo always prints only
deploy_app() {
    local name revision dry_run

    __addarg name -o -s n -l name -r -d 'Application name'
    __addarg revision -o -s e -l revision -D latest -d 'Application revision'
    __addarg dry_run -f -s d -l dry-run -d 'Mark the operation as a dry run'
    __parseargs "$@" || return "$koi_status"

    printf 'Would deploy app: profile=%q environment=%q name=%q revision=%q dry_run=%s\n' \
        "$profile" "$environment" "$name" "$revision" "$dry_run"
}

# Route database maintenance to its leaf operation
# Usage: database COMMAND
#   COMMAND  migrate
database() {
    __addcommand migrate -f migrate -d 'Preview database migrations without applying them'
    __parseargs "$@" || return "$koi_status"
}

# Print a mock database migration
# Usage: migrate [-t TARGET]
#   -t, --target TARGET  migration target (default: latest)
migrate() {
    local target

    __addarg target -o -s t -l target -D latest -d 'Migration target'
    __parseargs "$@" || return "$koi_status"

    printf 'Would migrate database: profile=%q environment=%q target=%q\n' \
        "$profile" "$environment" "$target"
}

# Print a mock status through either registered alias
# Usage: status [-f FORMAT]
#   -f, --format FORMAT  display format (default: summary)
status() {
    local format

    __adddescription 'Fallback description for a direct status function call.'
    __addarg format -o -s f -l format -D summary -d 'Status display format'
    __parseargs "$@" || return "$koi_status"

    printf 'Would show status: profile=%q format=%q\n' "$profile" "$format"
}

__koirun --koi-enable-verbose-help --koi-enable-help-hints "$@"
