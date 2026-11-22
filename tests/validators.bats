#!/usr/bin/env bats
# Test snippets run in isolated Bash processes.
# shellcheck disable=SC2016
bats_require_minimum_version 1.5.0

setup() {
    export KOI_LIBRARY="$BATS_TEST_DIRNAME/../koi"
    export KOI_INSPECTION_FIXTURE="$BATS_TEST_DIRNAME/fixtures/inspection.sh"
}

# Run a validator scenario with explicit shell assertions
# Usage: scenario SOURCE
#   SOURCE  isolated Bash declarations, calls, and assertions
scenario() {
    run --separate-stderr bash -euc 'source "$KOI_LIBRARY"; eval "$1"' yarf "$1"
}

@test "validator aliases namespaced callbacks and late definitions" {
    scenario '
        main() {
            local value
            koi::add_arg value -o -s v -d Value
            koi::add_validator value -m Accepted -f ns::valid
            koi::add_validator value --function ns::valid --message Accepted
            ns::valid() { [[ $# == 1 && $1 == yes ]]; }
            koi::parse "$@" || return "$koi_status"
            [[ $value == yes ]]
        }
        main -v yes
        main -v yes
    '
    [ "$status" -eq 0 ]
    [ -z "$output$stderr" ]
}

@test "invalid validator declarations invalidate and consume only their block" {
    for declaration in '' 'value' 'missing --integer' 'flag --integer' 'value --integer --file' 'value --integer --integer' 'value -f ok --function ok' 'value -f' 'value -f "ok arg"' 'value -f /bin/true' 'value --wat' 'value --integer extra' 'value --integer -m reason' 'value -f ok -m ""' 'value -f ok -m' 'value -f ok -m a --message b'; do
        run --separate-stderr bash -euc '
            source "$KOI_LIBRARY"
            ok() { return 0; }
            main() {
                koi::add_arg value -o -s v -d Value
                koi::add_arg flag -f -s f -d Flag
                eval "koi::add_validator $1" && return 9
                [[ $? == 2 ]] || return 8
                koi::parse -v yes || return "$koi_status"
                return 7
            }
            if main "$1"; then exit 6; else [[ $? == 2 ]]; fi
            fresh() { koi::parse "$@" || return "$koi_status"; }
            fresh
        ' yarf "$declaration"
        [ "$status" -eq 0 ]
        [[ "$stderr" == *"koi: koi::add_validator:"* ]]
    done
}

@test "integer and nonempty builtin contracts are lexical" {
    scenario '
        for value in 0 +0 -0 0001 +00003 -999999999999999999999999999999999999999999999999999999; do
            koi::internal::validator::integer "$value"
        done
        for value in "" + - " 1" "1 " 1.0 1e3 0xff 2#10 $"1\n"; do
            if koi::internal::validator::integer "$value"; then exit 9; fi
        done
        koi::internal::validator::nonempty "   "
        koi::internal::validator::nonempty $'"'"'\n'"'"'
        if koi::internal::validator::nonempty ""; then exit 8; fi
    '
    [ "$status" -eq 0 ]
}

@test "file directory and symlink contracts" {
    run --separate-stderr bash -euc '
        source "$KOI_LIBRARY"
        folder=$1
        touch "$folder/file"
        mkdir "$folder/dir"
        ln -s "$folder/file" "$folder/file-link"
        ln -s "$folder/dir" "$folder/dir-link"
        ln -s "$folder/missing" "$folder/broken"
        for value in file file-link; do
            koi::internal::validator::file "$folder/$value"
            if koi::internal::validator::directory "$folder/$value"; then exit 9; fi
        done
        for value in dir dir-link; do
            koi::internal::validator::directory "$folder/$value"
            if koi::internal::validator::file "$folder/$value"; then exit 8; fi
        done
        for value in missing broken; do
            if koi::internal::validator::file "$folder/$value" || koi::internal::validator::directory "$folder/$value"; then exit 7; fi
        done
    ' yarf "$BATS_TEST_TMPDIR"
    [ "$status" -eq 0 ]
}

@test "literal callback arguments and repeated array elements retain order" {
    scenario '
        local_values=("" "two words" $'"'"'line\nnext'"'"' "\"quote" "back\\slash" "*?[a]" "%s" "\$(touch never); echo no")
        log=()
        predicate() { [[ $# == 1 ]]; log+=("$1"); }
        main() {
            local -a values
            koi::add_arg values -p -a -d Values
            koi::add_validator values -f predicate
            koi::add_validator values -f predicate
            koi::parse "$@" || return "$koi_status"
            [[ ${#values[@]} == ${#local_values[@]} ]]
        }
        main "${local_values[@]}"
        [[ ${#log[@]} == $((${#local_values[@]} * 2)) ]]
        for ((i=0; i<${#local_values[@]}; i++)); do
            [[ ${log[i*2]} == "${local_values[i]}" && ${log[i*2+1]} == "${local_values[i]}" ]]
        done
    '
    [ "$status" -eq 0 ]
}

@test "argument element and validator order short circuits before any assignment" {
    scenario '
        log=()
        first() { log+=("first:$1"); }
        second() { log+=("second:$1"); [[ $1 != bad ]]; }
        third() { log+=(third); }
        scalar=stale
        declare -a items=([3]=old)
        unset absent
        main() {
            koi::add_arg scalar -o -s s -d Scalar
            koi::add_arg absent -o -l absent -d Absent
            koi::add_arg items -o -a -s i -d Items
            koi::add_validator items -f first
            koi::add_validator scalar -f first
            koi::add_validator items -f second
            koi::add_validator items -f third
            koi::parse "$@" || return "$koi_status"
            return 9
        }
        if main -i good -s final -i bad -i later; then exit 8; else [[ $? == 2 ]]; fi
        [[ ${log[*]} == "first:final first:good second:good third first:bad second:bad" ]]
        [[ $scalar == stale && ${items[3]} == old && ${#items[@]} == 1 && ! ${absent+set} ]]
    '
    [ "$status" -eq 0 ]
    [[ "$stderr" == *"invalid argument 'items': validation failed"* ]]
    [[ "$stderr" != *bad* ]]
}

@test "omission defaults requiredness and scalar final value" {
    scenario '
        log=()
        record() { log+=("$1"); [[ $1 != bad ]]; }
        main() {
            local omitted defaulted scalar
            local -a items
            koi::add_arg omitted -o -l omitted -d Omitted
            koi::add_arg defaulted -o -l defaulted -D default -d Defaulted
            koi::add_arg scalar -o -s s -r -d Scalar
            koi::add_arg items -o -s i -a -d Items
            for dest in omitted defaulted scalar items; do
                koi::add_validator "$dest" -f record
            done
            koi::parse "$@" || return "$koi_status"
        }
        main -s bad -s final
        [[ ${log[*]} == "default final" && ${#log[@]} == 2 ]]
        log=()
        main --defaulted supplied --omitted "" -s "" -i ""
        [[ ${#log[@]} == 4 && ${log[0]} == "" && ${log[1]} == supplied && ${log[2]} == "" && ${log[3]} == "" ]]
        log=()
        if main; then exit 8; else [[ $? == 2 ]]; fi
        [[ ${#log[@]} == 0 ]]
    '
    [ "$status" -eq 0 ]
}

@test "rejected defaults and operational callbacks use author diagnostics" {
    for callback_status in 1 2 127; do
        run --separate-stderr bash -euc '
            source "$KOI_LIBRARY"
            koi::config name yarf
            result=$1
            predicate() { return "$result"; }
            main() {
                local count=old
                koi::add_arg count -o -s c -D secret -d Count
                koi::add_validator count -f predicate -m reason
                koi::parse "$@" || return "$koi_status"
            }
            main
        ' yarf "$callback_status"
        [ "$status" -eq 2 ]
        if [ "$callback_status" -eq 1 ]; then
            [[ "${stderr%%$'\n'*}" == "koi: koi::parse: invalid default for argument 'count': reason" ]]
        else
            [[ "${stderr%%$'\n'*}" == *"koi: koi::parse: argument 'count': callback 'predicate' failed with status $callback_status" ]]
        fi
        [[ "$stderr" != *secret* ]]
    done
}

@test "user rejection respects branding and default reason" {
    scenario '
        koi::config name yarf
        main() {
            koi::add_arg count -p -d Count
            koi::add_validator count --integer
            koi::parse "$@" || return "$koi_status"
        }
        main secret
    '
    [ "$status" -eq 2 ]
    [ "$stderr" = "yarf: invalid argument 'count': must be an integer" ]
}

@test "help inspection parse errors and destination errors never run callbacks" {
    scenario '
        source "$KOI_INSPECTION_FIXTURE"
        predicate() { exit 99; }
        main() {
            koi::add_arg count -o -s c -D bad -d Count
            koi::add_validator count -f predicate -m "literal % \\ message"
            koi::parse "$@" || return "$koi_status"
        }
        check() {
            [[ ${__koi_saved_validator_dests[0]} == count && ${__koi_saved_validator_selectors[0]} == custom && ${__koi_saved_validator_functions[0]} == predicate && ${__koi_saved_validator_messages[0]} == "literal % \\ message" ]]
            [[ ${#__koi_pending_validator_dests[@]} == 0 ]]
        }
        main --help >/dev/null
        capture_spec main check
        if main --unknown; then exit 9; else [[ $? == 2 ]]; fi
        declare -i count=3
        if main -c 1; then exit 8; else [[ $? == 2 ]]; fi
    '
    [ "$status" -eq 0 ]
}

@test "missing callbacks prevent help and inspection" {
    for request in --help '--koi-inspect spec'; do
        run --separate-stderr bash -euc '
            source "$KOI_LIBRARY"
            main() {
                koi::add_arg count -p -d Count
                koi::add_validator count -f ns::missing
                koi::parse "$@" || return "$koi_status"
            }
            main "$@"
        ' yarf $request
        [ "$status" -eq 2 ]
        [[ "${stderr%%$'\n'*}" == *"koi::add_validator: argument 'count': callback 'ns::missing' is not a Bash function" ]]
    done
}

@test "root validators run before dispatch and never leak to leaves" {
    scenario '
        log=()
        root_check() { log+=(root); [[ $1 == ok ]]; }
        leaf_check() { log+=(leaf); return 0; }
        leaf() {
            local value
            koi::add_arg value -p -d Value
            koi::add_validator value -f leaf_check
            koi::parse "$@" || return "$koi_status"
            [[ ${log[*]} == "root leaf" ]]
        }
        koi::add_arg value -o -s v -d Value
        koi::add_validator value -f root_check
        koi::add_command route -f leaf -d Leaf
        source "$KOI_LIBRARY"
        koi::run -v ok route child
        [[ ${#__koi_root_validator_dests[@]} == 0 && ${#__koi_pending_validator_dests[@]} == 0 ]]
    '
    [ "$status" -eq 0 ]
}

@test "cross-context validator rejected and late root failure prevents dispatch" {
    scenario '
        koi::add_arg root_value -o -s v -d Root
        main() {
            koi::add_validator root_value --integer || :
            koi::parse "$@" || return "$koi_status"
        }
        if main; then exit 9; else [[ $? == 2 ]]; fi
        child() { exit 99; }
        koi::add_validator root_value --integer
        koi::add_command child -f child -d Child
        koi::run -v secret child
    '
    [ "$status" -eq 2 ]
    [[ "$stderr" == *"invalid argument 'root_value': must be an integer"* ]]
}

@test "nested recursive and consumed blocks retain invocation isolation" {
    scenario '
        hits=0
        predicate() { hits=$((hits+1)); [[ $1 == ok ]]; }
        recurse() {
            local value depth=$1
            shift
            koi::add_arg value -p -r -d Value
            koi::add_validator value -f predicate
            koi::parse "$@" || return "$koi_status"
            if (( depth )); then recurse "$((depth-1))" ok; fi
        }
        outer() {
            recurse 2 ok
            local value
            koi::add_arg value -p -d Value
            koi::parse "$@" || return "$koi_status"
            [[ $value == unchecked ]]
        }
        outer unchecked
        outer unchecked
        [[ $hits == 6 ]]
    '
    [ "$status" -eq 0 ]
}

@test "all builtin selectors reject supplied values and defaults through parser" {
    for selector in nonempty integer file directory; do
        run --separate-stderr bash -euc '
            source "$KOI_LIBRARY"
            selector=$1
            main() {
                local value=previous
                koi::add_arg value -o -s v -D "" -d Value
                koi::add_validator value "--$selector"
                koi::parse "$@" || return "$koi_status"
            }
            if main -v ""; then exit 9; else [[ $? == 2 ]]; fi
            [[ ! ${value+set} ]]
            main
        ' yarf "$selector"
        [ "$status" -eq 2 ]
        [[ "$stderr" == *"invalid argument 'value': must"* ]]
        [[ "$stderr" == *"koi::parse: invalid default for argument 'value': must"* ]]
    done
}

@test "required arrays preserve duplicates and skip predicates on absent input" {
    scenario '
        hits=0
        predicate() { hits=$((hits+1)); [[ $1 == yes ]]; }
        main() {
            local -a values=(old)
            koi::add_arg values -p -a -r -d Values
            koi::add_validator values -f predicate
            koi::parse "$@" || return "$koi_status"
            [[ ${values[*]} == "yes yes" ]]
        }
        if main; then exit 9; else [[ $? == 2 ]]; fi
        [[ $hits == 0 ]]
        main yes yes
        [[ $hits == 2 ]]
        if main ""; then exit 8; else [[ $? == 2 ]]; fi
        [[ $hits == 3 ]]
    '
    [ "$status" -eq 0 ]
}

@test "custom supplied rejection message and operational status never disclose values" {
    for callback_status in 1 2 127; do
        run --separate-stderr bash -euc '
            source "$KOI_LIBRARY"
            koi::config name yarf
            callback_status=$1
            predicate() { return "$callback_status"; }
            main() {
                koi::add_arg value -p -d Value
                koi::add_validator value --function predicate --message "allowed choices only"
                koi::parse "$@" || return "$koi_status"
            }
            main private-value
        ' yarf "$callback_status"
        [ "$status" -eq 2 ]
        if [ "$callback_status" -eq 1 ]; then
            [ "$stderr" = "yarf: invalid argument 'value': allowed choices only" ]
        else
            [[ "${stderr%%$'\n'*}" == *"koi::parse: argument 'value': callback 'predicate' failed with status $callback_status" ]]
        fi
        [[ "$stderr" != *private-value* ]]
    done
}

@test "root scalar array and unset destinations survive a late failure" {
    scenario '
        scalar=previous
        declare -a items=(old)
        unset new_dest
        koi::add_arg scalar -o -s s -d Scalar
        koi::add_arg items -o -a -s i -d Items
        koi::add_arg new_dest -o -l new -d New
        koi::add_validator new_dest --integer
        child() { return 99; }
        koi::add_command child -f child -d Child
        if koi::run -s changed -i changed --new bad child; then exit 9; else [[ $? == 2 ]]; fi
        [[ $scalar == previous && ${items[*]} == old && ! ${new_dest+set} ]]
        [[ ${#__koi_root_validator_dests[@]} == 0 ]]
    '
    [ "$status" -eq 0 ]
}

@test "recursive help traversal copies validator metadata without executing predicates" {
    scenario '
        predicate() { exit 99; }
        leaf() {
            koi::add_arg value -p -D bad -d Value
            koi::add_validator value -f predicate
            koi::parse "$@" || return "$koi_status"
        }
        branch() {
            koi::add_command leaf -f leaf -d Leaf
            koi::parse "$@" || return "$koi_status"
        }
        koi::add_command branch -f branch -d Branch
        koi::config verbose-help true; koi::run help --verbose >/dev/null
    '
    [ "$status" -eq 0 ]
}
