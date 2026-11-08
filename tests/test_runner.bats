#!/usr/bin/env bats

bats_require_minimum_version 1.5.0

@test "test entry point refuses to run without Bats" {
    run --separate-stderr env PATH=/nonexistent "$BASH" "$BATS_TEST_DIRNAME/../scripts/test"
    [ "$status" -eq 1 ]
    [ -z "$output" ]
    [ "$stderr" = 'Tests require bats. Install with: brew install bats-core' ]
}
