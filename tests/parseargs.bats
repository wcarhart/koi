#!/usr/bin/env bats
# Child shells evaluate their own expressions; Bats isolates test invocations.
# shellcheck disable=SC2016,SC2030,SC2031

bats_require_minimum_version 1.5.0

setup() {
    export KOI_LIBRARY="$BATS_TEST_DIRNAME/../koi"
    # shellcheck source=koi
    source "$KOI_LIBRARY"
    __addarg name -o -s n -l name -d 'Person name'
    __addarg verbose -f -s v -l verbose -d 'Print progress'
    __addarg quiet -f -s q -l quiet -d 'Suppress output'
}

# Parse and expose the guard status without hiding the parser's return code.
# Usage: capture_parse "$@"
#   $@  parser settings and script arguments
capture_parse() {
    local result
    __parseargs "$@"
    result=$?
    printf 'return=%s status=%s\n' "$result" "$koi_status"
    return "$result"
}

# Verify invalid input reports an error without assigning any destinations.
# Usage: assert_parse_error "$@"
#   $@  parser settings and script arguments
assert_parse_error() {
    run --separate-stderr parse_without_mutation "$@"
    [ "$status" -eq 2 ]
    [ "$output" = 'return=2 status=2' ]
    [[ "$stderr" == 'koi: __parseargs:'* ]]
}

# Retain old values while checking error paths in the same shell as parsing.
# Usage: parse_without_mutation "$@"
#   $@  parser settings and script arguments
parse_without_mutation() {
    local name=original verbose=original quiet=original result
    capture_parse "$@"
    result=$?
    if [[ $name != original || $verbose != original || $quiet != original ]]; then
        printf 'Destinations changed after an error\n' >&2
        return 9
    fi
    return "$result"
}

@test "plain options and flags assign values into caller locals" {
    local name verbose quiet
    __parseargs --name Alice -v
    [ "$koi_status" -eq 0 ]
    [ "$name" = Alice ]
    [ "$verbose" = 1 ]
    [ "$quiet" = 0 ]
}

@test "unset destinations become globals without author status initialization" {
    unset name verbose quiet
    __parseargs -n Alice
    [ "$name" = Alice ]
    [ "$verbose" = 0 ]
    [ "$quiet" = 0 ]
    [ "$koi_status" -eq 0 ]
}

@test "explicit empty values are accepted" {
    local name=old
    __parseargs -n ''
    [ "$name" = '' ]
}

@test "option values preserve literal whitespace, newlines and shell syntax" {
    local name
    local value=$'  first\n"quotes" $variable $(false) `false` \\ %s  '
    __parseargs --name "$value"
    [ "$name" = "$value" ]
}

@test "option values may match registered spellings or the separator" {
    local name verbose quiet value
    for value in -n --name -v --verbose -10 --; do
        __parseargs -n "$value"
        [ "$name" = "$value" ]
        [ "$verbose" = 0 ]
    done
}

@test "last scalar occurrence wins and repeated flags remain enabled" {
    local name verbose quiet
    __parseargs -n Alice --name Bob -v --verbose
    [ "$name" = Bob ]
    [ "$verbose" = 1 ]
}

@test "reserved duplicate-check setting rejects repeated values and flags" {
    assert_parse_error --koi-error-on-duplicates -n Alice --name Bob
    assert_parse_error --koi-error-on-duplicates -v --verbose
    assert_parse_error --koi-error-on-duplicates -vv
    assert_parse_error --koi-error-on-duplicates -v -qv
    assert_parse_error -v --verbose --koi-error-on-duplicates
}

@test "flags-only clusters match separate flags" {
    local name verbose quiet
    __parseargs -vqv
    [ "$verbose" = 1 ]
    [ "$quiet" = 1 ]
    [ "$name" = '' ]
}

@test "clusters reject value-taking options and unknown members" {
    assert_parse_error -nv
    assert_parse_error -vn
    assert_parse_error -nvh
    assert_parse_error -vx
}

@test "equals forms and attached values are unsupported" {
    assert_parse_error --name=Alice
    assert_parse_error -nAlice
    assert_parse_error --verbose=yes
}

@test "missing values and unsupported positional arguments fail atomically" {
    assert_parse_error -v -n
    assert_parse_error -n Alice extra
    assert_parse_error --unknown
    assert_parse_error ''
}

@test "no delimiter is required and reserved settings cannot be repeated" {
    local name verbose quiet
    __parseargs
    [ "$koi_status" -eq 0 ]
    __parseargs --koi-error-on-duplicates -n Alice
    [ "$name" = Alice ]
    assert_parse_error --koi-error-on-duplicates --koi-error-on-duplicates
}

@test "short e and the old unprefixed setting are not parser settings" {
    __addarg example -f -s e -l error-on-duplicates -d Example
    local example
    __parseargs -e
    [ "$example" = 1 ]
    __parseargs --koi-error-on-duplicates --error-on-duplicates
    [ "$example" = 1 ]
}

@test "reserved settings are literal option values and positionals after the separator" {
    local name
    __parseargs -n --koi-error-on-duplicates
    [ "$name" = --koi-error-on-duplicates ]
    assert_parse_error -- --koi-error-on-duplicates
}

@test "separator ends recognition and is accepted alone" {
    local name verbose quiet
    __parseargs -v --
    [ "$verbose" = 1 ]
    assert_parse_error -- --name
    assert_parse_error -- --help
    assert_parse_error -- -h
    assert_parse_error -- file
}

@test "separator used as an option value does not end recognition" {
    local name verbose quiet
    __parseargs -n -- -v
    [ "$name" = -- ]
    [ "$verbose" = 1 ]
}

@test "automatic standalone help returns a successful guard status without assignments" {
    local flag
    for flag in -h --help; do
        run --separate-stderr capture_parse "$flag"
        [ "$status" -eq 1 ]
        [[ "$output" == Usage:* ]]
        [[ "$output" == *'-h, --help'* ]]
        [[ "$output" == *'-n, --name NAME'*'Person name'* ]]
        [[ "$output" == *'return=1 status=0' ]]
        [ -z "$stderr" ]
    done
}

@test "help overrides ordinary input errors and apparent option-value positions" {
    local flag
    for flag in -h --help; do
        run --separate-stderr capture_parse --unknown "$flag"
        [ "$status" -eq 1 ]
        [ -z "$stderr" ]
        run --separate-stderr capture_parse -n "$flag"
        [ "$status" -eq 1 ]
        [ -z "$stderr" ]
        run --separate-stderr capture_parse --koi-error-on-duplicates -v --verbose "$flag"
        [ "$status" -eq 1 ]
        [ -z "$stderr" ]
        run --separate-stderr capture_parse -nv "$flag"
        [ "$status" -eq 1 ]
        [ -z "$stderr" ]
        run --separate-stderr capture_parse "$flag" -n
        [ "$status" -eq 1 ]
        [ -z "$stderr" ]
    done
}

@test "help in valid flag clusters works but value clusters do not" {
    run --separate-stderr capture_parse -vqh
    [ "$status" -eq 1 ]
    [[ "$output" == *'return=1 status=0' ]]
    [ -z "$stderr" ]
    assert_parse_error -nh
    assert_parse_error -xh
}

@test "help is not recognized inside ordinary option values" {
    local name verbose quiet
    __parseargs -n -vh
    [ "$name" = -vh ]
    [ "$verbose" = 0 ]
}

@test "help precedes requiredness and destination writability checks" {
    __addarg token -o -l token -r -d Token
    local -r name=original
    run --separate-stderr capture_parse --help
    [ "$status" -eq 1 ]
    [[ "$output" == *'--token TOKEN'*'Token (required)'* ]]
    [ -z "$stderr" ]
}

@test "help leaves destinations unchanged" {
    local name=original verbose=original quiet=original result
    if __parseargs -v -n Alice --help > "$BATS_TEST_TMPDIR/help"; then
        return 1
    else
        result=$?
    fi
    [ "$result" -eq 1 ]
    [ "$koi_status" -eq 0 ]
    [ "$name" = original ]
    [ "$verbose" = original ]
    [ "$quiet" = original ]
}

@test "requiredness depends on presence including empty option values" {
    __addarg token -o -l token -r -d Token
    __addarg accept -f -l accept -r -d Accept
    assert_parse_error --accept
    assert_parse_error --token ''
    local token accept
    __parseargs --token '' --accept
    [ "$token" = '' ]
    [ "$accept" = 1 ]
}

@test "absent destinations get fresh empty values, defaults and zero flags" {
    __addarg mode -o -l mode -d Mode -D safe
    __addarg blank -o -l blank -d Blank -D ''
    local name verbose quiet mode blank
    __parseargs -n Alice -v --mode fast --blank value
    [ "$mode" = fast ]
    __parseargs
    [ "$name" = '' ]
    [ "$verbose" = 0 ]
    [ "$quiet" = 0 ]
    [ "$mode" = safe ]
    [ "$blank" = '' ]
}

@test "help displays literal defaults and declaration order" {
    __addarg mode -o -l mode -d Mode -D 'safe %s'
    run --separate-stderr capture_parse --help
    [ "$status" -eq 1 ]
    [[ "$output" == *'--mode MODE'*'Mode (default: safe %s)'* ]]
    [[ "$output" == *'Person name'*'Print progress'*'Suppress output'*'Mode (default:'* ]]
    [ -z "$stderr" ]
}

@test "exported plain scalars are supported" {
    local name=old
    export name
    __parseargs -n Alice
    [ "$name" = Alice ]
}

@test "readonly destinations fail before earlier destinations are assigned" {
    local name=original result
    local -r quiet=original
    if __parseargs -n Alice -q > "$BATS_TEST_TMPDIR/out" 2> "$BATS_TEST_TMPDIR/err"; then
        return 1
    else
        result=$?
    fi
    [ "$result" -eq 2 ]
    [ "$koi_status" -eq 2 ]
    [ ! -s "$BATS_TEST_TMPDIR/out" ]
    [ "$(cat "$BATS_TEST_TMPDIR/err")" = "koi: __parseargs: incompatible destination: 'quiet'" ]
    [ "$name" = original ]
    [ "$quiet" = original ]
}

@test "nonplain destination types are rejected before any assignment" {
    local declaration
    for declaration in '-i' '-l' '-u' '-a' '-A' '-n'; do
        run --separate-stderr bash -c '
            source "$KOI_LIBRARY" || exit
            __addarg first -o -l first -d First || exit
            __addarg second -o -l second -d Second || exit
            first=original
            target=original
            declare "$1" second
            __parseargs --first changed --second changed
            result=$?
            [[ $first == original && $target == original && $koi_status == 2 ]] || exit 9
            exit "$result"
        ' bash "$declaration"
        [ "$status" -eq 2 ]
        [ -z "$output" ]
        [ "$stderr" = "koi: __parseargs: incompatible destination: 'second'" ]
    done
}

@test "invalid specs fail silently even for help and never clear validity" {
    run --separate-stderr bash -c '
        source "$KOI_LIBRARY" || exit
        __addarg 2>/dev/null
        __parseargs --help
        result=$?
        [[ $koi_status == 2 && $__koi_spec_valid == 0 ]] || exit 9
        exit "$result"
    '
    [ "$status" -eq 2 ]
    [ -z "$output" ]
    [ -z "$stderr" ]
}

@test "help overrides errors in reserved settings" {
    run --separate-stderr capture_parse --koi-error-on-duplicates --koi-error-on-duplicates --help
    [ "$status" -eq 1 ]
    [[ "$output" == *'return=1 status=0' ]]
    [ -z "$stderr" ]
}

@test "parsing never changes registry metadata or sticky validity" {
    local before after
    before=$(declare -p __koi_args __koi_arg_shorts __koi_arg_longs __koi_arg_kinds \
        __koi_arg_descriptions __koi_arg_requireds __koi_arg_defaults __koi_arg_display_names __koi_spec_valid)
    __parseargs -n Alice
    after=$(declare -p __koi_args __koi_arg_shorts __koi_arg_longs __koi_arg_kinds \
        __koi_arg_descriptions __koi_arg_requireds __koi_arg_defaults __koi_arg_display_names __koi_spec_valid)
    [ "$before" = "$after" ]
    assert_parse_error --unknown
    [ "$__koi_spec_valid" -eq 1 ]
}

@test "guard stops business logic on help and errors without author status locals" {
    run --separate-stderr bash -c '
        source "$KOI_LIBRARY" || exit
        __addarg name -o -l name -d Name || exit
        business() {
            __parseargs "$@" || return "$koi_status"
            printf "business:%s\\n" "$name"
        }
        business --name Alice || exit
        business --help || exit
        business --unknown
        result=$?
        printf "survived\\n"
        exit "$result"
    '
    [ "$status" -eq 2 ]
    [[ "$output" == business:Alice* ]]
    [[ "$output" != *'business:'*'business:'* ]]
    [[ "$output" == *survived ]]
    [[ "$stderr" == 'koi: __parseargs:'* ]]
}

@test "guard is reliable when errexit is enabled but suppressed by a conditional call" {
    run --separate-stderr bash -c '
        set -e
        source "$KOI_LIBRARY"
        __addarg name -o -l name -d Name
        business() {
            __parseargs "$@" || return "$koi_status"
            printf "BAD\\n"
        }
        if business --unknown; then
            exit 9
        else
            result=$?
        fi
        [[ $result == 2 && $koi_status == 2 ]]
    '
    [ "$status" -eq 0 ]
    [ -z "$output" ]
    [[ "$stderr" == 'koi: __parseargs:'* ]]
}

@test "parse outcomes overwrite stale status and preserve optional caller-local status" {
    local koi_status=99
    __parseargs
    [ "$koi_status" -eq 0 ]
    if __parseargs --help > /dev/null; then
        return 1
    fi
    [ "$koi_status" -eq 0 ]
    if __parseargs --unknown 2>/dev/null; then
        return 1
    fi
    [ "$koi_status" -eq 2 ]
    __parseargs
    [ "$koi_status" -eq 0 ]
}

@test "parser works with nounset enabled" {
    run --separate-stderr bash -uc '
        source "$KOI_LIBRARY" || exit
        __addarg name -o -l name -d Name || exit
        __parseargs --name "" || exit "$koi_status"
        [[ $name == "" && $koi_status == 0 ]]
    '
    [ "$status" -eq 0 ]
    [ -z "$output" ]
    [ -z "$stderr" ]
}

@test "help lists short spellings in usage and aligns descriptions after full labels" {
    cat > "$BATS_TEST_TMPDIR/test.sh" <<'SCRIPT'
source "$KOI_LIBRARY"
__addarg env -o -s e -l environment -d 'Deploy environment'
__addarg dry -f -s d -l dry-run -d 'Dry run'
main() {
    __parseargs "$@" || return "$koi_status"
}
main "$@"
SCRIPT
    run --separate-stderr bash "$BATS_TEST_TMPDIR/test.sh" -h
    [ "$status" -eq 0 ]
    [ -z "$stderr" ]
    [ "$output" = 'Usage: test.sh [-h] [-e ENVIRONMENT] [-d]

Options:
  -h, --help                     Show this help
  -e, --environment ENVIRONMENT  Deploy environment
  -d, --dry-run                  Dry run' ]
}

@test "usage falls back to long spellings and distinguishes required arguments" {
    __addarg token -o -l token -r -d Token
    __addarg xflag -f -s x -d Xflag
    run --separate-stderr capture_parse --help
    [ "$status" -eq 1 ]
    [[ "${lines[0]}" == 'Usage: '*' [-h] [-n NAME] [-v] [-q] --token TOKEN [-x]' ]]
    [[ "$output" == *'--token TOKEN'*'Token (required)'* ]]
    [ -z "$stderr" ]
}

@test "short-only options use uppercase destinations as value labels" {
    __addarg output_file -o -s O -d Output
    run --separate-stderr capture_parse --help
    [ "$status" -eq 1 ]
    [[ "${lines[0]}" == *'[-O OUTPUT_FILE]' ]]
    [[ "$output" == *'-O OUTPUT_FILE'*'Output'* ]]
    [ -z "$stderr" ]
}

@test "multiline descriptions continue at the same description column" {
    __addarg env -o -s e -l environment -d $'Deploy environment\nContinuation text'
    run --separate-stderr capture_parse --help
    [ "$status" -eq 1 ]
    [ -z "$stderr" ]
    local line first_prefix='' continuation_prefix='' help_prefix=''
    for line in "${lines[@]}"; do
        case $line in
            *'Deploy environment')
                first_prefix=${line%Deploy environment}
                ;;
            *'Continuation text')
                continuation_prefix=${line%Continuation text}
                ;;
            *'Show this help')
                help_prefix=${line%Show this help}
                ;;
        esac
    done
    [ -n "$first_prefix" ]
    [ "${#first_prefix}" -eq "${#continuation_prefix}" ]
    [ "${#first_prefix}" -eq "${#help_prefix}" ]
    [[ $continuation_prefix != *[!\ ]* ]]
}

@test "custom display names are uppercased in usage and the aligned help table" {
    cat > "$BATS_TEST_TMPDIR/test.sh" <<'SCRIPT'
source "$KOI_LIBRARY"
__addarg env -o -s e -l environment -d 'Deploy environment' -n env
__addarg dry -f -s d -l dry-run -d 'Dry run'
main() {
    __parseargs "$@" || return "$koi_status"
}
main "$@"
SCRIPT
    run --separate-stderr bash "$BATS_TEST_TMPDIR/test.sh" -h
    [ "$status" -eq 0 ]
    [ -z "$stderr" ]
    [ "$output" = 'Usage: test.sh [-h] [-e ENV] [-d]

Options:
  -h, --help             Show this help
  -e, --environment ENV  Deploy environment
  -d, --dry-run          Dry run' ]
}

@test "custom display names also work for long-only and short-only options" {
    __addarg env -o -l environment --display-name target -d Environment
    __addarg file -o -s F -n path -d File
    run --separate-stderr capture_parse --help
    [ "$status" -eq 1 ]
    [[ "${lines[0]}" == *'[--environment TARGET] [-F PATH]' ]]
    [[ "$output" == *'--environment TARGET'*'Environment'* ]]
    [[ "$output" == *'-F PATH'*'File'* ]]
    [ -z "$stderr" ]
}

@test "display names do not change spelling, destination or parsed values" {
    __addarg env -o -l environment -s e -n target -d Environment
    local env
    __parseargs -e production
    [ "$env" = production ]
    assert_parse_error --target production
}
