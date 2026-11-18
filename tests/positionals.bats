#!/usr/bin/env bats
# Snippets expand their own variables in isolated Bash processes.
# shellcheck disable=SC2016

bats_require_minimum_version 1.5.0

setup() {
    export KOI_LIBRARY="$BATS_TEST_DIRNAME/../koi"
    export KOI_INSPECTION_FIXTURE="$BATS_TEST_DIRNAME/fixtures/inspection.sh"
}

# Run positional scenarios with strict shell settings
# Usage: run_positional BODY "$@"
#   BODY  Bash source executed after loading koi
#   $@    literal script arguments
run_positional() {
    local body=$1
    shift
    run --separate-stderr bash -euc 'source "$KOI_LIBRARY"; eval "$1"' tool "$body" "$@"
}

# Run registration and parsing inside an application function
# Usage: run_function_positional BODY
#   BODY  Bash source for the function body, including assertions
run_function_positional() {
    run_positional 'main() {
'"$1"'
}
main'
}

@test "positionals register without spellings and retain scalar metadata" {
    run_positional '
        koi::add_arg source --positional --required -n file -d Source
        koi::add_arg target -p -D "" -d Target
        [[ ${__koi_root_arg_kinds[source]} == positional ]]
        [[ ${__koi_root_arg_shorts[source]} == "" && ${__koi_root_arg_longs[source]} == "" ]]
        [[ ${__koi_root_arg_requireds[source]} == 1 ]]
        [[ ${__koi_root_arg_display_names[source]} == file ]]
        [[ ${__koi_root_arg_defaults[target]+present} == present ]]
    '
    [ "$status" -eq 0 ]
}

@test "positional declarations reject spellings required defaults and empty labels" {
    local declaration
    for declaration in '-s p' '-l path' '-s ""' '-l ""' '-r -D value' '-n ""'; do
        run_positional "koi::add_arg path -p -d Path $declaration"
        [ "$status" -eq 2 ]
    done
}

@test "positionals interleave with options and flags in positional declaration order" {
    run_positional '
        parse() {
            local source target format verbose name
            koi::add_arg source -p -r -d Source
            koi::add_arg verbose -f -s v -d Verbose
            koi::add_arg target -p -D . -d Target
            koi::add_arg name -o -s n -d Name
            koi::add_arg format -p -D text -d Format
            koi::parse "$@" || return "$koi_status"
            [[ $source == first && $target == second && $format == third ]]
            [[ $verbose == 1 && $name == name ]]
        }
        parse first -v -n name second third
    '
    [ "$status" -eq 0 ]
}

@test "optional positionals reset stale values and fill multiple slots left to right" {
    run_function_positional '
        first=stale second=stale third=stale
        koi::add_arg first -p -D default -d First
        koi::add_arg second -p -d Second
        koi::add_arg third -p -D end -d Third
        koi::parse supplied || return "$koi_status"
        [[ $first == supplied && $second == "" && $third == end ]]
    '
    [ "$status" -eq 0 ]
}

@test "literal positional values including empty strings and destination names survive" {
    run_positional '
        parse() {
            local first second third
            koi::add_arg first -p -r -d First
            koi::add_arg second -p -r -d Second
            koi::add_arg third -p -r -d Third
            koi::parse "$@" || return "$koi_status"
            [[ $first == "$1" && $second == "$2" && $third == "$3" ]]
        }
        parse "" first $'"'"'  line one\nline two "quoted" \\ $HOME $(false)  '"'"'
    '
    [ "$status" -eq 0 ]
}

@test "lone dash is data and separator makes help settings and negatives literal" {
    run_positional '
        parse() {
            local first second third fourth
            koi::add_arg first -p -r -d First
            koi::add_arg second -p -r -d Second
            koi::add_arg third -p -r -d Third
            koi::add_arg fourth -p -r -d Fourth
            koi::parse "$@" || return "$koi_status"
            [[ $first == - && $second == -12 && $third == --help && $fourth == --koi-error-on-scalar-duplicates ]]
        }
        parse - -- -12 --help --koi-error-on-scalar-duplicates
    '
    [ "$status" -eq 0 ]
}

@test "missing excess unknown dash tokens and incompatible destinations assign nothing" {
    local arguments
    for arguments in '' 'first second' '--unknown' '-12' '-xyz'; do
        run_function_positional '
            value=original flag=original
            koi::add_arg value -p -r -d Value
            koi::add_arg flag -f -s v -d Flag
            if koi::parse -v '"$arguments"'; then
                exit 9
            fi
            [[ $koi_status == 2 && $value == original && $flag == original ]]
        '
        [ "$status" -eq 0 ]
        [[ "$stderr" == 'koi: '* ]]
    done
    run_function_positional '
        value=original
        declare -a incompatible=()
        koi::add_arg value -p -r -d Value
        koi::add_arg incompatible -p -r -d Incompatible
        if koi::parse one two; then
            exit 9
        fi
        [[ $koi_status == 2 && $value == original ]]
    '
    [ "$status" -eq 0 ]
    [[ "$stderr" == *'incompatible destination'* ]]
}

@test "help bypasses positional presence and scanning errors without assignment" {
    run_function_positional '
        value=original
        koi::add_arg value -p -r -d Value
        if koi::parse --unknown first extra --help; then
            exit 9
        fi
        [[ $koi_status == 0 && $value == original ]]
    '
    [ "$status" -eq 0 ]
    [[ "$output" == *'Positionals:'* ]]
    [ -z "$stderr" ]
}

@test "required positional suffixes are invalid before help and inspection" {
    local request
    for request in '' '--help' '--koi-inspect spec'; do
        run_function_positional '
            koi::add_arg optional -p -d Optional
            koi::add_arg flag -f -s v -d Flag
            koi::add_arg required -p -r -d Required
            koi::parse '"$request"'
        '
        [ "$status" -eq 2 ]
        [[ "$stderr" == *'required positionals must precede optional positionals'* ]]
        [ -z "$output" ]
    done
}

@test "application children and positionals conflict in either registration order" {
    local declarations parser request runner
    for declarations in 'koi::add_arg value -p -d Value; koi::add_command help -f child -d Child' \
        'koi::add_command child -f child -d Child; koi::add_arg value -p -d Value'; do
        for parser in koi::parse koi::run; do
            runner=run_positional
            if [[ $parser == koi::parse ]]; then
                runner=run_function_positional
            fi
            for request in '--help' '--koi-inspect spec'; do
                "$runner" 'child() { :; }; '"$declarations; $parser $request"
                [ "$status" -eq 2 ]
                [[ "$stderr" == *'positionals cannot coexist with application child commands'* ]]
                [ -z "$output" ]
            done
        done
    done
}

@test "terminal root runner parses required positionals and suppresses verbose hints" {
    run_positional '
        koi::config name tool
        koi::add_arg value -p -r -d Value
        koi::config verbose-help true; koi::config help-hints true; koi::run help
        [[ $value == help ]]
    '
    [ "$status" -eq 0 ]
    [ -z "$output" ]
    run_positional '
        koi::add_arg value -p -r -d Value
        koi::config verbose-help true; koi::config help-hints true; koi::run --help
    '
    [ "$status" -eq 0 ]
    [[ "$output" == *'Usage: tool [-h] VALUE'* ]]
    [[ "$output" != *COMMAND* && "$output" != *Commands:* && "$output" != *Hints:* ]]
}

@test "terminal runner no-input semantics ignore command-only settings" {
    run_positional '
        value=stale
        koi::add_arg value -p -D default -d Value
        koi::config missing-command-message "Need a command"; koi::config help-on-unknown-commands true; koi::run
        [[ $value == default ]]
        if koi::run; then
            exit 9
        fi
    '
    [ "$status" -eq 0 ]
    [[ "$stderr" == *'call only once'* ]]
    run_positional '
        koi::add_arg value -p -r -d Value
        koi::config missing-command-message "Need a command"; koi::run
    '
    [ "$status" -eq 2 ]
    [[ "$stderr" == *"missing required argument: 'value'"* ]]
}

@test "routed positional leaf treats help as data and preserves branch option ownership" {
    run_positional '
        koi::add_arg root_flag -f -s v -d Root
        koi::add_command create -f create -d Create
        create() {
            koi::add_arg branch_flag -f -s v -d Branch
            koi::add_command server -f server -d Server
            koi::parse "$@" || return "$koi_status"
            echo BAD
        }
        server() {
            local value name
            koi::add_arg value -p -r -d Value
            koi::add_arg name -o -s n -d Name
            koi::parse "$@" || return "$koi_status"
            [[ $root_flag == 1 && $branch_flag == 1 && $name == cool && $value == help ]]
        }
        koi::run -v create -v -- server -n cool help
    '
    [ "$status" -eq 0 ]
    [ -z "$output" ]
}

@test "positional help puts options first and displays labels defaults and requiredness" {
    run_positional '
        koi::config help-width 50
        koi::add_arg source -p -r -d "Source file"
        koi::add_arg verbose -f -s v -d Verbose
        koi::add_arg target -p -n directory -D . -d "Destination directory with a description long enough to wrap"
        koi::run --help
    '
    [ "$status" -eq 0 ]
    [[ "$output" == *'Usage: tool [-h] [-v] SOURCE [DIRECTORY]'* ]]
    [[ "$output" == *Options:*Verbose*Positionals:*'Source file (required)'*'Destination directory'*'(default: .)'* ]]
    [[ "$output" != *Commands:* ]]
}

@test "repeated nested and recursive calls isolate positional cursors and defaults" {
    run_positional '
        leaf() {
            local value optional
            koi::add_arg value -p -r -d Value
            koi::add_arg optional -p -D default -d Optional
            koi::parse "$@" || return "$koi_status"
            if [[ $value == outer ]]; then
                leaf inner custom
                [[ $value == outer && $optional == default ]]
            elif [[ $value == inner ]]; then
                [[ $optional == custom ]]
            else
                [[ $value == again && $optional == default ]]
            fi
        }
        leaf outer
        leaf again
    '
    [ "$status" -eq 0 ]
    [ -z "$stderr" ]
}

@test "positional assignments respect dynamic scope and optional empty defaults" {
    run_positional '
        assign() {
            koi::add_arg value -p -r -d Value
            koi::add_arg optional -p -D "" -d Optional
            koi::parse "$@" || return "$koi_status"
        }
        outer() {
            local value=stale optional=stale
            assign supplied
            [[ $value == supplied && $optional == "" ]]
        }
        outer
        [[ ! -v value && ! -v optional ]]
    '
    [ "$status" -eq 0 ]
}

@test "inspection preserves positional metadata and suppresses effective builtin help" {
    run_positional '
        source "$KOI_INSPECTION_FIXTURE"
        leaf() {
            local value=original
            koi::add_arg value -p -r -n file -d Value
            koi::add_arg optional -p -D "" -d Optional
            koi::parse "$@" || return "$koi_status"
            echo BAD
        }
        check() {
            [[ ${__koi_saved_args[*]} == "value optional" ]]
            [[ ${__koi_saved_arg_kinds[value]} == positional ]]
            [[ ${__koi_saved_arg_display_names[value]} == file ]]
            [[ ${__koi_saved_arg_defaults[optional]+present} == present ]]
            [[ ${__koi_saved_meta[builtin]} == 0 && ${__koi_saved_meta[verbose]} == 0 ]]
            [[ ! -v optional && ! -v value ]]
        }
        capture_spec leaf check
        koi::add_arg value -p -r -n file -d Value
        koi::add_arg optional -p -D "" -d Optional
        capture_spec koi::run check
    '
    [ "$status" -eq 0 ]
    [ -z "$output" ]
    [ -z "$stderr" ]
}

@test "root verbose help documents positional leaves without their help subcommands" {
    run_positional '
        koi::add_command leaf -f leaf -d Leaf
        leaf() {
            koi::add_arg value -p -r -d Value
            koi::parse "$@" || return "$koi_status"
            echo BAD
        }
        koi::config verbose-help true; koi::run help --verbose
    '
    [ "$status" -eq 0 ]
    [[ "$output" == *'Usage: tool [-h] COMMAND'*'Usage: tool leaf [-h] VALUE'*'Positionals:'* ]]
    [[ "$output" != *'tool leaf [-h] VALUE [COMMAND]'* && "$output" != *BAD* ]]
}

@test "optional routed positionals suppress help even when no values are supplied" {
    run_positional '
        koi::add_command leaf -f leaf -d Leaf
        leaf() {
            local value=stale
            koi::add_arg value -p -D default -d Value
            koi::parse "$@" || return "$koi_status"
            [[ $value == default ]]
            echo ran
        }
        koi::run leaf
    '
    [ "$status" -eq 0 ]
    [ "$output" = ran ]
    run_positional '
        koi::add_command leaf -f leaf -d Leaf
        leaf() {
            koi::add_arg value -p -d Value
            koi::parse "$@" || return "$koi_status"
            echo BAD
        }
        koi::run leaf --help
    '
    [ "$status" -eq 0 ]
    [[ "$output" == *'Usage: tool leaf [-h] [VALUE]'* ]]
    [[ "$output" != *COMMAND* && "$output" != *Commands:* && "$output" != *BAD* ]]
}

@test "layout failures and help do not poison later function registrations" {
    run_positional '
        invalid() {
            koi::add_arg optional -p -d Optional
            koi::add_arg required -p -r -d Required
            koi::parse "$@" || return "$koi_status"
            echo BAD
        }
        valid() {
            local value
            koi::add_arg value -p -r -d Value
            koi::parse "$@" || return "$koi_status"
            [[ $value == supplied ]]
        }
        if invalid --help; then
            exit 9
        fi
        valid --help
        valid supplied
    '
    [ "$status" -eq 0 ]
    [[ "$stderr" == *'required positionals must precede optional positionals'* ]]
    [[ "$output" != *BAD* ]]
}

@test "option separator values and duplicate policy work alongside positional slots" {
    run_positional '
        parse() {
            local value name flag
            koi::add_arg value -p -r -d Value
            koi::add_arg name -o -s n -d Name
            koi::add_arg flag -f -s v -d Flag
            koi::config error-on-scalar-duplicates true
            koi::parse "$@" || return "$koi_status"
            [[ $value == supplied && $name == -- && $flag == 1 ]]
        }
        parse -n -- supplied -v
        if parse supplied -v -v; then
            exit 9
        fi
    '
    [ "$status" -eq 0 ]
    [[ "$stderr" == *"duplicate argument: 'flag'"* ]]
}
