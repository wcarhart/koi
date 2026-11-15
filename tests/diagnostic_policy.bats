#!/usr/bin/env bats
# Child shells evaluate snippets and preserve their literal arguments.
# shellcheck disable=SC2016
bats_require_minimum_version 1.5.0

setup() {
    export KOI_LIBRARY="$BATS_TEST_DIRNAME/../koi"
}

# Run an isolated application with separate output streams
# Usage: scenario BODY "$@"
#   BODY  Bash statements after sourcing koi
#   $@    literal arguments available to BODY
scenario() {
    local body=$1
    shift
    run --separate-stderr bash -euc 'source "$KOI_LIBRARY"; eval "$1"' app.sh "$body" "$@"
}

@test "user branding covers root routed and direct parsers with literal names and values" {
    local mode configured name value
    name=$'koi::parse: %s "name"\n$(false)'
    value=$'koi::run: %s "value"\n$(false)'
    for mode in root routed direct; do
        for configured in no yes; do
            scenario '
                shift
                mode=$1 configured=$2 name=$3 value=$4
                if [[ $configured == yes ]]; then
                    koi::config name "$name"
                fi
                leaf() { koi::parse "$@" || return "$koi_status"; }
                case $mode in
                    root)
                        koi::run "$value"
                        ;;
                    routed)
                        koi::add_command leaf -f leaf -d Leaf
                        koi::run leaf "$value"
                        ;;
                    direct)
                        leaf "$value"
                        ;;
                esac
            ' "$mode" "$configured" "$name" "$value"
            [ "$status" -eq 2 ]
            [ -z "$output" ]
            if [[ $configured == no ]]; then
                [[ "$stderr" == koi:* ]]
            else
                [[ "$stderr" == "$name: "* ]]
            fi
            [[ "$stderr" == *"'$value'" ]]
        done
    done
}

@test "author diagnostics retain public context despite branding" {
    local body expected
    while IFS='|' read -r expected body; do
        scenario 'koi::config name yarf; '"$body"
        [ "$status" -eq 2 ]
        [ -z "$output" ]
        [[ "$stderr" == "koi: $expected: "* ]]
    done <<'CASES'
koi::add_arg|koi::add_arg value -p -a -D bad -d Value
koi::config|koi::config name again
koi::run|koi::add_arg optional -p -d Optional; koi::add_arg required -p -r -d Required; koi::run --help
koi::parse|leaf() { koi::add_arg optional -p -d Optional; koi::add_arg required -p -r -d Required; koi::parse --help || return "$koi_status"; }; leaf
koi::run|koi::run --help >/dev/null; koi::run
koi::add_arg|koi::run --help >/dev/null; koi::add_arg late -p -d Late
koi::run|declare -a value=(); koi::add_arg value -p -d Value; koi::run x
koi::parse|leaf() { local -a value=(); koi::add_arg value -p -d Value; koi::parse x || return "$koi_status"; }; leaf
koi::run|koi::add_command child -f missing -d Child; koi::run --help
koi::parse|leaf() { koi::add_command child -f missing -d Child; koi::parse --help || return "$koi_status"; }; leaf
koi::run|koi::run --koi-inspect invalid
koi::parse|leaf() { koi::parse --koi-inspect spec || return "$koi_status"; }; leaf
koi::run|koi::run --koi-ignore-unknown-positionals --koi-ignore-unknown-positionals
koi::parse|leaf() { koi::parse --koi-ignore-unknown-positionals --koi-ignore-unknown-positionals || return "$koi_status"; }; leaf
koi::parse|leaf() { koi::parse --koi-error-on-scalar-duplicates --koi-error-on-scalar-duplicates || return "$koi_status"; }; leaf
CASES
}

@test "configured user errors include input duplication clusters and help arguments" {
    local body
    while IFS= read -r body; do
        scenario 'koi::config name yarf; '"$body"
        [ "$status" -eq 2 ]
        [ -z "$output" ]
        [[ "$stderr" == 'yarf: '* ]]
    done <<'CASES'
koi::add_arg value -p -r -d Value; koi::run
koi::add_arg value -o -s n -d Value; koi::run -n
koi::add_arg flag -f -s v -d Flag; koi::run --koi-error-on-scalar-duplicates -v -v
koi::add_arg value -p -d Value; koi::run --unknown
koi::add_arg value -p -d Value; koi::run -xyz
koi::add_arg value -p -d Value; koi::run one extra
child() { :; }; koi::add_command child -f child -d Child; koi::run help one two
koi::run --koi-zero-argument-message 'koi::parse: literal %s'
CASES
    [ "$stderr" = 'yarf: koi::parse: literal %s' ]
}

@test "custom no-command text and error helpers preserve literal content and spec validity" {
    scenario '
        shift
        koi::config name "$1"
        koi::run --koi-zero-argument-message "$2"
    ' $'name %s\n"koi"' $'koi::parse: %s\n"$(false)"'
    [ "$status" -eq 2 ]
    [ "$stderr" = $'name %s\n"koi": koi::parse: %s\n"$(false)"' ]
    scenario '
        for validity in 0 1; do
            __koi_pending_spec_valid=$validity
            koi::internal::author_error koi::config "literal %s" || result=$?
            [[ $result == 2 && $__koi_pending_spec_valid == "$validity" ]]
        done
    '
    [ "$status" -eq 0 ]
    [ "$stderr" = $'koi: koi::config: literal %s\nkoi: koi::config: literal %s' ]
}

@test "ignore is optional in root and function scalar parsing and preserves later options" {
    local parser args
    for parser in root direct; do
        for args in strict ignore; do
            scenario '
                shift
                parser=$1 policy=$2
                parse() {
                    local value flag
                    koi::add_arg value -p -r -d Value
                    koi::add_arg flag -f -s v -d Flag
                    koi::parse "$@" || return "$koi_status"
                    [[ $value == source.txt && $flag == 1 ]]
                }
                settings=()
                if [[ $policy == ignore ]]; then
                    settings=(--koi-ignore-unknown-positionals)
                fi
                if [[ $parser == root ]]; then
                    koi::add_arg value -p -r -d Value
                    koi::add_arg flag -f -s v -d Flag
                    koi::run "${settings[@]}" source.txt extra.txt -v
                    [[ $value == source.txt && $flag == 1 ]]
                else
                    parse "${settings[@]}" source.txt extra.txt -v
                fi
            ' "$parser" "$args"
            if [[ $args == strict ]]; then
                [ "$status" -eq 2 ]
                [ "$stderr" = "koi: unsupported positional argument: 'extra.txt'" ]
            else
                [ "$status" -eq 0 ]
                [ -z "$stderr" ]
            fi
        done
    done
}

@test "ignore accepts empty function layouts and post-separator dash data" {
    scenario '
        leaf() {
            koi::parse --koi-ignore-unknown-positionals "$@" || return "$koi_status"
        }
        leaf one - -- -unknown -- --koi-ignore-unknown-positionals --help
    '
    [ "$status" -eq 0 ]
    [ -z "$output$stderr" ]
}

@test "ignore keeps arrays requiredness and option-value boundaries" {
    scenario '
        leaf() {
            local -a values=()
            local name
            koi::add_arg values -p -a -r -d Values
            koi::add_arg name -o -s n -d Name
            koi::parse --koi-ignore-unknown-positionals "$@" || return "$koi_status"
            [[ ${values[*]} == "one two three" && $name == --koi-ignore-unknown-positionals ]]
        }
        leaf one two -n --koi-ignore-unknown-positionals three
        leaf
    '
    [ "$status" -eq 2 ]
    [ "$stderr" = "koi: missing required argument: 'values'" ]
}

@test "ignore does not suppress unknown options clusters missing values or scalar duplicates" {
    local args
    for args in '--unknown' '-xyz' '-n' '-v -v --koi-error-on-scalar-duplicates'; do
        scenario '
            leaf() {
                local value flag
                koi::add_arg value -o -s n -d Value
                koi::add_arg flag -f -s v -d Flag
                koi::parse --koi-ignore-unknown-positionals "$@" || return "$koi_status"
            }
            leaf surplus '"$args"
        [ "$status" -eq 2 ]
        [[ "$stderr" == 'koi: '* ]]
    done
}

@test "help overrides deferred author errors and discarded tokens without assigning" {
    scenario '
        leaf() {
            local value=original
            koi::add_arg value -p -r -d Value
            if koi::parse --koi-ignore-unknown-positionals one two --koi-ignore-unknown-positionals --help; then
                return 9
            fi
            [[ $koi_status == 0 && $value == original ]]
        }
        leaf
    '
    [ "$status" -eq 0 ]
    [[ "$output" == *Usage:* ]]
    [ -z "$stderr" ]
}

@test "ignore does not change root or branch command candidates" {
    local body
    for body in 'koi::run --koi-ignore-unknown-positionals unknown' \
        'child() { :; }; leaf() { koi::add_command child -f child -d Child; koi::parse --koi-ignore-unknown-positionals unknown || return "$koi_status"; }; leaf'; do
        scenario "$body"
        [ "$status" -eq 2 ]
        [ "$stderr" = "koi: unknown command 'unknown'" ]
    done
}

@test "ignore stays local across dispatch repeated and nested calls" {
    scenario '
        child() { koi::parse "$@" || return "$koi_status"; }
        parent() {
            koi::add_command child -f child -d Child
            koi::parse --koi-ignore-unknown-positionals "$@" || return "$koi_status"
        }
        if parent child excess; then
            exit 9
        fi
        [[ $koi_status == 2 ]]
        leaf() {
            koi::parse "$@" || return "$koi_status"
            if [[ $1 == --koi-ignore-unknown-positionals ]]; then
                child nested
            fi
        }
        if leaf --koi-ignore-unknown-positionals discarded; then
            exit 9
        fi
        if leaf later; then
            exit 9
        fi
        koi::add_command child -f child -d Child
        if koi::run --koi-ignore-unknown-positionals --koi-enable-help-hints child root-child; then
            exit 9
        fi
    '
    [ "$status" -eq 0 ]
    [ "$stderr" = $'koi: unsupported positional argument: \'excess\'\nkoi: unsupported positional argument: \'nested\'\nkoi: unsupported positional argument: \'later\'\nkoi: unsupported positional argument: \'root-child\'' ]
}

@test "runner settings interoperate and reserve ignore spelling" {
    scenario '
        koi::add_arg value -p -r -d Value
        koi::run --koi-error-on-scalar-duplicates --koi-enable-help-hints --koi-ignore-unknown-positionals --koi-disable-help-subcommand one two
        [[ $value == one ]]
    '
    [ "$status" -eq 0 ]
    scenario 'koi::add_arg flag -f -l koi-ignore-unknown-positionals -d Flag'
    [ "$status" -eq 2 ]
    [ "$stderr" = "koi: koi::add_arg: invalid or reserved long spelling: 'koi-ignore-unknown-positionals'" ]
}

@test "later ignore settings discard earlier surplus data and retain first-error category" {
    scenario '
        leaf() { koi::parse "$@" || return "$koi_status"; }
        leaf one two --koi-ignore-unknown-positionals
        leaf surplus --koi-ignore-unknown-positionals --unknown
    '
    [ "$status" -eq 2 ]
    [ "$stderr" = "koi: unsupported positional argument: '--unknown'" ]
    scenario '
        leaf() { koi::parse "$@" || return "$koi_status"; }
        leaf surplus --koi-ignore-unknown-positionals --koi-ignore-unknown-positionals
    '
    [ "$status" -eq 2 ]
    [ "$stderr" = 'koi: koi::parse: repeated --koi-ignore-unknown-positionals setting' ]
    scenario '
        leaf() { koi::parse "$@" || return "$koi_status"; }
        leaf surplus --koi-error-on-scalar-duplicates --koi-error-on-scalar-duplicates
    '
    [ "$status" -eq 2 ]
    [ "$stderr" = "koi: unsupported positional argument: 'surplus'" ]
}
