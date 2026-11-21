#!/bin/sh

# New to koi? Get started here:
#   - https://koishell.com
#   - https://github.com/wcarhart/koi

# Install the released koi library without a package manager. Downloads
# and verifies the library, returns nonzero on failure.
# Usage: curl -fsSL https://get.koishell.com | [KOI_INSTALL_PATH=DIR] [KOI_VERSION=TAG] sh
#   KOI_INSTALL_PATH  parent directory for koi (default: $HOME/.local/bin)
#   KOI_VERSION       exact stable v2+ tag (default: latest stable release)

set -eu

# Wouldn't it be cool if install.sh could use koi? Oh well...

# Report an installation failure and stop
# Usage: fail MESSAGE
#   MESSAGE  error text printed to stderr
fail() {
    printf 'koi install: %s\n' "$1" >&2
    exit 1
}

# Quote one value for a shell command printed to the user
# Usage: shell_quote VALUE
#   VALUE  text to quote; prints one single-quoted shell word
shell_quote() {
    printf "'"
    printf '%s' "$1" | sed "s/'/'\\\\''/g"
    printf "'"
}


# Draw the KOI logo upon successful install
# Usage: logo
logo() {
    cat <<'EOF'
                          
▄▄▄   ▄▄▄   ▄▄▄▄▄   ▄▄▄▄▄ 
███ ▄███▀ ▄███████▄  ███  
███████   ███   ███  ███  
███▀███▄  ███▄▄▄███  ███  
███  ▀███  ▀█████▀  ▄███▄ 
                                                    
EOF
}

# check prereqs
command -v curl >/dev/null 2>&1 || fail 'curl is required'
if command -v sha256sum >/dev/null 2>&1; then
    checksum_tool=sha256sum
elif command -v shasum >/dev/null 2>&1; then
    checksum_tool=shasum
else
    fail 'sha256sum or shasum is required'
fi

# resolve install destination
parent=${KOI_INSTALL_PATH:-${HOME:?HOME must be set}/.local/bin}
case "$parent" in
    /*)
        ;;
    *)
        parent=$PWD/$parent
        ;;
esac
parent=${parent%/}
parent=${parent:-/}
destination=${parent%/}/koi
if [ -L "$destination" ] || { [ -e "$destination" ] && [ ! -f "$destination" ]; }; then
    fail "destination must be a regular file, not a directory or symlink: $destination"
fi

# resolve target library version
version=${KOI_VERSION:-}
if [ -z "$version" ]; then
    release_url=$(curl -fsSL -o /dev/null -w '%{url_effective}' \
        https://github.com/wcarhart/koi/releases/latest) || fail 'could not resolve the latest release'
    version=${release_url##*/}
fi
case "$version" in
    *[!v0-9.]*)
        fail "expected a stable release tag such as v2.0.0, got: $version"
        ;;
esac
printf '%s\n' "$version" | grep -Eq '^v(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)$' ||
    fail "expected a stable release tag such as v2.0.0, got: $version"
major=${version#v}
major=${major%%.*}
case "$major" in
    0|1)
        fail 'this installer requires a v2.0.0 or newer release'
        ;;
esac

# proceed with install
mkdir -p -- "$parent" || fail "could not create destination directory: $parent"
staging=$(mktemp -d "$parent/.koi-install.XXXXXXXX") || fail "destination is not writable: $parent"
trap 'rm -rf -- "$staging"' 0
trap 'exit 1' HUP INT TERM
base=https://github.com/wcarhart/koi/releases/download/$version
curl -fsSL "$base/koi" -o "$staging/koi" || fail "could not download koi for $version"
curl -fsSL "$base/SHA256SUMS" -o "$staging/SHA256SUMS" || fail "could not download checksums for $version"
expected=$(awk '$2 == "koi" { print $1 }' "$staging/SHA256SUMS")
printf '%s\n' "$expected" | grep -Eq '^[0-9a-f]{64}$' || fail 'missing or invalid library checksum'
if [ "$checksum_tool" = sha256sum ]; then
    actual=$(sha256sum < "$staging/koi")
else
    actual=$(shasum -a 256 < "$staging/koi")
fi
actual=${actual%% *}
[ "$actual" = "$expected" ] || fail 'library checksum does not match'
chmod 0644 "$staging/koi"
# recheck the target after downloading before replacing it
if [ -L "$destination" ] || { [ -e "$destination" ] && [ ! -f "$destination" ]; }; then
    fail "destination changed to a directory or symlink: $destination"
fi
mv -f -- "$staging/koi" "$destination" || fail "could not install to $destination"
logo
printf 'Installed koi %s to %s\nRequires Bash 5.2 or newer.\n' "$version" "$destination"
case ":${PATH-}:" in
    *:"$parent":*)
        printf '%s\n' 'Use source koi in your Bash script.'
        ;;
    *)
        printf '%s\n' 'Add this directory to PATH in your shell startup file, then open a new shell:'
        printf 'export PATH='
        shell_quote "$parent"
        # keep PATH expansion in the printed command for the user's shell
        # shellcheck disable=SC2016
        printf ':"$PATH"\n'
        ;;
esac
