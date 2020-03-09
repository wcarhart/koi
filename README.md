<p align="center"><img alt="koi logo" src="logo.png" /></p>

<h1 align="center">koi</h1>
<p align="center">Bashful argument parsing</p>

## Quick Examples
Easily add command line arguments for Bash functions! Inspired by Python's [argparse](https://docs.python.org/3/library/argparse.html).
```bash
function send_request {
    __addarg "-h" "--help" "help" "optional" "" "Send an HTTP request"
    __addarg "-m" "--method" "storevalue" "optional" "GET" "The HTTP method"
    __addarg "-u" "--url" "storevalue" "required" "" "The url of the HTTP request"
    __parseargs "$@"
    curl -X "$method" "$url"
}
```
For more examples, check the [`examples/`](https://github.com/wcarhart/koi/blob/master/examples/) folder.

For full documentation, see [Usage](#Usage) below.

## Installation
Install via Homebrew:
```bash
brew tap wcarhart/tools
brew install koi
```
Or, if you don't want to install `koi` globally, you can copy the `koi` script from this repository and source it in your script. Note that you'll have to provide the path to the `koi` script if it is not in the same directory as your script (e.g. `source ../koi`).

## Setup
To start using `koi`, simply source it at the top of your Bash script.
```bash
#!/bin/bash
source koi
```

Also at the top of your script, but below sourcing `koi`, you should override the `koiname` and `koidescription` variables. The values of `koiname` and `koidescription` get printed in error messages and help text. `koi` ships with default values if they are not set.
```bash
#!/bin/bash
source koi
koiname=nameofyourscript.sh
koidescription="A longer description of your script"
```

In addition, if you don't want the auto-generated help menu to contain colors, you can disable them with `koicolors`.
```bash
#!/bin/bash
koicolors=0
```

## Usage
To use `koi`, follow these steps:
<ol start="0">
  <li>Install <code>koi</code> and follow the instructions in <a href="#setup"><b>Setup</b></a> from above.</li>
  <li>Use <code>__addargs</code> to define arguments for each desired function.</li>
  <li>Use <code>__parseargs</code> to parse defined arguments for each desired function.</li>
  <li>Put <code>__koirun "$@"</code> at the bottom of your script to tell <code>koi</code> to run.</li>
</ol>

## Documentation
### Required Functions
`koi` uses three main functions for parsing command line arguments: `__addarg`, `__parseargs`, `__koirun`

<details>
<summary><a id="__addarg"><code>__addarg</code></a></summary>

### `__addarg`
**To add a parsable CLI argument to a Bash function, use the `__addarg` function. The `__addarg` function takes six arguments and sets up global variables based on validated command line inputs.**

```bash
__addarg short_option long_option action is_required default_value help_text
```
 * `short_option` - The short option for the argument, denoted with a dash followed by a letter (i.e. `-h`, `-A`). The short option is usually the first letter of the long option.
 * `long_option` - The long option for the argument, denoted with two dashes followed by a string of alphanumeric characters (i.e. `--help`, `--dir`, `--user`).
 * `action` - The action to take with this option. The supported actions are:
   * `storevalue` - store the value of the argument in a variable
   * `storearray` - store the value of the argument in an array (and append to the array if there are multiple values)
   * `filepath` - store the value of the argument in a variable and check that the value is a path to an existing file
   * `directorypath` - store the value of the argument in a variable and check that the value is a path to an existing directory
   * `flag` - store 1 (true) in a variable
   * `help` - display the help text
   * `exit` - exit the script
 * `is_required` - Whether or not the argument is required, must be either `required` or `optional`.
 * `default_value` - The default value for the argument, if the argument is optional.
 * `help_text` - The help text that is printed when the `-h` option is used.

**`__addarg` does not return anything, but rather sets up variables in the global scope that can be used. The name of the variable will match the argument's `long_option`, without the leading dashes.** Here's an example:
```bash
function mycoolfunction {
    __addarg "-o" "--outputdir" "directorypath" "required" "" "Path to the output directory"
    __parseargs "$@"
    echo "$outputdir"
}
```
A more comprehensive example of all arguments available with `koi` can be found in [`examples/koi_template`](https://github.com/wcarhart/koi/blob/master/examples/koi_template).
</details>

<details>
<summary><a id="__parseargs"><code>__parseargs</code></a></summary>

### `__parseargs`
**Once all arguments are added to a function with `__addarg`, `koi` parses the arguments with `__parseargs`. `__parseargs` takes in a list of command line arguments and parses them based on the arguments that have been added to the function with `__addarg`.**
```bash
__parseargs "$@"
```
Where `"$@"` is a list of arguments coming directly from the command line. `__parseargs` must be called after all `__addargs` statements and must include all of the command line arguments to be parsed.
</details>

<details>
<summary><a id="__koirun"><code>__koirun</code></a></summary>

### `__koirun`
**To actually run `koi`, use the `__koirun` function. Include `__koirun "$@"` as the last line in your script for `koi` to operate correctly.**
```bash
__koirun "$@"
```
All `__koirun` does is search for functions matching command line arguments and run them. This is the code for `__koirun`:
```bash
if declare -F -- "${1:-}" >/dev/null ; then
    "$@"
else
    __errortext "$koiname: err: no such command '$1'"
    __errortext "Use 'help' for available commands"
    exit 1
fi
```
</details>

### Available CLI commands
There are also two helpful CLI commands that are generated automatically: `help`, `list`

<details>
<summary><a id="help"><code>help</code></a></summary>

### `help`
**Prints a help menu for your script. The help menu is populated automatically based on the `-h` arguments that you add to your functions with `__addarg`.** You can call `help` three different ways:
```
$ ./nameofscript help
$ ./nameofscript -h
$ ./nameofscript --help
```
Functions whose names start with dashes (`-`) and underscores (`_`) will not appear in the help menu. You can name functions something like `__functionname` if you want to use the function in your script and don't want it to have any parsable arguments or appear in the help menu.

**If you do not include a `-h`/`--help` option with every *externally visible* function you write (functions that do not begin with a dash (`-`) or an underscore (`_`)), then the `help` command will not function properly.**

In the help messages, `(+)` means that the associated option is an array, meaning that you can specify multiple of the option (i.e. `myscript mycommand -a arg1 -a arg2 -a arg3`)

**Here's a sample menu generated by `koi`:**
```
$ ./examples/curl_examples help
Examples of potential curl commands you could make with koi

Usage:
  curl_example COMMAND [args]

Available commands:
  createuser
  help
  list
  run
  runmultiple
  show

Hints:
  curl_example help --verbose    Show complete command documentation
  curl_example COMMAND --help    Show individual command documentation

```
As the above hint mentions, you can view an individual command's documentation with `COMMAND --help`:
```
$ ./examples/curl_examples createuser --help
>> curl_example createuser
Create a new user
  -p, --port PORT   Port where server is running (optional) (default: 80)
  -u, --user USER   The name of the user to create 
```
Or, you can view the complete command documentation with `help --verbose`:
```
$ ./examples/curl_examples help --verbose
Examples of potential curl commands you could make with koi

Usage:
  curl_example COMMAND [args]

Available commands:
  createuser
  help
  list
  run
  runmultiple
  show

Command documentation:
>> curl_example createuser
Create a new user
  -p, --port PORT   Port where server is running (optional) (default: 80)
  -u, --user USER   The name of the user to create 

>> curl_example help
Show this menu and exit

>> curl_example list
List all available commands

>> curl_example run
Run a job/script on the server
  -p, --port PORT       Port where server is running (optional) (default: 80)
  -u, --user USER       Name of user 
  -f, --folder FOLDER   Name of folder where script is located 
  -s, --script SCRIPT   Name of script to run 

>> curl_example runmultiple
Run multiple jobs/scripts on the server
  -p, --port PORT         Port where server is running (optional) (default: 80)
  -u, --user USER         Name of user 
  -f, --folder FOLDER     Name of folder where script(s) is located 
  -s, --scripts SCRIPTS   (+) Name of script(s) to run 

>> curl_example show
List running jobs for a given user
  -p, --port PORT   Port where server is running (optional) (default: 80)
  -u, --user USER   Name of user
```
See the code for this example in [`examples/curl_examples`](https://github.com/wcarhart/koi/blob/master/examples/curl_example).

**In addition to providing a global `-h` flag, you can also use the `-h` flag for each function, provided it has a `-h`/`--help` argument defined.** For example, this is valid:
```bash
$ ./examples/curl_examples -h
```
And this is also valid:
```bash
$ ./examples/curl_examples run -h
```
</details>

<details>
<summary><a id="list"><code>list</code></a></summary>

### `list`
**Prints all of the available commands.** `list` will print all functions defined that do not start with a dash (`-`) or underscore (`_`). Functions that begin with dashes and underscores are interpreted as internal functions to `koi` and thus are not printed as commands available at the command line. Although they are not printed in `list` and `help`, you can still call them from the command line if you like.

**Here's an example of the output of `list`:**
```
$ ./examples/curl_examples list
createuser
help
list
run
runmultiple
show
```
See the code for this example in [`examples/curl_examples`](https://github.com/wcarhart/koi/blob/master/examples/curl_example).
</details>

### Additional Functions
In addition, `koi` provides a few hidden functions, if you want even more granular control. Using these functions is *not recommended*, except in advanced cases: `__cleararglists`, `__helptext`, `__errortext`, `__listfunctions`

<details>
<summary><a id="__cleararglists"><code>__cleararglists</code></a></summary>

### `__cleararglists`
`koi` uses a variety of argument lists to keep track of arguments. Due to these lists being defined in the global context, it can sometimes be helpful to clear them (one example of this is in the implementation of the `help` function). Calling `__cleararglists` will clear all of the argument lists.
</details>

<details>
<summary><a id="__helptext"><code>__helptext</code></a></summary>

### `__helptext`
`koi` autoformats the help text for each argument with a soft word wrap using the `__helptext` function. This is the code for `__helptext`:
```bash
echo -e "$@" | fold -w 100 -s
```
</details>

<details>
<summary><a id="__errortext"><code>__errortext</code></a></summary>

### `__errortext`
`koi` prints error messages to `stderr` using the `__errortext` function. This is the code for `__errortext`:
```bash
>&2 echo "$@"
```
</details>

<details>
<summary><a id="__listfunctions"><code>__listfunctions</code></a></summary>

### `__listfunctions`
`koi` lists the available commands via the `__listfunctions` function. The `__listfunctions` function lists all functions defined in the global context whose names do not begin with a dash (`-`) or an underscore (`_`). This is the code for `__listfunctions`:
```bash
functionlist=( `declare -F | sed -e 's/declare -f //g' -e 's/[_-].*//g'` )
for func in "${functionlist[@]}" ; do
    echo "$func"
done
```
</details>

## Examples
A few examples are located in the [`examples/`](https://github.com/wcarhart/koi/tree/master/examples) folder, with a template that shows all of the available argument options with `koi` (located in `examples/koi_template`).

## Caveats
Due to the fact that `koi` is written in Bash, its implementation comes with a few gotchas:
 * When `koi` defines a variable, **it is in the global scope.** Thus, if two different functions add a `--user` option and are called from one another, `koi` will malfunction. **You cannot have a function `f1` that calls function `f2` where both `f1` and `f2` parse command line inputs via `__addarg`.** *A better approach is to parse all command line arguments in `f1` and then have `f1` call `f2` (`f2` should not call `__addarg`).*
 * Because of the flexibility, and lack of protection, inherently built into Bash, the functions `koi` provides can all be overwritten if you don't like their implementation.

## Nomenclature
You may ask, why the name `koi`? Well, the original working name of the library was Bashful Arg Parser, which is a mouthful. This was shortened to Bashful, to which "coy" is a synonym. `koi` is a homophone of "coy" and thus was chosen as the name.
