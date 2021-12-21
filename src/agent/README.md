# `src/agent`

This directory implements the systems used by the `bin/agent.js` command line tool.

At this time invoking this command must be done from a nodejs process with child_process.fork. A developer tool may be provided soon to read a single test file run `agent` and write the result to console output.

```sh
$ bin/agent.js
agent.js

Run tests from input

Options:
...

Error: Currently, this command may only be used when launched by a nodejs child_process.fork call.
```

Developing with `bin/agent.js` you may want to use the mock test runner. Calling `agent.js` with `--mock` will enable the mock test runner. The mock test runner will be removed in the near future and replaced with the ability to create a mock server that can be more tailored to individual mock use cases.

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
  --mock                                                               [boolean]
  --mock-open-page                                  [choices: "request", "skip"]
```

Currently this command must be executed by a parent node process as a node fork child process.

### `--verbose` options

The main command's verbose level can be set with `--debug`, `--quiet`, or `--verbose`. `--verbose` takes a comma separate list of the following logging message types.

- `start`
- `uncaughtError`
- `willStop`
- `startTest`
- `openPage`
- `invalidKeys`
- `pressKeys`
- `speechEvent`
- `noRunTestSetup`
