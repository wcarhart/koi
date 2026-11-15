---
title: "Errors"
description: "How to configure error reporting with koi."
layout: article
---

Koi has two kinds of errors: [user error](/docs/reference/glossary#user-error) and [author error](/docs/reference/glossary#author-error). You can think of the difference similar to `4XX` and `5XX` errors in HTTP. User errors are errors that occur due to the user's incorrect usage of your koi-powered script. These happen when the user supplies arguments that don't match the script's interface, such as providing an unknown option or missing a required argument. Author errors occur when koi itself, not the script powered by koi, is used incorrectly. These are bugs in your script. Examples can be an invalid argument declaration or a nonexistant command handler.

When koi encounters an author error, it includes the text `koi` and the koi API function responsible for the error:

```text
koi: koi::add_arg: arrays cannot have defaults
```

You can't suppress or customize these errors, as you should treat them as bugs and fix them before finishing or releasing your code.

User errors on the other hand _are_ customizable. This allows you to brand your koi-powered script or CLI as you wish. Unconfigured, koi uses `koi` as the default user error prefix when they are encountered:

```text
koi: missing required argument: 'environment'
```

You can customize this prefix with [koi::config name](/docs/reference/config):

```bash
koi::config name yarf
```

The same missing argument now reports:

```text
yarf: missing required argument: 'environment'
```

The `name` applies to all user errors as well as what's used in the generated help menu. Both user and author errors print to `stderr` and return status `2`. See [parsing and control flow](/docs/concepts/control-flow) for how errors return through the parsing guard.
