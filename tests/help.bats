#!/usr/bin/env bats
# Snippets intentionally expand their own variables in fresh Bash processes.
# shellcheck disable=SC2016

bats_require_minimum_version 1.5.0

setup() {
    export KOI_LIBRARY="$BATS_TEST_DIRNAME/../koi"
}

# Run a script body with explicit root metadata
# Usage: run_help BODY "$@"
#   BODY  script source following library loading and root description
#   $@    arguments passed literally to the script
run_help() {
    local body=$1
    shift
    printf 'source "$KOI_LIBRARY"\nkoi::config description "Application"\n%s\n' "$body" > "$BATS_TEST_TMPDIR/app.sh"
    run --separate-stderr bash -eu "$BATS_TEST_TMPDIR/app.sh" "$@"
}

@test "root help without a description starts with usage and consumes registration" {
    run --separate-stderr bash -uc '
        source "$KOI_LIBRARY"
        koi::run --help || exit
        [[ $__koi_root_used == 1 ]]
        koi::run --help
    ' app.sh
    [ "$status" -eq 2 ]
    [[ "$output" == 'Usage: app.sh [-h]'$'\n\nOptions:'* ]]
    [[ "$stderr" == *'call only once'* ]]
}

@test "function entrypoint help without a description starts with usage" {
    run --separate-stderr bash -uc '
        source "$KOI_LIBRARY"
        main() {
            koi::parse "$@" || return "$koi_status"
        }
        main --help
    ' app.sh
    [ "$status" -eq 0 ]
    [[ "$output" == 'Usage: app.sh [-h]'$'\n\nOptions:'* ]]
    [ -z "$stderr" ]
}

@test "function parsing and root dispatch work without a description" {
    run --separate-stderr bash -euc '
        source "$KOI_LIBRARY"
        main() {
            local value
            koi::add_arg value -o -s v -d Value
            koi::parse "$@" || return "$koi_status"
            printf "%s\n" "$value"
        }
        main -v parsed
    ' app.sh
    [ "$status" -eq 0 ]
    [ "$output" = parsed ]
    [ -z "$stderr" ]

    run --separate-stderr bash -euc '
        source "$KOI_LIBRARY"
        koi::add_command leaf -f leaf -d Leaf
        leaf() {
            koi::parse "$@" || return "$koi_status"
            printf "dispatched\n"
        }
        koi::run leaf
    ' app.sh
    [ "$status" -eq 0 ]
    [ "$output" = dispatched ]
    [ -z "$stderr" ]
}

@test "configured name reaches nested help hints and diagnostics" {
    run_help '
        koi::config name tool
        koi::add_command alias -f leaf -d "Selected alias"
        leaf() {
            koi::parse "$@" || return "$koi_status"
            echo BAD
        }
        koi::config verbose-help true; koi::config help-hints true; koi::run "$@"
    ' --help
    [ "$status" -eq 0 ]
    [[ "$output" == Application*'Usage: tool [-h] COMMAND'*'tool help --verbose'*'tool COMMAND --help'* ]]
    run_help '
        koi::config name tool
        koi::add_command alias -f leaf -d "Selected alias"
        leaf() {
            koi::parse "$@" || return "$koi_status"
        }
        koi::run "$@"
    ' alias --help
    [ "$status" -eq 0 ]
    [[ "$output" == 'Selected alias'*'Usage: tool alias [-h]'* ]]
    run_help 'koi::config name tool; koi::run "$@"' nonexistent
    [ "$status" -eq 2 ]
    [ "$stderr" = "tool: unknown command 'nonexistent'" ]
}

@test "configuration rejects malformed unknown repeated and late settings" {
    local declaration
    for declaration in         'koi::config'         'koi::config name'         'koi::config name ""'         'koi::config unknown value'         'koi::config help-width 0'         'koi::config help-width -1'         'koi::config help-width abc'         'koi::config help-width 1+2'         'koi::config name one; koi::config name two'         'koi::config help-width 20; koi::config help-width 30'; do
        run_help "
            $declaration
            koi::run --help
        "
        [ "$status" -eq 2 ]
        [ -z "$output" ]
        [[ "$stderr" == *'koi::config:'* ]]
    done
    run_help 'koi::run --help >/dev/null; koi::config name late'
    [ "$status" -eq 2 ]
    [[ "$stderr" == *'root registration already consumed'* ]]
}

@test "invalid configuration poisons registration even when its error is ignored" {
    run_help '
        koi::config unknown value 2>/dev/null || :
        koi::run --help
    '
    [ "$status" -eq 2 ]
    [ -z "$output" ]
    [ -z "$stderr" ]
}

@test "script-only configuration fails in functions without invalidating root metadata" {
    run_help '
        helper() {
            koi::config name forbidden 2>/dev/null || :
            koi::parse "$@" || return "$koi_status"
            echo BAD
        }
        if helper; then
            exit 9
        fi
        koi::run --help
    '
    [ "$status" -eq 0 ]
    [[ "$output" == Application* ]]
    [[ "$output" != *BAD* ]]
    [ -z "$stderr" ]
}

@test "description configuration is nonempty and unique in each scope" {
    local declaration
    for declaration in 'koi::config description' 'koi::config description ""' 'koi::config description A B' 'koi::config description A; koi::config description B'; do
        run_help "
            helper() {
                $declaration
                koi::parse \"\$@\" || return \"\$koi_status\"
                echo BAD
            }
            helper
        "
        [ "$status" -eq 2 ]
        if [[ $declaration == 'koi::config description A; koi::config description B' ]]; then
            [ "$stderr" = 'koi: koi::config: repeated config key: description' ]
        else
            [ "$stderr" = 'koi: koi::config: KEY and nonempty VALUE required' ]
        fi
        [[ "$output" != *BAD* ]]
    done
    run_help 'koi::config description Root; koi::run --help'
    [ "$status" -eq 2 ]
    [ "$stderr" = 'koi: koi::config: repeated config key: description' ]
}

@test "direct descriptions are rebuilt and routed descriptions take precedence" {
    run_help '
        leaf() {
            koi::config description "Direct description"
            koi::parse "$@" || return "$koi_status"
            echo BAD
        }
        leaf --help
        leaf --help
        koi::add_command alias -f leaf -d "Alias description"
        koi::run alias --help
    '
    [ "$status" -eq 0 ]
    [[ "$output" == 'Direct description'*'Direct description'*'Alias description'*'Usage: app.sh alias [-h]'* ]]
    [[ "$output" != *BAD* ]]
    [ -z "$stderr" ]
}

@test "description errors are consumed and a later direct block is valid" {
    run_help '
        helper() {
            if [[ $1 == invalid ]]; then
                koi::config description "" 2>/dev/null || :
            else
                koi::config description "Fresh description"
            fi
            shift
            koi::parse "$@" || return "$koi_status"
        }
        if helper invalid; then
            exit 9
        fi
        helper valid --help
    '
    [ "$status" -eq 0 ]
    [[ "$output" == 'Fresh description'* ]]
    [ -z "$stderr" ]
}

@test "width wraps descriptions with aligned continuations and preserves blank lines" {
    run_help '
        koi::config help-width 030
        koi::add_command leaf -f leaf -d "A description that wraps neatly"
        leaf() {
            koi::parse "$@" || return "$koi_status"
        }
        koi::add_arg opt -o -l option -d "A lengthy option description that wraps"
        koi::run --help
    '
    [ "$status" -eq 0 ]
    [[ "$output" == *$'  leaf  A description that\n        wraps neatly'* ]]
    [[ "$output" == *$'  --option OPTION  A lengthy\n                   option\n                   description\n                   that wraps'* ]]
    run_help '
        koi::config help-width 5
        f() {
            koi::config description $'"'"'one\n\nextraordinarilylongword'"'"'
            koi::parse "$@" || return "$koi_status"
        }
        f --help
    '
    [ "$status" -eq 0 ]
    [[ "$output" == $'one\n\nextraordinarilylongword\n\nUsage:'* ]]
}

@test "script configuration survives re-sourcing" {
    run_help '
        koi::config name stable
        koi::config help-width 40
        source "$KOI_LIBRARY"
        koi::run --help
    '
    [ "$status" -eq 0 ]
    [[ "$output" == Application*'Usage: stable [-h]'* ]]
}

@test "branch without a selection shows help before required argument validation" {
    run_help '
        branch() {
            local required
            koi::config description Branch
            koi::add_arg required -o -s r -r -d Required
            koi::add_command leaf -f leaf -d Leaf
            koi::parse "$@" || return "$koi_status"
            echo BAD
        }
        leaf() {
            koi::parse "$@" || return "$koi_status"
            echo LEAF
        }
        branch
    '
    [ "$status" -eq 0 ]
    [[ "$output" == Branch*'Usage: app.sh [-h] -r REQUIRED COMMAND'* ]]
    [[ "$output" != *BAD* ]]
    [ -z "$stderr" ]
}

@test "leaf business logic executes without a built-in help subcommand" {
    run_help '
        leaf() {
            koi::parse "$@" || return "$koi_status"
            echo LEAF
        }
        koi::add_command leaf -f leaf -d Leaf
        koi::run leaf
    '
    [ "$status" -eq 0 ]
    [ "$output" = LEAF ]
}

@test "the same spelling belongs independently to each command context" {
    run_help '
        koi::add_arg root_env -o -s e -d Root
        koi::add_command branch -f branch -d Branch
        branch() {
            local branch_env
            koi::add_arg branch_env -o -s e -d Branch
            koi::add_command leaf -f leaf -d Leaf
            koi::parse "$@" || return "$koi_status"
            echo BAD
        }
        leaf() {
            local leaf_env
            koi::add_arg leaf_env -o -s e -d Leaf
            koi::parse "$@" || return "$koi_status"
            printf "%s/%s/%s\n" "$root_env" "$branch_env" "$leaf_env"
        }
        koi::run "$@"
    ' -e root branch -e branch leaf -e leaf
    [ "$status" -eq 0 ]
    [ "$output" = root/branch/leaf ]
}

@test "root help bypasses its required values but child help still requires ancestor values" {
    local args
    for args in help 'branch help' 'branch leaf -h' 'branch leaf --help'; do
        # Intentionally split this fixed argument list into command tokens.
        # shellcheck disable=SC2086
        run_help '
            koi::add_arg token -o -s t -r -d Token
            koi::add_command branch -f branch -d Branch
            branch() {
                koi::add_command leaf -f leaf -d Leaf
                koi::parse "$@" || return "$koi_status"
                echo BAD
            }
            leaf() {
                local required
                koi::add_arg required -o -s r -r -d Required
                koi::parse "$@" || return "$koi_status"
                echo BAD
            }
            koi::run "$@"
        ' $args
        # Parent required arguments still apply when routing to descendants.
        if [[ $args == help ]]; then
            [ "$status" -eq 0 ]
        else
            [ "$status" -eq 2 ]
            [[ "$stderr" == *'missing required argument'* ]]
        fi
    done
}

@test "nested branch help and leaf help flags render only their owning context" {
    local args
    for args in 'branch help' 'branch leaf -h' 'branch leaf --help'; do
        # shellcheck disable=SC2086
        run_help '
            koi::add_command branch -f branch -d Branch
            branch() {
                koi::add_command leaf -f leaf -d Leaf
                koi::parse "$@" || return "$koi_status"
                echo BAD
            }
            leaf() {
                local required
                koi::add_arg required -o -s r -r -d Required
                koi::parse "$@" || return "$koi_status"
                echo BAD
            }
            koi::run "$@"
        ' $args
        [ "$status" -eq 0 ]
        [[ "$output" != *Application* && "$output" != *BAD* ]]
        [ -z "$stderr" ]
    done
}

@test "direct functions do not gain built-in help" {
    run_help '
        leaf() {
            koi::parse "$@" || return "$koi_status"
        }
        leaf help
    '
    [ "$status" -eq 2 ]
    [[ "$stderr" == *'unsupported positional argument'* ]]
}

@test "custom help conflicts at consumption and works when disabled" {
    run_help '
        koi::add_command help -f custom -d Custom
        custom() { echo CUSTOM; }
        koi::run --help
    '
    [ "$status" -eq 2 ]
    [[ "$stderr" == *"command 'help' conflicts"* ]]
    run_help '
        koi::add_command help -f custom -d Custom
        custom() { echo CUSTOM; }
        koi::config help-subcommand false; koi::run help
    '
    [ "$status" -eq 0 ]
    [ "$output" = CUSTOM ]
    [ -z "$stderr" ]
}

@test "custom nested help follows the runner policy" {
    run_help '
        koi::add_command branch -f branch -d Branch
        branch() {
            koi::add_command help -f custom -d Custom
            koi::parse "$@" || return "$koi_status"
        }
        custom() { echo CUSTOM; }
        koi::config help-subcommand false; koi::run branch help
    '
    [ "$status" -eq 0 ]
    [ "$output" = CUSTOM ]
    [ -z "$stderr" ]
    run_help '
        koi::add_command branch -f branch -d Branch
        branch() {
            koi::add_command help -f custom -d Custom
            koi::parse "$@" || return "$koi_status"
        }
        custom() { echo BAD; }
        koi::run branch --help
    '
    [ "$status" -eq 2 ]
    [[ "$stderr" == *'conflicts with built-in help'* ]]
}

@test "disabling help preserves automatic flags and omits empty commands sections" {
    run_help 'koi::config help-subcommand false; koi::run --help'
    [ "$status" -eq 0 ]
    [[ "$output" == *'Usage: app.sh [-h]'* ]]
    [[ "$output" != *Commands:* && "$output" != *COMMAND* ]]
    run_help 'koi::config help-subcommand false; koi::run help'
    [ "$status" -eq 2 ]
}

@test "help switches reject duplicates and incompatible settings" {
    local switch
    for switch in help-subcommand verbose-help help-hints; do
        run_help "koi::config $switch true; koi::config $switch true; koi::run"
        [ "$status" -eq 2 ]
        [[ "$stderr" == *repeated* ]]
    done
    run_help 'koi::config verbose-help true; koi::config help-subcommand false; koi::run --help'
    [ "$status" -eq 2 ]
    [[ "$stderr" == *'verbose-help requires help-subcommand true'* ]]
}

@test "verbose help is opt-in root-only and rejects unsupported help arguments" {
    local args
    for args in 'help --verbose' 'help extra' 'help --help extra'; do
        # shellcheck disable=SC2086
        run_help 'koi::run "$@"' $args
        [ "$status" -eq 2 ]
    done
    run_help '
        koi::add_command leaf -f leaf -d Leaf
        leaf() {
            koi::parse "$@" || return "$koi_status"
        }
        koi::config verbose-help true; koi::run leaf help --verbose
    '
    [ "$status" -eq 2 ]
    [ "$stderr" = "koi: unsupported positional argument: 'help'" ]
}

@test "disabled verbose help reports the same argument error as other unknown help arguments" {
    local argument
    for argument in -v --verbose --unknown extra; do
        run_help 'koi::add_command leaf -f leaf -d Leaf; leaf() { :; }; koi::run "$@"' help "$argument"
        [ "$status" -eq 2 ]
        [ -z "$output" ]
        [ "$stderr" = "koi: unsupported positional argument: '$argument'" ]
    done
}

@test "built-in help menus and verbose precedence follow the selected context" {
    local enabled context help_flag verbose_flag menu
    local body='
        koi::config name tool
        koi::config help-hints true
        koi::config verbose-help "$1"
        shift
        koi::add_arg account -o -l account -r -d Account
        koi::add_command branch -f branch -d Branch
        branch() {
            koi::add_arg required -o -l required -r -d Required
            koi::add_command leaf -f leaf -d Leaf
            koi::parse "$@" || return "$koi_status"
            echo BAD
        }
        leaf() {
            echo TRAVERSED
            koi::parse "$@" || return "$koi_status"
            echo BAD
        }
        account=unchanged
        koi::run "$@" || exit
        [[ $account == unchanged || $account == valid ]]
    '
    for enabled in false true; do
        for context in root branch; do
            local -a route=()
            if [[ $context == branch ]]; then
                route=(--account valid branch)
            fi
            run_help "$body" "$enabled" "${route[@]}" help -h
            [ "$status" -eq 0 ]
            [ -z "$stderr" ]
            menu=$output
            [[ "$menu" == 'Show help for the containing command.'* ]]
            [[ "$menu" == *'-h, --help'*'Show this help command menu'* ]]
            [[ "$menu" != *Account* && "$menu" != *Required* && "$menu" != *Commands:* && "$menu" != *Hints:* && "$menu" != *BAD* && "$menu" != *TRAVERSED* ]]
            if [[ $context == branch ]]; then
                [[ "$menu" == *'Usage: tool branch help [-h]'* ]]
                [[ "$menu" != *--verbose* ]]
            elif [[ $enabled == true ]]; then
                [[ "$menu" == *'Usage: tool help [-h] [-v]'*'-v, --verbose'* ]]
            else
                [[ "$menu" == *'Usage: tool help [-h]'* ]]
                [[ "$menu" != *--verbose* ]]
            fi
            for help_flag in -h --help; do
                run_help "$body" "$enabled" "${route[@]}" help "$help_flag"
                [ "$status" -eq 0 ]
                [ "$output" = "$menu" ]
                for verbose_flag in -v --verbose; do
                    run_help "$body" "$enabled" "${route[@]}" help "$verbose_flag" "$help_flag"
                    [ "$status" -eq 0 ]
                    [ -z "$stderr" ]
                    [ "$output" = "$menu" ]
                    run_help "$body" "$enabled" "${route[@]}" help "$help_flag" "$verbose_flag"
                    [ "$status" -eq 0 ]
                    [ -z "$stderr" ]
                    [ "$output" = "$menu" ]
                done
            done
            if [[ $context == branch ]]; then
                for verbose_flag in -v --verbose; do
                    run_help "$body" "$enabled" "${route[@]}" help "$verbose_flag"
                    [ "$status" -eq 2 ]
                    [ -z "$output" ]
                done
                run_help "$body" "$enabled" branch help -v -h
                [ "$status" -eq 2 ]
                [[ "$stderr" == *"missing required argument: 'account'" ]]
            fi
        done
    done
}

@test "help rejects repeated flags combined short spellings and unrelated arguments" {
    local args
    for args in '-h --help' '-v --verbose' '-vh' '-h extra' '-v -h extra' '-h --unknown'; do
        # Intentionally split this fixed argument list into command tokens.
        # shellcheck disable=SC2086
        run_help '
            koi::config verbose-help true
            koi::add_command leaf -f leaf -d Leaf
            leaf() {
                koi::parse "$@" || return "$koi_status"
            }
            koi::run "$@"
        ' help $args
        [ "$status" -eq 2 ]
        [ -z "$output" ]
    done
}

@test "hints reflect enabled features and only appear at the runner root" {
    run_help 'koi::config help-hints true; koi::run --help'
    [ "$status" -eq 0 ]
    [[ "$output" != *Hints:* ]]
    run_help 'koi::config help-hints true; koi::config verbose-help true; koi::run --help'
    [ "$status" -eq 0 ]
    [[ "$output" != *Hints:* ]]
    [[ "$output" != *'app.sh COMMAND --help'* ]]
    run_help '
        koi::add_command leaf -f leaf -d Leaf
        leaf() {
            koi::parse "$@" || return "$koi_status"
        }
        koi::config help-hints true; koi::run --help
    '
    [ "$status" -eq 0 ]
    [[ "$output" == *Hints:*'app.sh COMMAND --help'* ]]
    [[ "$output" != *'app.sh help --verbose'* ]]
    run_help '
        koi::add_command leaf -f leaf -d Leaf
        leaf() {
            koi::parse "$@" || return "$koi_status"
        }
        koi::config help-hints true; koi::config verbose-help true; koi::run leaf --help
    '
    [ "$status" -eq 0 ]
    [[ "$output" != *Hints:* ]]
}

@test "direct helper dispatch inside a routed handler does not inherit built-in help" {
    run_help '
        koi::add_command outer -f outer -d Outer
        outer() {
            koi::parse "$@" || return "$koi_status"
            helper leaf --help
        }
        helper() {
            koi::add_command leaf -f leaf -d Leaf
            koi::parse "$@" || return "$koi_status"
        }
        leaf() {
            koi::add_command help -f custom -d Custom
            koi::parse "$@" || return "$koi_status"
        }
        custom() { :; }
        koi::run outer
    '
    [ "$status" -eq 0 ]
    [[ "$output" == Leaf*Custom* ]]
    [ -z "$stderr" ]
}

@test "routed leaves omit help commands regardless of their argument kinds" {
    local declarations
    for declarations in '' 'koi::add_arg verbose -f -s v -d Verbose' \
        'koi::add_arg name -o -s n -D world -d Name' \
        'koi::add_arg value -p -r -d Value' 'koi::add_arg value -p -d Value'; do
        run_help '
            koi::add_command leaf -f leaf -d Leaf
            leaf() {
                '"$declarations"'
                koi::parse "$@" || return "$koi_status"
                echo BAD
            }
            koi::run leaf --help
        '
        [ "$status" -eq 0 ]
        [[ "$output" == Leaf*'Usage: app.sh leaf [-h]'* ]]
        [[ "$output" != *COMMAND* && "$output" != *Commands:* && "$output" != *BAD* ]]
        [ -z "$stderr" ]
    done
}

@test "argument-free and option-only leaves reject bare help without business logic" {
    local declarations
    for declarations in '' 'koi::add_arg name -o -s n -D world -d Name'; do
        run_help '
            koi::add_command leaf -f leaf -d Leaf
            leaf() {
                '"$declarations"'
                koi::parse "$@" || return "$koi_status"
                echo BAD
            }
            koi::run leaf help
        '
        [ "$status" -eq 2 ]
        [ -z "$output" ]
        [ "$stderr" = "koi: unsupported positional argument: 'help'" ]
    done
}

@test "childless runner roots suppress help commands and verbose hints" {
    local declarations
    for declarations in '' 'koi::add_arg name -o -s n -D world -d Name'; do
        run_help "$declarations"'
            koi::config verbose-help true; koi::config help-hints true; koi::run --help
        '
        [ "$status" -eq 0 ]
        [[ "$output" == Application*'Usage: app.sh [-h]'* ]]
        [[ "$output" != *COMMAND* && "$output" != *Commands:* && "$output" != *Hints:* ]]
        [ -z "$stderr" ]
        run_help "$declarations"'
            koi::config verbose-help true; koi::run help --verbose
        '
        [ "$status" -eq 2 ]
        [ -z "$output" ]
        [ "$stderr" = "koi: unknown command 'help'" ]
    done
}
