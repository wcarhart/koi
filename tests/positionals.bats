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
        __addarg source --positional --required -n file -d Source
        __addarg target -p -D "" -d Target
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
        run_positional "__addarg path -p -d Path $declaration"
        [ "$status" -eq 2 ]
    done
}

@test "positionals interleave with options and flags in positional declaration order" {
    run_positional '
        parse() {
            local source target format verbose name
            __addarg source -p -r -d Source
            __addarg verbose -f -s v -d Verbose
            __addarg target -p -D . -d Target
            __addarg name -o -s n -d Name
            __addarg format -p -D text -d Format
            __parseargs "$@" || return "$koi_status"
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
        __addarg first -p -D default -d First
        __addarg second -p -d Second
        __addarg third -p -D end -d Third
        __parseargs supplied || return "$koi_status"
        [[ $first == supplied && $second == "" && $third == end ]]
    '
    [ "$status" -eq 0 ]
}

@test "literal positional values including empty strings and destination names survive" {
    run_positional '
        parse() {
            local first second third
            __addarg first -p -r -d First
            __addarg second -p -r -d Second
            __addarg third -p -r -d Third
            __parseargs "$@" || return "$koi_status"
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
            __addarg first -p -r -d First
            __addarg second -p -r -d Second
            __addarg third -p -r -d Third
            __addarg fourth -p -r -d Fourth
            __parseargs "$@" || return "$koi_status"
            [[ $first == - && $second == -12 && $third == --help && $fourth == --koi-error-on-duplicates ]]
        }
        parse - -- -12 --help --koi-error-on-duplicates
    '
    [ "$status" -eq 0 ]
}

@test "missing excess unknown dash tokens and incompatible destinations assign nothing" {
    local arguments
    for arguments in '' 'first second' '--unknown' '-12' '-xyz'; do
        run_function_positional '
            value=original flag=original
            __addarg value -p -r -d Value
            __addarg flag -f -s v -d Flag
            if __parseargs -v '"$arguments"'; then
                exit 9
            fi
            [[ $koi_status == 2 && $value == original && $flag == original ]]
        '
        [ "$status" -eq 0 ]
        [[ "$stderr" == *'__parseargs:'* ]]
    done
    run_function_positional '
        value=original
        declare -a incompatible=()
        __addarg value -p -r -d Value
        __addarg incompatible -p -r -d Incompatible
        if __parseargs one two; then
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
        __addarg value -p -r -d Value
        if __parseargs --unknown first extra --help; then
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
            __addarg optional -p -d Optional
            __addarg flag -f -s v -d Flag
            __addarg required -p -r -d Required
            __parseargs '"$request"'
        '
        [ "$status" -eq 2 ]
        [[ "$stderr" == *'required positionals must precede optional positionals'* ]]
        [ -z "$output" ]
    done
}

@test "application children and positionals conflict in either registration order" {
    local declarations parser request runner
    for declarations in '__addarg value -p -d Value; __addcommand help -f child -d Child' \
        '__addcommand child -f child -d Child; __addarg value -p -d Value'; do
        for parser in __parseargs __koirun; do
            runner=run_positional
            if [[ $parser == __parseargs ]]; then
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
        __koiconfig name tool
        __addarg value -p -r -d Value
        __koirun --koi-enable-verbose-help --koi-enable-help-hints help
        [[ $value == help ]]
    '
    [ "$status" -eq 0 ]
    [ -z "$output" ]
    run_positional '
        __addarg value -p -r -d Value
        __koirun --koi-enable-verbose-help --koi-enable-help-hints --help
    '
    [ "$status" -eq 0 ]
    [[ "$output" == *'Usage: tool [-h] VALUE'* ]]
    [[ "$output" != *COMMAND* && "$output" != *Commands:* && "$output" != *Hints:* ]]
}

@test "terminal runner no-input semantics ignore command-only settings" {
    run_positional '
        value=stale
        __addarg value -p -D default -d Value
        __koirun --koi-zero-argument-message "Need a command" --koi-enable-help-on-unknown-commands
        [[ $value == default ]]
        if __koirun; then
            exit 9
        fi
    '
    [ "$status" -eq 0 ]
    [[ "$stderr" == *'call only once'* ]]
    run_positional '
        __addarg value -p -r -d Value
        __koirun --koi-zero-argument-message "Need a command"
    '
    [ "$status" -eq 2 ]
    [[ "$stderr" == *"missing required argument: 'value'"* ]]
}

@test "routed positional leaf treats help as data and preserves branch option ownership" {
    run_positional '
        __addarg root_flag -f -s v -d Root
        __addcommand create -f create -d Create
        create() {
            __addarg branch_flag -f -s v -d Branch
            __addcommand server -f server -d Server
            __parseargs "$@" || return "$koi_status"
            echo BAD
        }
        server() {
            local value name
            __addarg value -p -r -d Value
            __addarg name -o -s n -d Name
            __parseargs "$@" || return "$koi_status"
            [[ $root_flag == 1 && $branch_flag == 1 && $name == cool && $value == help ]]
        }
        __koirun -v create -v -- server -n cool help
    '
    [ "$status" -eq 0 ]
    [ -z "$output" ]
}

@test "positional help puts options first and displays labels defaults and requiredness" {
    run_positional '
        __koiconfig help-width 50
        __addarg source -p -r -d "Source file"
        __addarg verbose -f -s v -d Verbose
        __addarg target -p -n directory -D . -d "Destination directory with a description long enough to wrap"
        __koirun --help
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
            __addarg value -p -r -d Value
            __addarg optional -p -D default -d Optional
            __parseargs "$@" || return "$koi_status"
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
            __addarg value -p -r -d Value
            __addarg optional -p -D "" -d Optional
            __parseargs "$@" || return "$koi_status"
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
            __addarg value -p -r -n file -d Value
            __addarg optional -p -D "" -d Optional
            __parseargs "$@" || return "$koi_status"
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
        __addarg value -p -r -n file -d Value
        __addarg optional -p -D "" -d Optional
        capture_spec __koirun check
    '
    [ "$status" -eq 0 ]
    [ -z "$output" ]
    [ -z "$stderr" ]
}

@test "root verbose help documents positional leaves without their help subcommands" {
    run_positional '
        __addcommand leaf -f leaf -d Leaf
        leaf() {
            __addarg value -p -r -d Value
            __parseargs "$@" || return "$koi_status"
            echo BAD
        }
        __koirun --koi-enable-verbose-help help --verbose
    '
    [ "$status" -eq 0 ]
    [[ "$output" == *'Usage: tool [-h] COMMAND'*'Usage: tool leaf [-h] VALUE'*'Positionals:'* ]]
    [[ "$output" != *'tool leaf [-h] VALUE [COMMAND]'* && "$output" != *BAD* ]]
}

@test "optional routed positionals suppress help even when no values are supplied" {
    run_positional '
        __addcommand leaf -f leaf -d Leaf
        leaf() {
            local value=stale
            __addarg value -p -D default -d Value
            __parseargs "$@" || return "$koi_status"
            [[ $value == default ]]
            echo ran
        }
        __koirun leaf
    '
    [ "$status" -eq 0 ]
    [ "$output" = ran ]
    run_positional '
        __addcommand leaf -f leaf -d Leaf
        leaf() {
            __addarg value -p -d Value
            __parseargs "$@" || return "$koi_status"
            echo BAD
        }
        __koirun leaf --help
    '
    [ "$status" -eq 0 ]
    [[ "$output" == *'Usage: tool leaf [-h] [VALUE]'* ]]
    [[ "$output" != *COMMAND* && "$output" != *Commands:* && "$output" != *BAD* ]]
}

@test "layout failures and help do not poison later function registrations" {
    run_positional '
        invalid() {
            __addarg optional -p -d Optional
            __addarg required -p -r -d Required
            __parseargs "$@" || return "$koi_status"
            echo BAD
        }
        valid() {
            local value
            __addarg value -p -r -d Value
            __parseargs "$@" || return "$koi_status"
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
            __addarg value -p -r -d Value
            __addarg name -o -s n -d Name
            __addarg flag -f -s v -d Flag
            __parseargs "$@" || return "$koi_status"
            [[ $value == supplied && $name == -- && $flag == 1 ]]
        }
        parse -n -- supplied -v --koi-error-on-duplicates
        if parse supplied -v -v --koi-error-on-duplicates; then
            exit 9
        fi
    '
    [ "$status" -eq 0 ]
    [[ "$stderr" == *"duplicate argument: 'flag'"* ]]
}
