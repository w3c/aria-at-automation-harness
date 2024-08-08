# src/host

This directory implements the systems used by the `bin/host.js` command line tool.

The `bin/host.js` tool has two commands. The `run-plan` command operates a server to run test plans and the `read-plan` command reads files from disk and packages them for the `run-plan` command.

A short invocation of the `run-plan` command can be made with a list of files or file globs that make up a test plan. A test plan should contain tests for a single assistive technology to be tested. If for example all the reference files and test files are in two directories this command could be executed.

```sh
$ bin/host.js run-plan reference/** at/** >result.json
Starting...
Reference server listening on 'http://localhost:52147'.
Reference available on 'http://localhost:52147/gtmoyv'.
Removing reference from 'http://localhost:52147/gtmoyv'.
Stopping...
```

Developing `bin/host.js` you may want to use the mock test runner. Calling `host.js` with `--runner-mock` will enable the mock test runner.

```sh
$ bin/host.js run-plan --runner-mock reference/** at/** >result.json
...
```

The mock test runner will be removed in the near future and replaced with the ability to create a mock server that can be more tailored to individual mock use cases.

## "main" command

The `host` loads test plans, serves their files from a http server, runs each test, and reports the collected results for each test plan.

1. Start a server listening on a port
1. Read a test plan from disk or input stream
1. Add test plan files to a subdirectory on the server
1. Run each test in the test plan
1. Emit the results of the test in a json format
1. If reading plans from stream, repeat from step 2
1. Stop the server
1. Gracefully exit

### Loading a test plan

`bin/host.js` can load a test plan through the `read-plan` command (or developer
interface) with `src/host/plan-from.js`. For convenience the `run-plan` command
takes arguments prefixed with `plan` that map to arguments that can be passed to
`read-plan`, to read a plan.

### `--verbose` options

The main command's verbose level can be set with `--debug`, `--quiet`, or `--verbose`. `--verbose` takes a comma separate list of the following logging message types.

- `start`
- `uncaughtError`
- `willStop`
- `startServer`
- `planRead`
- `serverListening`
- `stopServer`
- `addServerDirectory`
- `removeServerDirectory`
- `serverLog`
- `startAgent`
- `agentProtocol`
- `stopAgent`
- `agentLog`
- `agentCrashed`
- `startTest`

## `plan` command

```
host.js read-plan <files..>

Options:
  --help        Show help                                              [boolean]
  --version     Show version number                                    [boolean]
  --workingdir  Directory to read files from             [string] [default: "."]
```
