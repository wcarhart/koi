---
title: "Install koi"
description: "As simple as install + source"
layout: article
---

## Quick install

<!-- koi:install koi -->

Once installed, just `source` koi to use it:

```bash
source koi
```

## Agent skill

Install the [Koi skill](/skill.md) to help your coding agent use koi:

```bash
npx skills add wcarhart/koi --skill koi -g
```

This installs agent instructions separately from koi itself. See [agent guidance](/agents) for a copyable project prompt and [llms.txt](/llms.txt).

## Dependencies

Koi requires **Bash 5.2 or newer**. You can check your current Bash version via:

```bash
bash --version
```

Koi only works in Bash, not Zsh, Fish, or any other shells. On macOS, the system `/bin/bash` is usually pinned to Bash 3.2 due to [GPLv3 license concerns](https://news.ycombinator.com/item?id=38132066), which is too outdated to use with koi. You can upgrade your Bash version to 5.2+ on macOS via Homebrew:

```bash
brew install bash
echo '/opt/homebrew/bin/bash' | sudo tee -a /etc/shells
chsh -s '/opt/homebrew/bin/bash'
# then open a new terminal
```

If you don't have Bash installed, you can install it via:

<!-- koi:install bash -->

Koi supports running with `errexit` and `nounset` enabled, but neither is required. You can run koi with any of `set -e`, `set +e`, `set -u`, `set +u`. For more details, see [control flow](/docs/concepts/control-flow).

> [!NOTE] Bash POSIX mode
> Koi cannot use Bash 5.2 in [POSIX mode](https://www.gnu.org/software/bash/manual/html_node/Bash-POSIX-Mode.html). POSIX mode in Bash 5.2 restricts the use of `::` in function names, so the namespaced function convention is not supported. Koi uses namespaced functions (e.g. `koi::parse`), which will fail in Bash 5.2 POSIX mode.
>
> If you're using Bash 5.2, don't run your shell via `bash --posix` or use `set -o posix` in your script if you'd like to use koi.
>
> Bash 5.3 [removed the POSIX mode restriction](https://lists.gnu.org/archive/html/bug-bash/2025-07/msg00005.html) on namespaced functions, so `::` is supported in function names. If you're using Bash 5.3, you can use koi in normal mode or POSIX mode.

## Homebrew and mise

Both [Homebrew](https://brew.sh) and [mise](https://mise.jdx.dev/) use [wcarhart/koi](https://github.com/wcarhart/koi) as the upstream repository for installation and will install the latest released v2.x+ version unless otherwise specified. To install via Homebrew, use:

```bash
brew tap wcarhart/koi https://github.com/wcarhart/koi.git
brew install wcarhart/koi/koi
```

The fully qualified `brew tap` syntax implicitly trusts the tap. Learn more about [trusted taps](https://docs.brew.sh/Tap-Trust).

To install via mise, use:

```bash
mise use -g github:wcarhart/koi@latest
```

By default mise will install koi so it's accessible via your `PATH`. In CI or shells using only mise shims, run your script with:

```bash
mise exec -- bash ./your-script.sh
```

## Manual install

If you'd prefer not to use a package manager, you can use koi's manually installer. The manual installer downloads the latest stable v2.x+ release and verifies its SHA-256 checksum. Use it via:

```sh
curl -fsSL https://get.koishell.com | sh
```

The manual installer will install koi to `$HOME/.local/bin/koi`. If that destination directory is missing from your `PATH`, you can add the following line to your `~/.bashrc` or similar shell startup file (the installer will also have hints for if this is necessary):

```bash
export PATH="$HOME/.local/bin:$PATH"
```

Make sure your `PATH` is updated before you try to `source koi`.

You can manually override the destination **path** during install via `KOI_INSTALL_PATH`. The installer will create this path if it does not exist upon install (`KOI_INSTALL_PATH` is the path to the _parent_ directory in which the `koi` source file will be installed). `KOI_INSTALL_PATH` must be writable by your user during install.

```bash
curl -fsSL https://get.koishell.com | KOI_INSTALL_PATH="$HOME/bin" sh
```

By default the manual installer will install the latest version of koi, but you can specify a version via `KOI_VERSION`:

```bash
curl -fsSL https://get.koishell.com | KOI_VERSION=v2.0.5 sh
```

`KOI_VERSION` must match a valid existing release version. See all versions available on [GitHub](https://github.com/wcarhart/koi/releases). You can use one, both, or neither of `KOI_INSTALL_PATH` and `KOI_VERSION` when using the manual installer.

## GitHub download

Navigate to koi's [GitHub releases](https://github.com/wcarhart/koi/releases) and download the version of koi you want. Note that modern versions of koi are 2.x+. Take the single sourceable `koi` file from that release and place it in your project alongside your script. Source it in your script:

```bash
source ./koi
```

Use `source ./koi` instead of `source koi` because the file is not on your `PATH`. The `./` path is relative to your current working directory.

## Clone

Clone the [wcarhart/koi](https://github.com/wcarhart/koi) repository:

```bash
git clone git@github.com:wcarhart/koi.git
```

Cloning checks out the latest on the default branch, which can contain unreleased changes. For a specific released version, checkout its tag inside the clone:

```bash
git clone git@github.com:wcarhart/koi.git
cd koi
git checkout v2.0.0
```

The clone does not add anything to `PATH`. Copy its root `koi` library file into your project, replacing `/path/to/your-project` with your project's directory:

```bash
cp koi/koi /path/to/your-project/koi
```

Then source `koi` in your script:

```bash
source ./koi
```

Use `source ./koi` instead of `source koi` because the file is not on your `PATH`. The `./` path is relative to your current working directory.

## Older Bash versions

If you're stuck on macOS's default `/bin/bash`, which is Bash 3.2, there is an older version of koi that was written for 3.2 compatibility (see [koi 1.2.1](https://github.com/wcarhart/koi/releases/tag/v1.2.1)). However, note that this version of koi is quite different from the latest 2.x+. More specifically, the API for `koi::add_arg` and `koi::parse` is quite different (`__addarg` and `__parseargs`, respectively), control flow depended on `set -e`, and there were some sketchy `eval` shenanigans, among other differences. 1.x is no longer supported so please use at your own risk, and please make sure you (or an agent) reads the [1.x code](https://github.com/wcarhart/koi/blob/8d030a8a43b71072c7ff3e932cf260aa7b7e00da/koi) before you use it.

The reason koi requires a more modern version of Bash than 3.2 is it relies on modern Bash features like associative arrays (`declare -A`) and namerefs (`local -n`) in order to read argument values into Bash variables.
