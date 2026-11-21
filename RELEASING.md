# Releasing koi

1. Make sure CI passes for the commit you want to release.
2. Open [New release](https://github.com/wcarhart/koi/releases/new), create a `vMAJOR.MINOR.PATCH` tag such as `v2.0.5`, and select the target commit or branch.
3. Add release notes and publish a stable release. Mark it as the latest release if it should become the default version for new installs.
4. Check the **Publish release assets** workflow. It uploads the library, archive, and checksums, then commits the Homebrew formula update for the latest release. Wait for it to finish before announcing the release. If the workflow fails, fix the reported problem and use **Re-run jobs**.
