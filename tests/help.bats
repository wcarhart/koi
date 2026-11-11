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
    printf 'source "$KOI_LIBRARY"\n__koiconfig description "Application"\n%s\n' "$body" > "$BATS_TEST_TMPDIR/app.sh"
    run --separate-stderr bash -eu "$BATS_TEST_TMPDIR/app.sh" "$@"
}

@test "root help without a description starts with usage and consumes registration" {
    run --separate-stderr bash -uc '
        source "$KOI_LIBRARY"
        __koirun --help || exit
        [[ $__koi_root_used == 1 ]]
        __koirun --help
    ' app.sh
    [ "$status" -eq 2 ]
    [[ "$output" == 'Usage: app.sh [-h]'$'\n\nOptions:'* ]]
    [[ "$stderr" == *'call only once'* ]]
}

@test "script-scope help without a description starts with usage" {
    run --separate-stderr bash -uc '
        source "$KOI_LIBRARY"
        __parseargs --help
        exit "$koi_status"
    ' app.sh
    [ "$status" -eq 0 ]
    [[ "$output" == 'Usage: app.sh [-h]'$'\n\nOptions:'* ]]
    [ -z "$stderr" ]
}

@test "root parsing and dispatch work without a description" {
    run --separate-stderr bash -euc '
        source "$KOI_LIBRARY"
        __addarg value -o -s v -d Value
        __parseargs -v parsed || exit "$koi_status"
        printf "%s\n" "$value"
    ' app.sh
    [ "$status" -eq 0 ]
    [ "$output" = parsed ]
    [ -z "$stderr" ]

    run --separate-stderr bash -euc '
        source "$KOI_LIBRARY"
        __addcommand leaf -f leaf -d Leaf
        leaf() {
            __parseargs "$@" || return "$koi_status"
            printf "dispatched\n"
        }
        __koirun leaf
    ' app.sh
    [ "$status" -eq 0 ]
    [ "$output" = dispatched ]
    [ -z "$stderr" ]
}

@test "configured name reaches nested help hints and diagnostics" {
    run_help '
        __koiconfig name tool
        __addcommand alias -f leaf -d "Selected alias"
        leaf() {
            __parseargs "$@" || return "$koi_status"
            echo BAD
        }
        __koirun --koi-enable-verbose-help --koi-enable-help-hints "$@"
    ' --help
    [ "$status" -eq 0 ]
    [[ "$output" == Application*'Usage: tool [-h] COMMAND'*'tool help --verbose'*'tool COMMAND --help'* ]]
    run_help '
        __koiconfig name tool
        __addcommand alias -f leaf -d "Selected alias"
        leaf() {
            __parseargs "$@" || return "$koi_status"
        }
        __koirun "$@"
    ' alias --help
    [ "$status" -eq 0 ]
    [[ "$output" == 'Selected alias'*'Usage: tool alias [-h]'* ]]
    run_help '__koiconfig name tool; __koirun "$@"' nonexistent
    [ "$status" -eq 2 ]
    [ "$stderr" = "tool: unknown command 'nonexistent'" ]
}

@test "configuration rejects malformed unknown repeated and late settings" {
    local declaration
    for declaration in         '__koiconfig'         '__koiconfig name'         '__koiconfig name ""'         '__koiconfig unknown value'         '__koiconfig help-width 0'         '__koiconfig help-width -1'         '__koiconfig help-width abc'         '__koiconfig help-width 1+2'         '__koiconfig name one; __koiconfig name two'         '__koiconfig help-width 20; __koiconfig help-width 30'; do
        run_help "
            $declaration
            __koirun --help
        "
        [ "$status" -eq 2 ]
        [ -z "$output" ]
        [[ "$stderr" == *'__koiconfig:'* ]]
    done
    run_help '__koirun --help >/dev/null; __koiconfig name late'
    [ "$status" -eq 2 ]
    [[ "$stderr" == *'root registration already consumed'* ]]
}

@test "invalid configuration poisons registration even when its error is ignored" {
    run_help '
        __koiconfig unknown value 2>/dev/null || :
        __koirun --help
    '
    [ "$status" -eq 2 ]
    [ -z "$output" ]
    [ -z "$stderr" ]
}

@test "function configuration fails without invalidating root metadata" {
    run_help '
        helper() {
            __koiconfig name forbidden 2>/dev/null || :
            __parseargs "$@" || return "$koi_status"
            echo BAD
        }
        if helper; then
            exit 9
        fi
        __koirun --help
    '
    [ "$status" -eq 0 ]
    [[ "$output" == Application* ]]
    [[ "$output" != *BAD* ]]
    [ -z "$stderr" ]
}

@test "description registration is function-only nonempty and unique" {
    local declaration
    for declaration in '__adddescription' '__adddescription ""' '__adddescription A B' '__adddescription A; __adddescription B'; do
        run_help "
            helper() {
                $declaration
                __parseargs \"\$@\" || return \"\$koi_status\"
                echo BAD
            }
            helper
        "
        [ "$status" -eq 2 ]
        if [[ $declaration == '__adddescription A; __adddescription B' ]]; then
            [ "$stderr" = 'koi: __adddescription: repeated description' ]
        else
            [ "$stderr" = 'koi: __adddescription: expected exactly one nonempty description' ]
        fi
        [[ "$output" != *BAD* ]]
    done
    run_help '__adddescription Root'
    [ "$status" -eq 2 ]
    [ "$stderr" = 'koi: __adddescription: call inside a function; use __koiconfig description TEXT for the script description' ]
}

@test "direct descriptions are rebuilt and routed descriptions take precedence" {
    run_help '
        leaf() {
            __adddescription "Direct description"
            __parseargs "$@" || return "$koi_status"
            echo BAD
        }
        leaf --help
        leaf --help
        __addcommand alias -f leaf -d "Alias description"
        __koirun alias --help
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
                __adddescription "" 2>/dev/null || :
            else
                __adddescription "Fresh description"
            fi
            shift
            __parseargs "$@" || return "$koi_status"
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
        __koiconfig help-width 030
        __addcommand leaf -f leaf -d "A description that wraps neatly"
        leaf() {
            __parseargs "$@" || return "$koi_status"
        }
        __addarg opt -o -l option -d "A lengthy option description that wraps"
        __koirun --help
    '
    [ "$status" -eq 0 ]
    [[ "$output" == *$'  leaf  A description that\n        wraps neatly'* ]]
    [[ "$output" == *$'  --option OPTION  A lengthy\n                   option\n                   description\n                   that wraps'* ]]
    run_help '
        __koiconfig help-width 5
        f() {
            __adddescription $'"'"'one\n\nextraordinarilylongword'"'"'
            __parseargs "$@" || return "$koi_status"
        }
        f --help
    '
    [ "$status" -eq 0 ]
    [[ "$output" == $'one\n\nextraordinarilylongword\n\nUsage:'* ]]
}

@test "script configuration survives re-sourcing" {
    run_help '
        __koiconfig name stable
        __koiconfig help-width 40
        source "$KOI_LIBRARY"
        __koirun --help
    '
    [ "$status" -eq 0 ]
    [[ "$output" == Application*'Usage: stable [-h]'* ]]
}

@test "branch without a selection shows help before required argument validation" {
    run_help '
        branch() {
            local required
            __adddescription Branch
            __addarg required -o -s r -r -d Required
            __addcommand leaf -f leaf -d Leaf
            __parseargs "$@" || return "$koi_status"
            echo BAD
        }
        leaf() {
            __parseargs "$@" || return "$koi_status"
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
            __parseargs "$@" || return "$koi_status"
            echo LEAF
        }
        __addcommand leaf -f leaf -d Leaf
        __koirun leaf
    '
    [ "$status" -eq 0 ]
    [ "$output" = LEAF ]
}

@test "the same spelling belongs independently to each command context" {
    run_help '
        __addarg root_env -o -s e -d Root
        __addcommand branch -f branch -d Branch
        branch() {
            local branch_env
            __addarg branch_env -o -s e -d Branch
            __addcommand leaf -f leaf -d Leaf
            __parseargs "$@" || return "$koi_status"
            echo BAD
        }
        leaf() {
            local leaf_env
            __addarg leaf_env -o -s e -d Leaf
            __parseargs "$@" || return "$koi_status"
            printf "%s/%s/%s\n" "$root_env" "$branch_env" "$leaf_env"
        }
        __koirun "$@"
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
            __addarg token -o -s t -r -d Token
            __addcommand branch -f branch -d Branch
            branch() {
                __addcommand leaf -f leaf -d Leaf
                __parseargs "$@" || return "$koi_status"
                echo BAD
            }
            leaf() {
                local required
                __addarg required -o -s r -r -d Required
                __parseargs "$@" || return "$koi_status"
                echo BAD
            }
            __koirun "$@"
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
            __addcommand branch -f branch -d Branch
            branch() {
                __addcommand leaf -f leaf -d Leaf
                __parseargs "$@" || return "$koi_status"
                echo BAD
            }
            leaf() {
                local required
                __addarg required -o -s r -r -d Required
                __parseargs "$@" || return "$koi_status"
                echo BAD
            }
            __koirun "$@"
        ' $args
        [ "$status" -eq 0 ]
        [[ "$output" != *Application* && "$output" != *BAD* ]]
        [ -z "$stderr" ]
    done
}

@test "direct functions do not gain built-in help" {
    run_help '
        leaf() {
            __parseargs "$@" || return "$koi_status"
        }
        leaf help
    '
    [ "$status" -eq 2 ]
    [[ "$stderr" == *'unsupported positional argument'* ]]
}

@test "custom help conflicts at consumption and works when disabled" {
    run_help '
        __addcommand help -f custom -d Custom
        custom() { echo CUSTOM; }
        __koirun --help
    '
    [ "$status" -eq 2 ]
    [[ "$stderr" == *"command 'help' conflicts"* ]]
    run_help '
        __addcommand help -f custom -d Custom
        custom() { echo CUSTOM; }
        __koirun --koi-disable-help-subcommand help
    '
    [ "$status" -eq 0 ]
    [ "$output" = CUSTOM ]
    [ -z "$stderr" ]
}

@test "custom nested help follows the runner policy" {
    run_help '
        __addcommand branch -f branch -d Branch
        branch() {
            __addcommand help -f custom -d Custom
            __parseargs "$@" || return "$koi_status"
        }
        custom() { echo CUSTOM; }
        __koirun --koi-disable-help-subcommand branch help
    '
    [ "$status" -eq 0 ]
    [ "$output" = CUSTOM ]
    [ -z "$stderr" ]
    run_help '
        __addcommand branch -f branch -d Branch
        branch() {
            __addcommand help -f custom -d Custom
            __parseargs "$@" || return "$koi_status"
        }
        custom() { echo BAD; }
        __koirun branch --help
    '
    [ "$status" -eq 2 ]
    [[ "$stderr" == *'conflicts with built-in help'* ]]
}

@test "disabling help preserves automatic flags and omits empty commands sections" {
    run_help '__koirun --koi-disable-help-subcommand --help'
    [ "$status" -eq 0 ]
    [[ "$output" == *'Usage: app.sh [-h]'* ]]
    [[ "$output" != *Commands:* && "$output" != *COMMAND* ]]
    run_help '__koirun --koi-disable-help-subcommand help'
    [ "$status" -eq 2 ]
}

@test "help switches reject duplicates and incompatible settings" {
    local switch
    for switch in --koi-disable-help-subcommand --koi-enable-verbose-help --koi-enable-help-hints; do
        run_help '__koirun "$@"' "$switch" "$switch"
        [ "$status" -eq 2 ]
        [[ "$stderr" == *repeated* ]]
    done
    run_help '__koirun --koi-enable-verbose-help --koi-disable-help-subcommand --help'
    [ "$status" -eq 2 ]
    [[ "$stderr" == *'requires the built-in help subcommand'* ]]
}

@test "verbose help is opt-in root-only and rejects unsupported help arguments" {
    local args
    for args in 'help --verbose' 'help extra' 'help --help extra'; do
        # shellcheck disable=SC2086
        run_help '__koirun "$@"' $args
        [ "$status" -eq 2 ]
    done
    run_help '
        __addcommand leaf -f leaf -d Leaf
        leaf() {
            __parseargs "$@" || return "$koi_status"
        }
        __koirun --koi-enable-verbose-help leaf help --verbose
    '
    [ "$status" -eq 2 ]
    [ "$stderr" = "koi: __parseargs: unsupported positional argument: 'help'" ]
}

@test "disabled verbose help reports the same argument error as other unknown help arguments" {
    local argument
    for argument in --verbose --unknown extra; do
        run_help '__addcommand leaf -f leaf -d Leaf; leaf() { :; }; __koirun "$@"' help "$argument"
        [ "$status" -eq 2 ]
        [ -z "$output" ]
        [ "$stderr" = "koi: __parseargs: unsupported positional argument: '$argument'" ]
    done
}

@test "hints reflect enabled features and only appear at the runner root" {
    run_help '__koirun --koi-enable-help-hints --help'
    [ "$status" -eq 0 ]
    [[ "$output" != *Hints:* ]]
    run_help '__koirun --koi-enable-help-hints --koi-enable-verbose-help --help'
    [ "$status" -eq 0 ]
    [[ "$output" != *Hints:* ]]
    [[ "$output" != *'app.sh COMMAND --help'* ]]
    run_help '
        __addcommand leaf -f leaf -d Leaf
        leaf() {
            __parseargs "$@" || return "$koi_status"
        }
        __koirun --koi-enable-help-hints --help
    '
    [ "$status" -eq 0 ]
    [[ "$output" == *Hints:*'app.sh COMMAND --help'* ]]
    [[ "$output" != *'app.sh help --verbose'* ]]
    run_help '
        __addcommand leaf -f leaf -d Leaf
        leaf() {
            __parseargs "$@" || return "$koi_status"
        }
        __koirun --koi-enable-help-hints --koi-enable-verbose-help leaf --help
    '
    [ "$status" -eq 0 ]
    [[ "$output" != *Hints:* ]]
}

@test "direct helper dispatch inside a routed handler does not inherit built-in help" {
    run_help '
        __addcommand outer -f outer -d Outer
        outer() {
            __parseargs "$@" || return "$koi_status"
            helper leaf --help
        }
        helper() {
            __addcommand leaf -f leaf -d Leaf
            __parseargs "$@" || return "$koi_status"
        }
        leaf() {
            __addcommand help -f custom -d Custom
            __parseargs "$@" || return "$koi_status"
        }
        custom() { :; }
        __koirun outer
    '
    [ "$status" -eq 0 ]
    [[ "$output" == Leaf*Custom* ]]
    [ -z "$stderr" ]
}

@test "routed leaves omit help commands regardless of their argument kinds" {
    local declarations
    for declarations in '' '__addarg verbose -f -s v -d Verbose' \
        '__addarg name -o -s n -D world -d Name' \
        '__addarg value -p -r -d Value' '__addarg value -p -d Value'; do
        run_help '
            __addcommand leaf -f leaf -d Leaf
            leaf() {
                '"$declarations"'
                __parseargs "$@" || return "$koi_status"
                echo BAD
            }
            __koirun leaf --help
        '
        [ "$status" -eq 0 ]
        [[ "$output" == Leaf*'Usage: app.sh leaf [-h]'* ]]
        [[ "$output" != *COMMAND* && "$output" != *Commands:* && "$output" != *BAD* ]]
        [ -z "$stderr" ]
    done
}

@test "argument-free and option-only leaves reject bare help without business logic" {
    local declarations
    for declarations in '' '__addarg name -o -s n -D world -d Name'; do
        run_help '
            __addcommand leaf -f leaf -d Leaf
            leaf() {
                '"$declarations"'
                __parseargs "$@" || return "$koi_status"
                echo BAD
            }
            __koirun leaf help
        '
        [ "$status" -eq 2 ]
        [ -z "$output" ]
        [ "$stderr" = "koi: __parseargs: unsupported positional argument: 'help'" ]
    done
}

@test "childless runner roots suppress help commands and verbose hints" {
    local declarations
    for declarations in '' '__addarg name -o -s n -D world -d Name'; do
        run_help "$declarations"'
            __koirun --koi-enable-verbose-help --koi-enable-help-hints --help
        '
        [ "$status" -eq 0 ]
        [[ "$output" == Application*'Usage: app.sh [-h]'* ]]
        [[ "$output" != *COMMAND* && "$output" != *Commands:* && "$output" != *Hints:* ]]
        [ -z "$stderr" ]
        run_help "$declarations"'
            __koirun --koi-enable-verbose-help help --verbose
        '
        [ "$status" -eq 2 ]
        [ -z "$output" ]
        [ "$stderr" = "app.sh: unknown command 'help'" ]
    done
}
