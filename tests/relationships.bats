#!/usr/bin/env bats

bats_require_minimum_version 1.5.0

setup() {
    export KOI_LIBRARY="$BATS_TEST_DIRNAME/../koi"
}

@test "all five group modes count distinct explicit destinations" {
    for type in --xor --or --and; do
        for required in 0 1; do
            if [[ $type == --or && $required == 0 ]]; then
                continue
            fi
            for mask in {0..7}; do
                count=$(( (mask & 1) + ((mask >> 1) & 1) + ((mask >> 2) & 1) ))
                expected=0
                case $type in
                    --xor)
                        if (( count > 1 || (required && count == 0) )); then
                            expected=2
                        fi
                        ;;
                    --or)
                        if (( count == 0 )); then
                            expected=2
                        fi
                        ;;
                    --and)
                        if (( count != 3 && (required || count != 0) )); then
                            expected=2
                        fi
                        ;;
                esac
                run --separate-stderr bash -c '
                    source "$KOI_LIBRARY"
                    demo() {
                        local a b c dest
                        for dest in a b c; do
                            koi::add_arg "$dest" -f -s "$dest" -d "$dest"
                        done
                        local -a group=("$1") args=()
                        if (( $2 )); then
                            group+=(-r)
                        fi
                        koi::add_group "${group[@]}" a b c
                        if (( $3 & 1 )); then
                            args+=(-a)
                        fi
                        if (( $3 & 2 )); then
                            args+=(-b)
                        fi
                        if (( $3 & 4 )); then
                            args+=(-c)
                        fi
                        koi::parse "${args[@]}" || return "$koi_status"
                    }
                    demo "$@"
                ' test "$type" "$required" "$mask"
                [ "$status" -eq "$expected" ]
                [ -z "$output" ]
            done
        done
    done
}

@test "group aliases work and invalid declarations invalidate the block without adding metadata" {
    for declaration in missing one duplicate overlap required positional unknown repeated_type repeated_required optional_or misplaced; do
        run --separate-stderr bash -c '
            source "$KOI_LIBRARY"
            demo() {
                koi::add_arg a -f -s a -d A
                koi::add_arg b -f -s b -d B
                koi::add_arg c -f -s c -d C -r
                koi::add_arg pos -p -d Pos
                case $1 in
                    missing)
                        koi::add_group a b
                        ;;
                    one)
                        koi::add_group -x a
                        ;;
                    duplicate)
                        koi::add_group -x a a
                        ;;
                    overlap)
                        koi::add_group -a a b; koi::add_group -x a b
                        ;;
                    required)
                        koi::add_group -a a c
                        ;;
                    positional)
                        koi::add_group -x a pos
                        ;;
                    unknown)
                        koi::add_group -x a absent
                        ;;
                    repeated_type)
                        koi::add_group -x --xor a b
                        ;;
                    repeated_required)
                        koi::add_group -x -r --required a b
                        ;;
                    optional_or)
                        koi::add_group -o a b
                        ;;
                    misplaced)
                        koi::add_group -x a -r b
                        ;;
                esac
                [[ $? == 2 && $__koi_pending_spec_valid == 0 ]] || return 9
                koi::parse -h || return "$koi_status"
            }
            demo "$1"
        ' test "$declaration"
        [ "$status" -eq 2 ]
        [[ "$stderr" == 'koi: koi::add_group:'* ]]
    done
    for type in -x -a -o; do
        run bash -c '
            source "$KOI_LIBRARY"
            demo() {
                local a b
                koi::add_arg a -f -s a -d A
                koi::add_arg b -f -s b -d B
                koi::add_group "$1" -r a b
                koi::parse -a -h || return "$koi_status"
            }
            demo "$1"
        ' test "$type"
        [ "$status" -eq 0 ]
    done
}

@test "defaults do not select members and omitted defaults are still assigned and validated" {
    run --separate-stderr bash -c '
        source "$KOI_LIBRARY"
        demo() {
            local a b
            koi::add_arg a -o -s a -d A -D first
            koi::add_arg b -o -s b -d B -D second
            koi::add_group -x a b
            koi::parse "$@" || return "$koi_status"
            printf "%s/%s\n" "$a" "$b"
        }
        demo; demo -a ""; demo -a old -a new
    '
    [ "$status" -eq 0 ]
    [ "$output" = $'first/second\n/second\nnew/second' ]
    run --separate-stderr bash -c '
        source "$KOI_LIBRARY"
        demo() {
            local a b
            koi::add_arg a -o -s a -d A -D not-an-integer
            koi::add_arg b -f -s b -d B
            koi::add_group -x a b
            koi::add_validator a --integer
            koi::parse -b || return "$koi_status"
        }
        demo
    '
    [ "$status" -eq 2 ]
    [[ "$stderr" == 'koi: koi::parse: invalid default'* ]]
}

@test "arrays select one member and clusters select each flag" {
    run --separate-stderr bash -c '
        source "$KOI_LIBRARY"
        demo() {
            local -a a
            local b
            koi::add_arg a -o -a -s a -d A
            koi::add_arg b -f -s b -d B
            koi::add_group -x -r a b
            koi::config error-on-scalar-duplicates true; koi::parse -a "" -a two || return "$koi_status"
            [[ ${#a[@]} == 2 && ${a[0]} == "" && $b == 0 ]]
        }
        demo
    '
    [ "$status" -eq 0 ]
    run --separate-stderr bash -c '
        source "$KOI_LIBRARY"
        demo() {
            local a b
            koi::add_arg a -f -s a -d A
            koi::add_arg b -f -s b -d B
            koi::add_group -x a b
            koi::parse -ab || return "$koi_status"
        }
        demo
    '
    [ "$status" -eq 2 ]
    [[ "$stderr" == *'at most one'* ]]
}

@test "dependency declarations reject malformed members and exact duplicate edges atomically" {
    for declaration in missing unknown positional self duplicate existing order; do
        run --separate-stderr bash -c '
            source "$KOI_LIBRARY"
            demo() {
                koi::add_arg a -f -s a -d A
                koi::add_arg b -f -s b -d B
                koi::add_arg c -f -s c -d C
                koi::add_arg pos -p -d Pos
                case $1 in
                    missing)
                        koi::add_dependency a b
                        ;;
                    unknown)
                        koi::add_dependency a -r absent
                        ;;
                    positional)
                        koi::add_dependency a -r pos
                        ;;
                    self)
                        koi::add_dependency a -r a
                        ;;
                    duplicate)
                        koi::add_dependency a -r b b
                        ;;
                    existing)
                        koi::add_dependency a -r b; koi::add_dependency a -r c b
                        ;;
                    order)
                        koi::add_dependency a -r b c; koi::add_dependency a -r c b
                        ;;
                esac
                [[ $? == 2 && $__koi_pending_spec_valid == 0 ]] || return 9
                if [[ $1 == existing ]]; then
                    [[ ${#__koi_pending_dependency_sources[@]} == 1 ]] || return 8
                fi
                return 2
            }
            demo "$1"
        ' test "$declaration"
        [ "$status" -eq 2 ]
        [[ "$stderr" == 'koi: koi::add_dependency:'* ]]
    done
}

@test "dependencies require all prerequisites without reverse implications or default presence" {
    for args in empty source partial full prerequisite; do
        expected=0
        if [[ $args == source || $args == partial ]]; then
            expected=2
        fi
        run --separate-stderr bash -c '
            source "$KOI_LIBRARY"
            koi::config name yarf
            demo() {
                local a b c
                koi::add_arg a -f -s a -d A
                koi::add_arg b -o -s b -d B -D fallback
                koi::add_arg c -f -s c -d C
                koi::add_dependency a --requires b c
                local -a args=()
                case $1 in
                    source)
                        args=(-a)
                        ;;
                    partial)
                        args=(-a -b "")
                        ;;
                    full)
                        args=(-a -b "" -c)
                        ;;
                    prerequisite)
                        args=(-b "")
                        ;;
                esac
                koi::parse "${args[@]}" || return "$koi_status"
            }
            demo "$1"
        ' test "$args"
        [ "$status" -eq "$expected" ]
        if (( expected )); then
            [[ "$stderr" == yarf:*requires* ]]
        fi
    done
}

@test "direct XOR contradictions reject both declaration orders even for help and inspection" {
    for order in group_first dependency_first; do
        run --separate-stderr bash -c '
            source "$KOI_LIBRARY"
            demo() {
                local a b
                koi::add_arg a -f -s a -d A
                koi::add_arg b -f -s b -d B
                if [[ $1 == group_first ]]; then
                    koi::add_group -x a b
                    koi::add_dependency a -r b
                else
                    koi::add_dependency a -r b
                    koi::add_group -x a b
                fi
                koi::parse -h || return "$koi_status"
            }
            demo "$1"
        ' test "$order"
        [ "$status" -eq 2 ]
        [[ "$stderr" == 'koi: koi::add_dependency:'*'same XOR group' ]]
    done
}

@test "cycles and transitive XOR contradictions are not statically rejected" {
    run bash -c '
        source "$KOI_LIBRARY"
        demo() {
            local a b c
            koi::add_arg a -f -s a -d A
            koi::add_arg b -f -s b -d B
            koi::add_arg c -f -s c -d C
            koi::add_dependency a -r c
            koi::add_dependency c -r b
            koi::add_dependency c -r a
            koi::add_group -x a b
            koi::parse -h || return "$koi_status"
        }
        demo
    '
    [ "$status" -eq 0 ]
    [[ "$output" == *'Dependencies:'* ]]
}

@test "requiredness then groups then dependencies precede validators and all assignment" {
    run --separate-stderr bash -c '
        source "$KOI_LIBRARY"
        a=old b=old c=old count=old calls=0
        check() {
            calls=$((calls + 1))
            return 0
        }
        demo() {
            koi::add_arg count -o -l count -d Count -r
            koi::add_arg a -f -s a -d A
            koi::add_arg b -f -s b -d B
            koi::add_arg c -f -s c -d C
            koi::add_group -x -r a b
            koi::add_dependency a -r c
            koi::add_validator count -f check
            koi::parse "$@" || return "$koi_status"
        }
        demo || :
        demo --count one || :
        demo --count one -a || :
        [[ $a == old && $b == old && $c == old && $count == old && $calls == 0 ]]
    '
    [ "$status" -eq 0 ]
    [ "$stderr" = "koi: missing required argument: 'count'
koi: exactly one of 'a', 'b' is required
koi: 'a' requires 'c'" ]
}

@test "usage emits groups once at first member while retaining member order and array repetition" {
    run bash -c '
        source "$KOI_LIBRARY"
        demo() {
            local -a a
            local b c d e f
            koi::add_arg a -o -a -s I -n FILE -d A
            koi::add_arg b -f -s b -d B
            koi::add_arg c -f -l stdin -d C
            koi::add_arg d -f -s d -d D
            koi::add_arg e -f -s e -d E
            koi::add_arg f -f -s f -d F
            koi::add_group -x -r c a
            koi::add_group -a d e
            koi::add_dependency b -r f d
            koi::parse -h || return "$koi_status"
        }
        demo
    '
    [ "$status" -eq 0 ]
    [ "${lines[0]}" = 'Usage: bash [-h] (--stdin | -I FILE [-I FILE]...) [-b] [-d & -e] [-f]' ]
    [[ "$output" == *$'Dependencies:\n  -b requires -f and -d' ]]
}

@test "notation inherits routed help and verbose traversal but not independent direct calls" {
    run bash -c '
        source "$KOI_LIBRARY"
        koi::add_command branch -f branch -d Branch
        leaf() {
            local a b
            koi::add_arg a -f -s a -d A
            koi::add_arg b -f -s b -d B
            koi::add_group -o -r a b
            koi::parse "$@" || return "$koi_status"
        }
        branch() {
            leaf -h
            koi::add_command leaf -f leaf -d Leaf
            koi::config use-single-pipe-for-or-groups true; koi::parse "$@" || return "$koi_status"
        }
        koi::config use-single-pipe-for-or-groups true; koi::run branch leaf -h
    '
    [ "$status" -eq 0 ]
    [[ "${lines[0]}" == *'(-a || -b)' ]]
    [[ "$output" == *'branch leaf [-h] (-a | -b)'* ]]
    run bash -c '
        source "$KOI_LIBRARY"
        koi::add_command leaf -f leaf -d Leaf
        leaf() {
            local a b
            koi::add_arg a -f -s a -d A
            koi::add_arg b -f -s b -d B
            koi::add_group -o -r a b
            koi::config use-single-pipe-for-or-groups true; koi::config error-on-scalar-duplicates true; koi::config ignore-unknown-positionals true; koi::parse "$@" || return "$koi_status"
        }
        koi::config use-single-pipe-for-or-groups true; koi::config verbose-help true; koi::run help --verbose
    '
    [ "$status" -eq 0 ]
    [[ "$output" == *'leaf [-h] (-a | -b)'* ]]
}

@test "notation rejects duplicate explicit settings and preserves literal option values and separators" {
    run --separate-stderr bash -c '
        source "$KOI_LIBRARY"
        demo() {
            koi::config use-single-pipe-for-or-groups true
            koi::config use-single-pipe-for-or-groups false || :
            koi::parse "$@" || return "$koi_status"
        }
        demo
    '
    [ "$status" -eq 2 ]
    [[ "$stderr" == 'koi: koi::config: repeated key: use-single-pipe-for-or-groups' ]]
    run bash -c '
        source "$KOI_LIBRARY"
        demo() {
            local value rest
            koi::add_arg value -o -l value -d Value
            koi::add_arg rest -p -d Rest
            koi::parse --value --koi-use-single-pipe-for-or-groups -- --koi-use-single-pipe-for-or-groups || return "$koi_status"
            [[ $value == --koi-use-single-pipe-for-or-groups && $rest == "$value" ]]
        }
        demo
    '
    [ "$status" -eq 0 ]
}

@test "inspection retains ordered relationship metadata and repeated parses clear it" {
    export KOI_INSPECTION="$BATS_TEST_DIRNAME/fixtures/inspection.sh"
    run bash -c '
        source "$KOI_LIBRARY"
        source "$KOI_INSPECTION"
        demo() {
            local a b c
            koi::add_arg a -f -s a -d A
            koi::add_arg b -f -s b -d B
            koi::add_arg c -f -s c -d C
            koi::add_group -a a b
            koi::add_dependency a -r c
            koi::parse "$@" || return "$koi_status"
        }
        inspect() {
            [[ ${__koi_saved_group_types[0]} == and && ${__koi_saved_group_members[1]} == b &&
               ${__koi_saved_arg_groups[a]} == 0 && ${__koi_saved_dependency_targets[0]} == c ]]
        }
        capture_spec demo inspect || exit
        demo -h >/dev/null || exit
        plain() {
            koi::parse "$@" || return "$koi_status"
        }
        plain
        [[ ${#__koi_pending_group_types[@]} == 0 && ${#__koi_pending_dependency_sources[@]} == 0 ]]
    '
    [ "$status" -eq 0 ]
}

@test "root relationships precede dispatch and root terminal positionals preserve cycles" {
    run --separate-stderr bash -c '
        source "$KOI_LIBRARY"
        koi::config name root-app
        koi::add_arg a -f -s a -d A
        koi::add_arg b -f -s b -d B
        koi::add_arg c -f -s c -d C
        koi::add_group -x -r a b
        koi::add_dependency a -r c
        child() { printf "business\n"; }
        koi::add_command child -f child -d Child
        koi::run -a child
    '
    [ "$status" -eq 2 ]
    [ -z "$output" ]
    [ "$stderr" = "root-app: 'a' requires 'c'" ]
    run --separate-stderr bash -c '
        source "$KOI_LIBRARY"
        koi::add_arg a -f -s a -d A -r
        koi::add_arg b -f -s b -d B
        koi::add_arg source -p -d Source
        koi::add_dependency a -r b
        koi::add_dependency b -r a
        source "$KOI_LIBRARY"
        koi::run -ab input || exit
        [[ $a == 1 && $b == 1 && $source == input ]]
    '
    [ "$status" -eq 0 ]
}

@test "dependency rows wrap and former administrative spelling is available" {
    run bash -c '
        source "$KOI_LIBRARY"
        koi::config help-width 24
        demo() {
            local upload token account
            koi::add_arg upload -f -l upload -d Upload
            koi::add_arg token -o -l token -d Token
            koi::add_arg account -o -l account -d Account
            koi::add_dependency upload -r token account
            koi::parse -h || return "$koi_status"
        }
        demo
    '
    [ "$status" -eq 0 ]
    [[ "$output" == *$'Dependencies:\n  --upload requires\n  --token and --account' ]]
    run --separate-stderr bash -c '
        source "$KOI_LIBRARY"
        koi::add_arg reserved -f -l koi-use-single-pipe-for-or-groups -d Reserved
    '
    [ "$status" -eq 0 ]
    [ -z "$stderr" ]
}
