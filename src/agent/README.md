# `src/agent`

This directory implements the systems used by the `bin/agent.js` command line tool.

The agent tool can be invoked to perform tests from json files by piping them into agent. The result will be emitted out to the command's output stream.

```sh
$ cat at/test-1-jaws.collected.json | bin/agent.js >result.json
Starting...
Stopping...
```

Many tests can be piped in series to run each in serial order as they are received. Running tests in series, the output will be a stream of result json in the same order the tests are read from input.

```sh
$ cat at/test-*-jaws.collected.json | bin/agent.js >results.jsonstream
Starting...
Stopping...
```

Developing `bin/agent.js` you may want to use the mock test runner. Calling `agent.js` with `--mock` will enable the mock test runner.

```sh
$ cat at/test-*-jaws.collected.json | bin/agent.js --mock >results.jsonstream
...
```

## main command

```
$ bin/agent.js --help --show-hidden
agent.js

Run tests from input

Options:
  --help                Show help                                      [boolean]
  --version             Show version number                            [boolean]
  --quiet               Disable all logging
  --debug               Enable all logging
  --verbose             Enable a subset of logging messages
  --reference-base-url  Url to append reference page listed in tests to
                                     [string] [default: "http://localhost:8000"]
  --mock
  --protocol            Read tests from shell input or from parent nodejs proces
                        s messages
                          [string] [choices: "fork", "shell"] [default: "shell"]
```

### `--verbose` options

The main command's verbose level can be set with `--debug`, `--quiet`, or `--verbose`. `--verbose` takes a comma separate list of the following logging message types.

- `start`
- `uncaughtError`
- `willStop`
- `openPage`
