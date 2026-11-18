#!/usr/bin/env bats
# Test snippets run in isolated Bash processes.
# shellcheck disable=SC2016
bats_require_minimum_version 1.5.0

setup() {
    export KOI_LIBRARY="$BATS_TEST_DIRNAME/../koi"
    export KOI_INSPECTION_FIXTURE="$BATS_TEST_DIRNAME/fixtures/inspection.sh"
}

# Run a cardinality scenario in a strict shell
# Usage: scenario SOURCE
#   SOURCE  Bash declarations, calls, and assertions
scenario() {
    run --separate-stderr bash -euc 'source "$KOI_LIBRARY"; eval "$1"' app "$1"
}

@test "cardinality aliases and default scalar metadata survive inspection" {
    scenario '
        source "$KOI_INSPECTION_FIXTURE"
        handler() {
            koi::add_arg implicit -o -l implicit -d Implicit
            koi::add_arg short -o -S -l short -d Short
            koi::add_arg long -o --scalar -l long -d Long
            koi::add_arg one -o -a -l one -d One
            koi::add_arg two -p --array -d Two
            koi::parse "$@" || return "$koi_status"
        }
        check() {
            [[ ${__koi_saved_arg_cardinalities[implicit]} == scalar ]]
            [[ ${__koi_saved_arg_cardinalities[short]} == scalar ]]
            [[ ${__koi_saved_arg_cardinalities[long]} == scalar ]]
            [[ ${__koi_saved_arg_cardinalities[one]} == array ]]
            [[ ${__koi_saved_arg_cardinalities[two]} == array ]]
            [[ ${#__koi_pending_arg_cardinalities[@]} == 0 ]]
        }
        capture_spec handler check
    '
    [ "$status" -eq 0 ]
}

@test "invalid cardinality declarations invalidate their registration block" {
    local modifiers
    for modifiers in '-a --array' '-S --scalar' '-a -S' '--scalar --array' '-a -D ""' '-a --default stale'; do
        scenario "main() {
            local -a files=(stale)
            koi::add_arg files -o -l files -d Files $modifiers || :
            koi::parse --help || return \"\$koi_status\"
        }; main"
        [ "$status" -eq 2 ]
    done
    for modifiers in '-a' '--array' '-S' '--scalar'; do
        scenario "main() { koi::add_arg flag -f -l flag -d Flag $modifiers; }; main"
        [ "$status" -eq 2 ]
    done
}

@test "array options accumulate literal elements across aliases and replace sparse arrays" {
    scenario '
        main() {
            local -a files=([9]=stale)
            local literal=$'"'"'line\nquotes" \\ * $(false)'"'"'
            koi::add_arg files -o -a -s I -l include -d Files -r
            koi::config error-on-scalar-duplicates true; koi::parse -I "" --include "$literal" -I same -I same || return "$koi_status"
            [[ ${#files[@]} == 4 && ${files[0]} == "" && ${files[1]} == "$literal" ]]
            [[ ${files[2]} == same && ${files[3]} == same && ! ${files[9]+yes} ]]
        }; main; main
    '
    [ "$status" -eq 0 ]
}

@test "empty arrays differ from one empty string and requiredness ignores stale contents" {
    scenario '
        main() {
            local -a files=(stale)
            koi::add_arg files -p -a -d Files
            koi::parse || return "$koi_status"
            [[ ${#files[@]} == 0 ]]
            koi::add_arg files -p -a -r -d Files
            koi::parse "" || return "$koi_status"
            [[ ${#files[@]} == 1 && ${files[0]} == "" ]]
            koi::add_arg files -p -a -r -d Files
            if koi::parse; then return 8; fi
            [[ $koi_status == 2 && ${#files[@]} == 1 ]]
        }; main
    '
    [ "$status" -eq 0 ]
}

@test "positional arrays keep option recognition and consume only the first separator" {
    scenario '
        main() {
            local first second verbose value
            local -a files includes
            koi::add_arg first -p -r -d First
            koi::add_arg second -p -r -d Second
            koi::add_arg files -p -a -d Files
            koi::add_arg includes -o -a -s I -d Includes
            koi::add_arg verbose -f -s v -d Verbose
            koi::parse a b c -I -- -v d -- -- e || return "$koi_status"
            [[ $first == a && $second == b && $verbose == 1 ]]
            [[ ${includes[0]} == -- && ${#files[@]} == 4 ]]
            [[ ${files[*]} == "c d -- e" ]]
        }; main
    '
    [ "$status" -eq 0 ]
}

@test "invalid positional array layouts fail even for help and inspection" {
    local declarations mode
    for declarations in 'koi::add_arg extra -p -a -d Extra' 'koi::add_arg extra -p -r -d Extra' 'koi::add_arg extra -p -d Extra'; do
        for mode in '--help' '--koi-inspect spec'; do
            scenario "main() { koi::add_arg files -p -a -d Files; $declarations; koi::parse $mode || return \"\$koi_status\"; }; main"
            [ "$status" -eq 2 ]
        done
    done
    scenario 'main() { koi::add_arg first -p -d First; koi::add_arg files -p -a -d Files; koi::parse --help || return "$koi_status"; }; main'
    [ "$status" -eq 2 ]
}

@test "destination preflight preserves every destination on failure and help" {
    local declaration
    for declaration in 'local files' 'local files=old' 'local -A files=()' 'local -ar files=(old)' 'local -ai files=()' 'local -al files=()' 'local -au files=()' 'local -n files=other'; do
        scenario "main() {
            local scalar=old other=old
            $declaration
            koi::add_arg scalar -o -s s -d Scalar
            koi::add_arg files -o -a -s I -d Files
            if koi::parse -s new -I new; then return 8; fi
            [[ \$koi_status == 2 && \$scalar == old && \$other == old ]]
        }; main"
        [ "$status" -eq 0 ]
    done
    scenario 'main() { local -a files=(old); koi::add_arg files -o -a -s I -r -d Files; koi::parse -I --help || return "$koi_status"; return 8; }; main'
    [ "$status" -eq 0 ]
}

@test "arrays update inherited locals and create absent globals in the current shell" {
    scenario '
        parse() { koi::add_arg files -o -a -s I -d Files; koi::parse "$@" || return "$koi_status"; }
        outer() { local -ax files=(old); parse -I new; [[ ${files[0]} == new ]]; parse; [[ ${#files[@]} == 0 ]]; }
        outer
        parse -I global
        [[ $(declare -p files) == "declare -a files="* && ${files[0]} == global ]]
        source "$KOI_LIBRARY"
        parse -I again
        [[ ${files[0]} == again ]]
    '
    [ "$status" -eq 0 ]
}

@test "array options route through root branch and leaf while positional arrays work at root" {
    scenario '
        leaf() { local -a files; koi::add_arg files -p -a -r -d Files; koi::parse "$@" || return "$koi_status"; [[ ${files[*]} == "a b" && ${root[0]} == root && ${branch[0]} == branch ]]; }
        branch() { local -a branch; koi::add_arg branch -o -a -s I -d Branch; koi::add_command leaf -f leaf -d Leaf; koi::parse "$@" || return "$koi_status"; }
        koi::add_arg root -o -a -s I -d Root
        koi::add_command branch -f branch -d Branch
        koi::run -I root branch -I branch leaf a b
    '
    [ "$status" -eq 0 ]
    scenario 'koi::add_arg files -p -a -d Files; koi::run a -- b; [[ ${files[*]} == "a b" ]]'
    [ "$status" -eq 0 ]
    scenario 'child() { :; }; koi::add_arg files -p -a -d Files; koi::add_command child -f child -d Child; koi::run --help'
    [ "$status" -eq 2 ]
}

@test "renamed scalar duplicate checking exempts arrays and rejects the former setting" {
    scenario 'main() { local -a files; koi::add_arg files -o -a -s I -d Files; koi::config error-on-scalar-duplicates true; koi::parse -I a -I a || return "$koi_status"; [[ ${#files[@]} == 2 ]]; }; main'
    [ "$status" -eq 0 ]
    scenario 'main() { koi::parse --koi-error-on-duplicates || return "$koi_status"; }; main'
    [ "$status" -eq 2 ]
    scenario 'main() { local -a files=(old); koi::add_arg files -o -a -s I -d Files; koi::parse -I || return "$koi_status"; }; main'
    [ "$status" -eq 2 ]
}

@test "recursive array parsers keep invocation data isolated" {
    scenario '
        parse() {
            local -a files
            koi::add_arg files -p -a -d Files
            koi::parse "$@" || return "$koi_status"
            if [[ ${files[0]-} == outer ]]; then
                parse inner
                [[ ${files[0]} == outer ]]
            fi
        }; parse outer
    '
    [ "$status" -eq 0 ]
}

@test "array destinations remain untouched after help input spec and later destination errors" {
    scenario '
        parse() {
            koi::add_arg files -o -a -s I -r -d Files
            koi::add_arg later -o -s l -d Later
            koi::parse "$@" || return "$koi_status"
        }
        local_scope() {
            local -a files=([5]=stale)
            local -i later=7
            parse --help
            [[ ${files[5]} == stale && ${#files[@]} == 1 && $later == 7 ]]
            if parse -I fresh -l value; then return 8; fi
            [[ ${files[5]} == stale && ${#files[@]} == 1 && $later == 7 ]]
            if parse -I; then return 8; fi
            [[ ${files[5]} == stale && ${#files[@]} == 1 ]]
            koi::add_arg files -p -a -d Files
            koi::add_arg extra -p -d Extra
            if koi::parse --help; then return 8; fi
            [[ $koi_status == 2 && ${files[5]} == stale ]]
        }; local_scope
    '
    [ "$status" -eq 0 ]
}

@test "positional arrays preserve literal boundaries after a leading separator" {
    scenario '
        main() {
            local -a files
            local literal=$'"'"'new\nline \\ "quotes" * $(false)'"'"'
            koi::add_arg files -p -a -r -d Files
            koi::parse -- "" "$literal" --help -- || return "$koi_status"
            [[ ${#files[@]} == 4 && ${files[0]} == "" && ${files[1]} == "$literal" ]]
            [[ ${files[2]} == --help && ${files[3]} == -- ]]
        }; main
    '
    [ "$status" -eq 0 ]
}

@test "cardinality declaration modifiers do not reserve application spellings" {
    scenario '
        main() {
            local scalar array
            koi::add_arg scalar -f -s S -l scalar -d Scalar
            koi::add_arg array -f -s a -l array -d Array
            koi::parse -S --array || return "$koi_status"
            [[ $scalar == 1 && $array == 1 ]]
        }; main
    '
    [ "$status" -eq 0 ]
}
