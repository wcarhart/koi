#!/usr/bin/env bats
# Bats isolates tests; run subshells in one test do not affect another.
# shellcheck disable=SC2031

bats_require_minimum_version 1.5.0

setup() {
    export KOI_LIBRARY="$BATS_TEST_DIRNAME/../koi"
    # shellcheck source=koi
    source "$KOI_LIBRARY"
}

# Attempt a declaration and verify failures leave both registries unchanged.
# Usage: attempt_argument "$@"
#   $@  the declaration arguments
attempt_argument() {
    local before after result
    before=$(declare -p __koi_pending_args __koi_pending_arg_shorts __koi_pending_arg_longs __koi_pending_arg_kinds \
        __koi_pending_arg_descriptions __koi_pending_arg_requireds __koi_pending_arg_defaults __koi_pending_arg_display_names \
        __koi_pending_commands __koi_pending_handlers __koi_pending_descriptions)
    __addarg "$@"
    result=$?
    after=$(declare -p __koi_pending_args __koi_pending_arg_shorts __koi_pending_arg_longs __koi_pending_arg_kinds \
        __koi_pending_arg_descriptions __koi_pending_arg_requireds __koi_pending_arg_defaults __koi_pending_arg_display_names \
        __koi_pending_commands __koi_pending_handlers __koi_pending_descriptions)
    if [[ $result != 0 && $before != "$after" ]]; then
        printf 'Registry changed after rejection\n' >&2
        return 1
    fi
    if [[ $result != 0 && $__koi_pending_spec_valid != 0 ]]; then
        printf 'Registration failure did not invalidate the spec\n' >&2
        return 1
    fi
    return "$result"
}

# Check that an invalid declaration fails silently on stdout without mutation.
# Usage: assert_invalid "$@"
#   $@  the declaration arguments
assert_invalid() {
    run --separate-stderr attempt_argument "$@"
    [ "$status" -eq 2 ]
    [ -z "$output" ]
    [[ "$stderr" == 'koi: __addarg:'* ]]
}

@test "long aliases register an optional scalar option" {
    __addarg output_file --option --short o --long output-file --description 'Output path'
    [ "$__koi_pending_spec_valid" -eq 1 ]
    [ "${__koi_pending_args[0]}" = output_file ]
    [ "${__koi_pending_arg_kinds[output_file]}" = option ]
    [ "${__koi_pending_arg_shorts[output_file]}" = o ]
    [ "${__koi_pending_arg_longs[output_file]}" = output-file ]
    [ "${__koi_pending_arg_descriptions[output_file]}" = 'Output path' ]
    [ "${__koi_pending_arg_requireds[output_file]}" = 0 ]
    [[ ! -v __koi_pending_arg_defaults[output_file] ]]
}

@test "short aliases register a required flag" {
    __addarg verbose -f -s v -l verbose -d 'Print progress' -r
    [ "${__koi_pending_arg_kinds[verbose]}" = flag ]
    [ "${__koi_pending_arg_requireds[verbose]}" = 1 ]
    [ "${__koi_pending_arg_shorts[verbose]}" = v ]
    [ "${__koi_pending_arg_longs[verbose]}" = verbose ]
    [ "${__koi_pending_arg_descriptions[verbose]}" = 'Print progress' ]
}

@test "short option and long flag selectors work" {
    __addarg mode -o -l mode -d Mode
    __addarg verbose --flag -s v -d Verbose
    [ "${__koi_pending_arg_kinds[mode]}" = option ]
    [ "${__koi_pending_arg_kinds[verbose]}" = flag ]
    [ "${__koi_pending_arg_requireds[verbose]}" = 0 ]
}

@test "short-only and long-only declarations do not infer other spellings" {
    __addarg mode -o -s m -d Mode
    __addarg verbose -f -l verbose -d Verbose
    [ "${__koi_pending_arg_longs[mode]}" = '' ]
    [ "${__koi_pending_arg_shorts[verbose]}" = '' ]
}

@test "mixed aliases and arbitrary declaration order are accepted" {
    __addarg mode --description Mode -D safe --long mode -s m --option
    [ "${__koi_pending_arg_defaults[mode]}" = safe ]
    [ "${__koi_pending_arg_longs[mode]}" = mode ]
    [ "${__koi_pending_arg_shorts[mode]}" = m ]
}

@test "required option metadata is recorded" {
    __addarg token -o -l token --required -d Token
    [ "${__koi_pending_arg_requireds[token]}" = 1 ]
}

@test "registration succeeds silently" {
    run --separate-stderr __addarg mode -o -l mode -d Mode
    [ "$status" -eq 0 ]
    [ -z "$output" ]
    [ -z "$stderr" ]
}

@test "argument order and command registrations remain independent" {
    __addcommand mode -f handler -d Command
    __addarg mode -o -l mode -d Mode
    __addarg verbose -f -s v -d Verbose
    [ "${__koi_pending_args[*]}" = 'mode verbose' ]
    [ "${__koi_pending_commands[*]}" = mode ]
    [ "${__koi_pending_handlers[mode]}" = handler ]
    [ "${__koi_pending_descriptions[mode]}" = Command ]
}

@test "repeated sourcing preserves all argument metadata" {
    __addarg mode -o -s m -l mode -d Mode -D safe
    local before after
    before=$(declare -p __koi_pending_args __koi_pending_arg_shorts __koi_pending_arg_longs __koi_pending_arg_kinds \
        __koi_pending_arg_descriptions __koi_pending_arg_requireds __koi_pending_arg_defaults __koi_pending_arg_display_names)
    # shellcheck source=koi
    source "$KOI_LIBRARY"
    after=$(declare -p __koi_pending_args __koi_pending_arg_shorts __koi_pending_arg_longs __koi_pending_arg_kinds \
        __koi_pending_arg_descriptions __koi_pending_arg_requireds __koi_pending_arg_defaults __koi_pending_arg_display_names)
    [ "$before" = "$after" ]
}

@test "valid identifiers and mixed-case hyphenated and underscored long names work" {
    __addarg _file2 -o -s H -l Output-file_2 -d File
    [ "${__koi_pending_arg_longs[_file2]}" = Output-file_2 ]
    [ "${__koi_pending_arg_shorts[_file2]}" = H ]
}

@test "short and long spellings occupy separate case-sensitive namespaces" {
    __addarg first -o -s m -l Mode -d First
    __addarg second -f -s M -l m -d Second
    __addarg third -o -l mode -d Third
    [ "${#__koi_pending_args[@]}" -eq 3 ]
}

@test "absent and explicitly empty defaults are distinct" {
    __addarg first -o -l first -d First
    __addarg second -o -l second -d Second --default ''
    [[ ! -v __koi_pending_arg_defaults[first] ]]
    [[ -v __koi_pending_arg_defaults[second] ]]
    [ "${__koi_pending_arg_defaults[second]}" = '' ]
}

@test "metadata is stored literally without evaluating shell-looking text" {
    local text=$'  a\n"quoted" $value $(false) `false` \\ %s  '
    __addarg mode -o -l mode -d "$text" -D "$text"
    [ "${__koi_pending_arg_descriptions[mode]}" = "$text" ]
    [ "${__koi_pending_arg_defaults[mode]}" = "$text" ]
}

@test "registration does not initialize unset destinations" {
    unset koi_test_unset_option koi_test_unset_flag
    __addarg koi_test_unset_option -o -l mode -d Mode -D safe
    __addarg koi_test_unset_flag -f -s v -d Verbose
    [[ ! -v koi_test_unset_option && ! -v koi_test_unset_flag ]]
}

@test "registration leaves local and global destination values unchanged" {
    declare -g koi_test_global=original
    local koi_test_local=local_value
    __addarg koi_test_global -o -l global -d Global -D replacement
    __addarg koi_test_local -f -l local -d Local
    [ "$koi_test_global" = original ]
    [ "$koi_test_local" = local_value ]
}

@test "readonly ordinary destinations can be declared without assignment" {
    local -r koi_test_readonly=original
    __addarg koi_test_readonly -o -l readonly -d Readonly -D replacement
    [ "$koi_test_readonly" = original ]
}

@test "registration works with nounset enabled" {
    # shellcheck disable=SC2016
    run --separate-stderr bash -uc '
        source "$KOI_LIBRARY" || exit
        __addarg mode -o -l mode -d Mode || exit
        __addarg verbose -f -s v -d Verbose
    '
    [ "$status" -eq 0 ]
    [ -z "$output" ]
    [ -z "$stderr" ]
}

@test "destination is required and must be a non-reserved Bash identifier" {
    assert_invalid
    for name in '' '1name' 'two words' 'with-dash' 'x[0]' '__koi_private' koi_status; do
        assert_invalid "$name" -o -l mode -d Mode
    done
}

@test "legacy shell-variable denylist remains reserved" {
    local name
    for name in BASH BASH_ENV BASH_SUBSHELL BASHPID BASH_VERSINFO BASH_VERSION CDPATH \
        DIRSTACK EDITOR EUID FUNCNAME GLOBIGNORE GROUPS HOME HOSTNAME HOSTTYPE IFS \
        IGNOREEOF LC_COLLATE LC_CTYPE LINENO MACHTYPE OLDPWD OSTYPE PATH PIPESTATUS \
        PPID PROMPT_COMMAND PS1 PS2 PS3 PS4 PWD REPLY SECONDS SHELLOPTS SHLVL TMOUT UID; do
        assert_invalid "$name" -o -l mode -d Mode
    done
}

@test "kind selector is mandatory and cannot conflict or repeat" {
    assert_invalid mode -l mode -d Mode
    local first second
    for first in -f --flag -o --option; do
        for second in -f --flag -o --option; do
            assert_invalid mode "$first" "$second" -l mode -d Mode
        done
    done
}

@test "legacy actions, future kinds and unknown syntax are rejected" {
    assert_invalid mode -a value -l mode -d Mode
    assert_invalid mode --action flag -l mode -d Mode
    assert_invalid mode --positional -d Mode
    assert_invalid mode --unknown -o -l mode -d Mode
    assert_invalid mode -or -l mode -d Mode
    assert_invalid mode -o --long=mode -d Mode
    assert_invalid mode -o -l mode -d Mode extra
    assert_invalid mode -o -l mode -d Mode --
}

@test "one CLI spelling and a nonempty description are required" {
    assert_invalid mode -o -d Mode
    assert_invalid mode -o -l mode
    assert_invalid mode -o -l mode -d ''
}

@test "value-taking declaration options reject missing values" {
    local option
    for option in -s --short -l --long -d --description -D --default; do
        assert_invalid mode -o "$option"
    done
}

@test "short spelling must be a non-help single ASCII letter" {
    local spelling
    for spelling in '' h 1 ab -a _ ' ' '!'; do
        assert_invalid mode -o -s "$spelling" -d Mode
    done
}

@test "long spelling must be an unprefixed non-help name" {
    local spelling
    for spelling in '' help koi-error-on-duplicates koi-error-on-duplicate --mode -mode _mode 1mode 'two words' 'mode!' 'mode/path'; do
        assert_invalid mode -o -l "$spelling" -d Mode
    done
}

@test "help declaration options remain unsupported" {
    assert_invalid -h
    assert_invalid --help
    assert_invalid mode -o -l mode -d Mode -h
    assert_invalid mode -o -l mode -d Mode --help
}

@test "all metadata parameters reject duplicate aliases" {
    local first second
    for first in -s --short; do
        for second in -s --short; do
            assert_invalid mode -o "$first" m "$second" n -d Mode
        done
    done
    for first in -l --long; do
        for second in -l --long; do
            assert_invalid mode -o "$first" mode "$second" other -d Mode
        done
    done
    for first in -d --description; do
        for second in -d --description; do
            assert_invalid mode -o -l mode "$first" Mode "$second" Other
        done
    done
    for first in -D --default; do
        for second in -D --default; do
            assert_invalid mode -o -l mode -d Mode "$first" '' "$second" other
        done
    done
    for first in -r --required; do
        for second in -r --required; do
            assert_invalid mode -o -l mode -d Mode "$first" "$second"
        done
    done
}

@test "defaults are forbidden for flags and required options" {
    assert_invalid verbose -f -l verbose -d Verbose -D value
    assert_invalid verbose -f -l verbose -d Verbose -D ''
    assert_invalid mode -o -l mode -d Mode -r -D safe
    assert_invalid mode -D '' --required -o -l mode -d Mode
}

@test "destination and spelling collisions preserve existing registrations" {
    __addcommand original -f handler -d Command
    __addarg original -o -s m -l mode -d Original -D safe
    assert_invalid original -f -s v -l verbose -d Replacement
    assert_invalid other -f -s m -d Other
    assert_invalid other -o -l mode -d Other
    __addarg other -f -s v -d Other
    [ "${__koi_pending_args[*]}" = 'original other' ]
}

@test "successful command registration cannot clear an argument registration failure" {
    # shellcheck disable=SC2016
    run --separate-stderr bash -c '
        source "$KOI_LIBRARY" || exit
        __addarg
        result=$?
        [[ $result == 2 && $__koi_root_spec_valid == 0 ]] || exit 1
        __addcommand deploy -f handler -d Deploy || exit
        [[ $__koi_root_spec_valid == 0 && ${__koi_root_commands[0]} == deploy ]]
    '
    [ "$status" -eq 0 ]
    [ -z "$output" ]
    [ "$stderr" = 'koi: __addarg: destination required' ]
}

@test "execution continues without errexit while each declaration failure reports immediately" {
    # shellcheck disable=SC2016
    run --separate-stderr bash -c '
        set +e
        source "$KOI_LIBRARY" || exit
        __addarg
        result=$?
        [[ $result == 2 && $__koi_root_spec_valid == 0 ]] || exit 1
        __addarg mode -o -l mode -d Mode || exit
        [[ $__koi_root_spec_valid == 0 ]] || exit 1
        __addarg mode -f -s m -d Duplicate
        result=$?
        [[ $result == 2 && $__koi_root_spec_valid == 0 ]] || exit 1
        printf "continued\n"
    '
    [ "$status" -eq 0 ]
    [ "$output" = continued ]
    [ "$stderr" = $'koi: __addarg: destination required\nkoi: __addarg: duplicate destination: \'mode\'' ]
}

@test "conditional function calls under errexit still record registration failures" {
    # shellcheck disable=SC2016
    run --separate-stderr bash -c '
        set -e
        source "$KOI_LIBRARY"
        register_spec() {
            __addarg
            printf "continued\n"
        }
        if register_spec; then
            [[ $__koi_pending_spec_valid == 0 ]]
        else
            exit 1
        fi
    '
    [ "$status" -eq 0 ]
    [ "$output" = continued ]
    [ "$stderr" = 'koi: __addarg: destination required' ]
}

@test "long spelling reservations use the shared list" {
    __koi_reserved_longs+=(future-koi-setting)
    assert_invalid setting -f -l future-koi-setting -d Setting
}

@test "option display name supports short and long aliases" {
    __addarg env -o -l environment -n env -d Environment
    __addarg file -o -s F --display-name path -d File
    [ "${__koi_pending_arg_display_names[env]}" = env ]
    [ "${__koi_pending_arg_display_names[file]}" = path ]
}

@test "display names are rejected on flags and cannot be empty or missing" {
    assert_invalid env -f -l environment -n env -d Environment
    assert_invalid env -o -l environment -n '' -d Environment
    assert_invalid env -o -l environment -d Environment -n
    assert_invalid env -o -l environment -d Environment --display-name
}

@test "display name aliases cannot be repeated" {
    local first second
    for first in -n --display-name; do
        for second in -n --display-name; do
            assert_invalid env -o -l environment -d Environment "$first" env "$second" other
        done
    done
}

@test "repeated sourcing preserves explicit display names" {
    # shellcheck disable=SC2016
    run --separate-stderr bash -c '
        source "$KOI_LIBRARY" || exit
        __addarg env -o -l environment -d Environment -n env || exit
        source "$KOI_LIBRARY" || exit
        [[ ${__koi_root_arg_display_names[env]} == env ]]
    '
    [ "$status" -eq 0 ]
    [ -z "$output" ]
    [ -z "$stderr" ]
}
