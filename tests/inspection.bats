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
    printf 'source "$KOI_LIBRARY"\nkoi::config description Application\nsource "$KOI_INSPECTION_FIXTURE"\n%s\n' "$body" > "$BATS_TEST_TMPDIR/app.sh"
    run --separate-stderr bash -eu "$BATS_TEST_TMPDIR/app.sh" "$@"
}

@test "collector preserves literal metadata and bypasses validation and assignments" {
    run_inspection '
        text=$'"'"'line one\nline two "quoted" \\ $HOME $(false)'"'"'
        leaf() {
            local untouched=original
            koi::add_description "$text"
            koi::add_arg untouched -o -s u -r -d "$text"
            koi::add_arg blank -o -l blank -D "" -n "Display name" -d Blank
            koi::add_arg absent -o -l absent -d Absent
            koi::add_command second -f child -d "$text"
            koi::add_command first -f child -d First
            koi::parse "$@" || return "$koi_status"
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
        koi::config name tool
        koi::add_arg required -o -s r -r -d Required
        koi::add_command leaf -f leaf -d Leaf
        leaf() { echo BAD; }
        check() {
            [[ ${__koi_saved_commands[*]} == leaf ]]
            [[ ${__koi_saved_meta[description]} == Application ]]
            [[ ${__koi_saved_meta[name]} == tool ]]
            [[ ${__koi_saved_meta[builtin]} == 1 ]]
            [[ ${__koi_saved_meta[runner]} == 1 ]]
            [[ $__koi_root_used == 1 && ! -v required ]]
        }
        capture_spec koi::run check
        if koi::run --help 2>/dev/null; then
            exit 9
        fi
    '
    [ "$status" -eq 0 ]
    [ -z "$output" ]
    [ -z "$stderr" ]
}

@test "former inspection flags are ordinary unsupported application arguments" {
    local args
    for args in '--koi-inspect' '--koi-inspect commands' '--koi-inspect spec extra' '--koi-inspect spec --koi-inspect spec' '--koi-inspect spec'; do
        # Fixed token lists intentionally undergo word splitting.
        # shellcheck disable=SC2086
        run_inspection '
            leaf() {
                koi::parse "$@" || return "$koi_status"
                echo BAD
            }
            leaf "$@"
        ' $args
        [ "$status" -eq 2 ]
        [ -z "$output" ]
        [[ "$stderr" == *"--koi-inspect"* ]]
        # shellcheck disable=SC2086
        run_inspection 'koi::run "$@"' $args
        [ "$status" -eq 2 ]
        [ -z "$output" ]
        [[ "$stderr" == *"--koi-inspect"* ]]
    done
}

@test "preparation helpers cannot steal an inspection collector" {
    run_inspection '
        helper() {
            koi::add_description Helper
            koi::parse "$@" || return "$koi_status"
        }
        leaf() {
            helper
            if helper --koi-inspect spec 2>/dev/null; then
                return 9
            fi
            koi::add_description Leaf
            koi::parse "$@" || return "$koi_status"
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
            if [[ ${1-} == inner ]]; then
                shift
                koi::add_description Inner
            else
                if leaf inner --koi-inspect spec 2>/dev/null; then
                    return 9
                fi
                koi::add_description Outer
            fi
            koi::parse "$@" || return "$koi_status"
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
            koi::add_arg 2>/dev/null || :
            koi::parse "$@" || return "$koi_status"
        }
        check() { echo BAD; }
        capture_spec leaf check
    '
    [ "$status" -eq 2 ]
    [ -z "$output" ]
    [ -z "$stderr" ]
    run_inspection '
        leaf() {
            koi::add_command child -f missing -d Missing
            koi::parse "$@" || return "$koi_status"
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
        koi::config name tool
        koi::add_command branch -f branch -d Branch
        koi::add_command alias -f leaf -d Alias
        branch() {
            branch_count=$((branch_count + 1))
            local required=unchanged
            koi::add_arg required -o -s r -r -d Required
            koi::add_command one -f leaf -d One
            koi::add_command two -f leaf -d Two
            koi::parse "$@" || return "$koi_status"
            echo BAD
        }
        leaf() {
            leaf_count=$((leaf_count + 1))
            koi::add_description Fallback
            local required=unchanged
            koi::add_arg required -o -s r -r -d Required
            koi::parse "$@" || return "$koi_status"
            echo BAD
        }
        koi::config verbose-help true; koi::config help-hints true; koi::run help --verbose
        [[ $branch_count == 1 && $leaf_count == 3 ]]
        [[ ${#__koi_pending_meta[@]} == 0 && ${#__koi_pending_args[@]} == 0 ]]
    '
    [ "$status" -eq 0 ]
    [[ "$output" == *'Usage: tool [-h] COMMAND'*'Usage: tool branch [-h] -r REQUIRED COMMAND'*'Usage: tool branch one [-h] -r REQUIRED'*'Usage: tool branch two [-h] -r REQUIRED'*'Usage: tool alias [-h] -r REQUIRED'* ]]
    [[ "$output" != *BAD* && "$output" != *Fallback* && "$output" != *Hints:* ]]
    [ -z "$stderr" ]
    [ "$(printf '%s\n' "$output" | rg -c '^Usage:')" -eq 5 ]
}

@test "verbose inspection isolates preparation helper paths and descriptions" {
    run_inspection '
        koi::add_command alias -f leaf -d Alias
        helper() {
            koi::add_description Helper
            koi::parse "$@" || return "$koi_status"
        }
        leaf() {
            helper --help
            koi::add_description Fallback
            koi::parse "$@" || return "$koi_status"
            echo BAD
        }
        koi::config verbose-help true; koi::run help --verbose
    '
    [ "$status" -eq 0 ]
    [[ "$output" == *Helper*'Usage: app.sh [-h]'*Alias*'Usage: app.sh alias [-h]'* ]]
    [[ "$output" != *BAD* && "$output" != *Fallback* ]]
    [ -z "$stderr" ]
}

@test "verbose traversal detects ancestry recursion without restricting normal routing" {
    run_inspection '
        koi::add_command again -f node -d Recursive
        node() {
            koi::add_command again -f node -d Recursive
            koi::parse "$@" || return "$koi_status"
        }
        koi::config verbose-help true; koi::run help --verbose
    '
    [ "$status" -eq 2 ]
    [[ "$output" == Application*'Usage: app.sh again [-h] COMMAND'* ]]
    [[ "$stderr" == *"recursive inspection at 'again again'"* ]]
    run_inspection '
        koi::add_command again -f node -d Recursive
        node() {
            koi::add_command again -f node -d Recursive
            koi::parse "$@" || return "$koi_status"
        }
        koi::run again again again --help
    '
    [ "$status" -eq 0 ]
    [[ "$output" == Recursive*'Usage: app.sh again again again [-h] COMMAND'* ]]
    [ -z "$stderr" ]
}

@test "verbose traversal diagnoses handlers that fail or omit parsing" {
    local body
    for body in 'return 0' 'return 42' 'koi::add_description Unconsumed'; do
        run_inspection "
            koi::add_command leaf -f leaf -d Leaf
            leaf() {
                $body
            }
            koi::config verbose-help true; koi::run help --verbose
        "
        [ "$status" -eq 2 ]
        [[ "$output" == Application* ]]
        [[ "$stderr" == *inspection*leaf* ]]
    done
}

@test "verbose traversal validates nested help conflicts before rendering that spec" {
    run_inspection '
        koi::add_command leaf -f leaf -d Leaf
        leaf() {
            koi::add_command help -f custom -d Custom
            koi::parse "$@" || return "$koi_status"
        }
        custom() { echo BAD; }
        koi::config verbose-help true; koi::run help --verbose
    '
    [ "$status" -eq 2 ]
    [[ "$output" == Application* ]]
    [[ "$output" != *'Usage: app.sh leaf'* && "$output" != *BAD* ]]
    [[ "$stderr" == *'conflicts with built-in help'* ]]
}

@test "root with no application children suppresses verbose help and renders flag help once" {
    run_inspection 'koi::config verbose-help true; koi::run --help'
    [ "$status" -eq 0 ]
    [ "$(printf '%s\n' "$output" | rg -c '^Usage:')" -eq 1 ]
    [ -z "$stderr" ]
}

@test "failed traversal clears abandoned registration and leaves direct parsing usable" {
    run_inspection '
        koi::add_command broken -f broken -d Broken
        broken() {
            koi::add_description Abandoned
            koi::add_arg stale -f -s s -d Stale
        }
        if koi::config verbose-help true; koi::run help --verbose >/dev/null 2>/dev/null; then
            exit 9
        fi
        [[ ${#__koi_pending_args[@]} == 0 && ${#__koi_pending_meta[@]} == 0 ]]
        [[ ! -v __koi_inspection_sink && ! -v __koi_inspection_handler ]]
        fresh() {
            koi::parse "$@" || return "$koi_status"
            echo FRESH
        }
        fresh
    '
    [ "$status" -eq 0 ]
    [ "$output" = FRESH ]
    [ -z "$stderr" ]
}

@test "inspection of a childless runner root exposes disabled effective help" {
    run_inspection '
        koi::add_arg name -o -s n -d Name
        check() {
            [[ ${__koi_saved_meta[builtin]} == 0 ]]
            [[ ${__koi_saved_meta[verbose]} == 0 ]]
            [[ ${#__koi_saved_commands[@]} == 0 ]]
        }
        capture_spec koi::run check
    '
    [ "$status" -eq 0 ]
    [ -z "$output" ]
    [ -z "$stderr" ]
}

@test "inspection enters a namespaced handler and stops at the guard" {
    run_inspection '
        app::internal::deploy() {
            koi::add_description "Namespaced details"
            koi::parse "$@" || return "$koi_status"
            echo BAD
        }
        check() {
            [[ ${__koi_saved_meta[description]} == "Namespaced details" ]]
            [[ $koi_status == 0 ]]
        }
        capture_spec app::internal::deploy check
    '
    [ "$status" -eq 0 ]
    [ -z "$output" ]
    [ -z "$stderr" ]
}
