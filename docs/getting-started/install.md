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

If you're stuck on macOS's default `/bin/bash`, which is Bash 3.2, there is an older version of koi that was written for 3.2 compatibility. See [1.2.1](https://github.com/wcarhart/koi/releases/tag/v1.2.1). However, note that this version of koi is quite different from the latest 2.x+. More specifically, the API for `__addarg` and `__parseargs` is different, control flow depended on `set -e`, and there were some sketchy `eval` shenanigans, among other differences. 1.x is no longer supported so please use at your own risk, and please make sure you (or an agent) reads the 1.x code before you use it.

The reason koi requires a more modern version of Bash than 3.2 is it relies on modern Bash features like associative arrays (`declare -A`) and namerefs (`local -n`) in order to read argument values into Bash variables.
