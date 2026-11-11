#!/usr/bin/env bats
# Snippets intentionally evaluate variables in the inspected Bash process.
# shellcheck disable=SC2016

bats_require_minimum_version 1.5.0

setup() {
    export KOI_LIBRARY="$BATS_TEST_DIRNAME/../koi"
    export KOI_INSPECTION_FIXTURE="$BATS_TEST_DIRNAME/fixtures/inspection.sh"
}

# Run a script with a test-only caller-owned collector
# Usage: run_inspection BODY "$@"
#   BODY  script source following library, root description, and collector setup
#   $@    literal script arguments
run_inspection() {
    local body=$1
    shift
    printf 'source "$KOI_LIBRARY"\n__koiconfig description Application\nsource "$KOI_INSPECTION_FIXTURE"\n%s\n' "$body" > "$BATS_TEST_TMPDIR/app.sh"
    run --separate-stderr bash -eu "$BATS_TEST_TMPDIR/app.sh" "$@"
}

@test "collector preserves literal metadata and bypasses validation and assignments" {
    run_inspection '
        text=$'"'"'line one\nline two "quoted" \\ $HOME $(false)'"'"'
        leaf() {
            local untouched=original
            __adddescription "$text"
            __addarg untouched -o -s u -r -d "$text"
            __addarg blank -o -l blank -D "" -n "Display name" -d Blank
            __addarg absent -o -l absent -d Absent
            __addcommand second -f child -d "$text"
            __addcommand first -f child -d First
            __parseargs "$@" || return "$koi_status"
            echo BAD
        }
        child() { :; }
        check() {
            [[ ${__koi_saved_meta[description]} == "$text" ]]
            [[ ${__koi_saved_arg_descriptions[untouched]} == "$text" ]]
            [[ ${__koi_saved_descriptions[second]} == "$text" ]]
            [[ ${__koi_saved_commands[*]} == "second first" ]]
            [[ ${__koi_saved_args[*]} == "untouched blank absent" ]]
            [[ ${__koi_saved_arg_defaults[blank]+present} == present ]]
            [[ ${__koi_saved_arg_defaults[blank]} == "" ]]
            [[ ! ${__koi_saved_arg_defaults[absent]+present} ]]
            [[ ${__koi_saved_arg_display_names[blank]} == "Display name" ]]
            [[ ${__koi_saved_meta[name]} == app.sh && ${__koi_saved_meta[help-width]} == 100 ]]
            [[ ! -v blank && ! -v absent && ! -v untouched ]]
            [[ $koi_status == 0 && $__koi_pending_spec_valid == 1 ]]
            [[ ${#__koi_pending_meta[@]} == 0 && ${#__koi_pending_commands[@]} == 0 ]]
        }
        capture_spec leaf check
    '
    [ "$status" -eq 0 ]
    [ -z "$output" ]
    [ -z "$stderr" ]
}

@test "root inspection collects configured metadata without dispatch or rendering" {
    run_inspection '
        __koiconfig name tool
        __addarg required -o -s r -r -d Required
        __addcommand leaf -f leaf -d Leaf
        leaf() { echo BAD; }
        check() {
            [[ ${__koi_saved_commands[*]} == leaf ]]
            [[ ${__koi_saved_meta[description]} == Application ]]
            [[ ${__koi_saved_meta[name]} == tool ]]
            [[ ${__koi_saved_meta[builtin]} == 1 ]]
            [[ ${__koi_saved_meta[runner]} == 1 ]]
            [[ $__koi_root_used == 1 && ! -v required ]]
        }
        capture_spec __koirun check
        if __koirun --help 2>/dev/null; then
            exit 9
        fi
    '
    [ "$status" -eq 0 ]
    [ -z "$output" ]
    [ -z "$stderr" ]
}

@test "inspection rejects standalone malformed repeated and trailing requests" {
    local args
    for args in '--koi-inspect' '--koi-inspect commands' '--koi-inspect spec extra' '--koi-inspect spec --koi-inspect spec' '--koi-inspect spec --help' '--koi-inspect spec'; do
        # Fixed token lists intentionally undergo word splitting.
        # shellcheck disable=SC2086
        run_inspection '
            leaf() {
                __parseargs "$@" || return "$koi_status"
                echo BAD
            }
            leaf "$@"
        ' $args
        [ "$status" -eq 2 ]
        [ -z "$output" ]
        [[ "$stderr" == *inspection* ]]
        # shellcheck disable=SC2086
        run_inspection '__koirun "$@"' $args
        [ "$status" -eq 2 ]
        [ -z "$output" ]
        [[ "$stderr" == *inspection* ]]
    done
}

@test "preparation helpers cannot steal an inspection collector" {
    run_inspection '
        helper() {
            __adddescription Helper
            __parseargs "$@" || return "$koi_status"
        }
        leaf() {
            helper
            if helper --koi-inspect spec 2>/dev/null; then
                return 9
            fi
            __adddescription Leaf
            __parseargs "$@" || return "$koi_status"
            echo BAD
        }
        check() {
            [[ ${__koi_saved_meta[description]} == Leaf ]]
        }
        capture_spec leaf check
    '
    [ "$status" -eq 0 ]
    [ -z "$output" ]
    [ -z "$stderr" ]
}

@test "recursive direct calls cannot consume the expected invocation collector" {
    run_inspection '
        leaf() {
            if [[ $1 == inner ]]; then
                shift
                __adddescription Inner
            else
                if leaf inner --koi-inspect spec 2>/dev/null; then
                    return 9
                fi
                __adddescription Outer
            fi
            __parseargs "$@" || return "$koi_status"
        }
        check() {
            [[ ${__koi_saved_meta[description]} == Outer ]]
        }
        capture_spec leaf check
    '
    [ "$status" -eq 0 ]
    [ -z "$output" ]
    [ -z "$stderr" ]
}

@test "invalid declarations and missing handlers fail before collection" {
    run_inspection '
        leaf() {
            __addarg 2>/dev/null || :
            __parseargs "$@" || return "$koi_status"
        }
        check() { echo BAD; }
        capture_spec leaf check
    '
    [ "$status" -eq 2 ]
    [ -z "$output" ]
    [ -z "$stderr" ]
    run_inspection '
        leaf() {
            __addcommand child -f missing -d Missing
            __parseargs "$@" || return "$koi_status"
        }
        check() { echo BAD; }
        capture_spec leaf check
    '
    [ "$status" -eq 2 ]
    [ -z "$output" ]
    [[ "$stderr" == *"missing handler 'missing'"* ]]
}

@test "verbose help walks preorder preserves aliases and invokes each entry once" {
    run_inspection '
        branch_count=0
        leaf_count=0
        __koiconfig name tool
        __addcommand branch -f branch -d Branch
        __addcommand alias -f leaf -d Alias
        branch() {
            branch_count=$((branch_count + 1))
            local required=unchanged
            __addarg required -o -s r -r -d Required
            __addcommand one -f leaf -d One
            __addcommand two -f leaf -d Two
            __parseargs "$@" || return "$koi_status"
            echo BAD
        }
        leaf() {
            leaf_count=$((leaf_count + 1))
            __adddescription Fallback
            local required=unchanged
            __addarg required -o -s r -r -d Required
            __parseargs "$@" || return "$koi_status"
            echo BAD
        }
        __koirun --koi-enable-verbose-help --koi-enable-help-hints help --verbose
        [[ $branch_count == 1 && $leaf_count == 3 ]]
        [[ ${#__koi_pending_meta[@]} == 0 && ${#__koi_pending_args[@]} == 0 ]]
    '
    [ "$status" -eq 0 ]
    [[ "$output" == *'Usage: tool [-h] COMMAND'*'Usage: tool branch [-h] -r REQUIRED COMMAND'*'Usage: tool branch one [-h] -r REQUIRED [COMMAND]'*'Usage: tool branch two [-h] -r REQUIRED [COMMAND]'*'Usage: tool alias [-h] -r REQUIRED [COMMAND]'* ]]
    [[ "$output" != *BAD* && "$output" != *Fallback* && "$output" != *Hints:* ]]
    [ -z "$stderr" ]
    [ "$(printf '%s\n' "$output" | rg -c '^Usage:')" -eq 5 ]
}

@test "verbose inspection isolates preparation helper paths and descriptions" {
    run_inspection '
        __addcommand alias -f leaf -d Alias
        helper() {
            __adddescription Helper
            __parseargs "$@" || return "$koi_status"
        }
        leaf() {
            helper --help
            __adddescription Fallback
            __parseargs "$@" || return "$koi_status"
            echo BAD
        }
        __koirun --koi-enable-verbose-help help --verbose
    '
    [ "$status" -eq 0 ]
    [[ "$output" == *Helper*'Usage: app.sh [-h]'*Alias*'Usage: app.sh alias [-h] [COMMAND]'* ]]
    [[ "$output" != *BAD* && "$output" != *Fallback* ]]
    [ -z "$stderr" ]
}

@test "verbose traversal detects ancestry recursion without restricting normal routing" {
    run_inspection '
        __addcommand again -f node -d Recursive
        node() {
            __addcommand again -f node -d Recursive
            __parseargs "$@" || return "$koi_status"
        }
        __koirun --koi-enable-verbose-help help --verbose
    '
    [ "$status" -eq 2 ]
    [[ "$output" == Application*'Usage: app.sh again [-h] COMMAND'* ]]
    [[ "$stderr" == *"recursive inspection at 'again again'"* ]]
    run_inspection '
        __addcommand again -f node -d Recursive
        node() {
            __addcommand again -f node -d Recursive
            __parseargs "$@" || return "$koi_status"
        }
        __koirun again again again --help
    '
    [ "$status" -eq 0 ]
    [[ "$output" == Recursive*'Usage: app.sh again again again [-h] COMMAND'* ]]
    [ -z "$stderr" ]
}

@test "verbose traversal diagnoses handlers that fail or omit parsing" {
    local body
    for body in 'return 0' 'return 42' '__adddescription Unconsumed'; do
        run_inspection "
            __addcommand leaf -f leaf -d Leaf
            leaf() {
                $body
            }
            __koirun --koi-enable-verbose-help help --verbose
        "
        [ "$status" -eq 2 ]
        [[ "$output" == Application* ]]
        [[ "$stderr" == *inspection*leaf* ]]
    done
}

@test "verbose traversal validates nested help conflicts before rendering that spec" {
    run_inspection '
        __addcommand leaf -f leaf -d Leaf
        leaf() {
            __addcommand help -f custom -d Custom
            __parseargs "$@" || return "$koi_status"
        }
        custom() { echo BAD; }
        __koirun --koi-enable-verbose-help help --verbose
    '
    [ "$status" -eq 2 ]
    [[ "$output" == Application* ]]
    [[ "$output" != *'Usage: app.sh leaf'* && "$output" != *BAD* ]]
    [[ "$stderr" == *'conflicts with built-in help'* ]]
}

@test "verbose root with no application children renders once without recursion" {
    run_inspection '__koirun --koi-enable-verbose-help help --verbose'
    [ "$status" -eq 0 ]
    [ "$(printf '%s\n' "$output" | rg -c '^Usage:')" -eq 1 ]
    [ -z "$stderr" ]
}

@test "failed traversal clears abandoned registration and leaves direct parsing usable" {
    run_inspection '
        __addcommand broken -f broken -d Broken
        broken() {
            __adddescription Abandoned
            __addarg stale -f -s s -d Stale
        }
        if __koirun --koi-enable-verbose-help help --verbose >/dev/null 2>/dev/null; then
            exit 9
        fi
        [[ ${#__koi_pending_args[@]} == 0 && ${#__koi_pending_meta[@]} == 0 ]]
        [[ ! -v __koi_inspection_sink && ! -v __koi_inspection_handler ]]
        fresh() {
            __parseargs "$@" || return "$koi_status"
            echo FRESH
        }
        fresh
    '
    [ "$status" -eq 0 ]
    [ "$output" = FRESH ]
    [ -z "$stderr" ]
}
