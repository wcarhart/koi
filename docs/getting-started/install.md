---
title: "Install koi"
description: "As simple as install + source"
layout: article
---

## Quick install

<!-- koi:install koi -->

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

> [!NOTE] Bash POSIX mode
> Koi cannot use Bash 5.2 in [POSIX mode](https://www.gnu.org/software/bash/manual/html_node/Bash-POSIX-Mode.html). POSIX mode in Bash 5.2 restricts the use of `::` in function names, so the namespaced function convention is not supported. Koi uses namespaced functions (e.g. `koi::parse`), which will fail in Bash 5.2 POSIX mode.
>
> If you're using Bash 5.2, don't run your shell via `bash --posix` or use `set -o posix` in your script if you'd like to use koi.
>
> Bash 5.3 [removed the POSIX mode restriction](https://lists.gnu.org/archive/html/bug-bash/2025-07/msg00005.html) on namespaced functions, so `::` is supported in function names. If you're using Bash 5.3, you can use koi in normal mode or POSIX mode.

## Manual install

Navigate to koi's [GitHub releases](https://github.com/wcarhart/koi/releases) and download the version of koi you want. Note that modern versions of koi are 2.x+. Take the single sourceable `koi` file from that release and place it in your project alongside your script. Source it in your script:

```bash
source ./koi
```

Use `source ./koi` instead of `source koi` because the file is not on your `PATH`. The `./` path is relative to your current working directory.

## Clone

Clone the repository and move its sourceable `koi` file wherever you want to use it, replacing `/path/to/your-project` with your project's directory:

```bash
git clone git@github.com:wcarhart/koi.git
mv koi/koi /path/to/your-project/koi
```

Then source `koi` in your script:

```bash
source ./koi
```

Use `source ./koi` instead of `source koi` because the file is not on your `PATH`. The `./` path is relative to your current working directory.

## Older Bash versions

If you're stuck on macOS's default `/bin/bash`, which is Bash 3.2, there is an older version of koi that was written for 3.2 compatibility (see [koi 1.2.1](https://github.com/wcarhart/koi/releases/tag/v1.2.1)). However, note that this version of koi is quite different from the latest 2.x+. More specifically, the API for `koi::add_arg` and `koi::parse` is quite different (`__addarg` and `__parseargs`, respectively), control flow depended on `set -e`, and there were some sketchy `eval` shenanigans, among other differences. 1.x is no longer supported so please use at your own risk, and please make sure you (or an agent) reads the [1.x code](https://github.com/wcarhart/koi/blob/8d030a8a43b71072c7ff3e932cf260aa7b7e00da/koi) before you use it.

The reason koi requires a more modern version of Bash than 3.2 is it relies on modern Bash features like associative arrays (`declare -A`) and namerefs (`local -n`) in order to read argument values into Bash variables.
