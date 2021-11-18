# src/host

This directory implements the systems used by the `bin/host.js` command line tool.

The `bin/host.js` tool has two commands. The main command operates a server and `bin/agent.js` instance to run test plans and the `plan` subcommand reads files from disk and packages them for the main command.

A short invocation of the main command can be made with a list of files or file globs that make up a test plan. A test plan should contain tests for a single assistive technology to be tested. If for example all the reference files and test files are in two directories this command could be executed.

```sh
$ bin/host.js reference/** at/** >result.json
Starting...
Reference server listening on 'http://localhost:52147'.
Reference available on 'http://localhost:52147/gtmoyv'.
Removing reference from 'http://localhost:52147/gtmoyv'.
Stopping...
```

Developing `bin/host.js` you may want to use the mock test runner in `bin/agent.js`. Calling `host.js` with `--agent-arg=--mock` will enable the mock test runner.

```sh
$ bin/host.js --agent-arg=--mock reference/** at/** >result.json
...
```

An advanced invocation combines the plan subcommand and main command by piping the output of multiple `bin/host.js plan` calls to the main command. The output will be a stream of json objects, one for each run plan.

```sh
$ plans=(
array> breadcrumb
array> checkbox
array> )
$ {for f in $plans; do bin/host.js plan --workingdir $f "reference/**" "at/**"; done} | bin/host.js >results.jsonstream
Starting...
Reference server listening on 'http://localhost:55981'.
Reference available on 'http://localhost:55981/5fsp6g'.
Removing reference from 'http://localhost:55981/5fsp6g'.
Reference available on 'http://localhost:55981/lh6a3f'.
Removing reference from 'http://localhost:55981/lh6a3f'.
Stopping...
```

## "main" command

The `host` loads test plans, serves their files from a http server, runs each test through an `agent` instance, and reports the collected results for each test plan.

1. Start a server listening on a port
1. Read a test plan from disk or input stream
1. Add test plan files to a subdirectory on the server
1. Start an `agent` instance
1. Run each test in the test plan through the `agent` instance
1. Stop the `agent` instance
1. Emit the results of the test in a json format
1. If reading plans from stream, repeat from step 2
1. Stop the server
1. Gracefully exit

```
$ bin/host.js --help --show-hidden
host.js [files..]

Run test plans

Positionals:
  files  Files in a test plan

Options:
  --help            Show help                                          [boolean]
  --version         Show version number                                [boolean]
  --quiet           Disable all logging
  --debug           Enable all logging
  --verbose         Enable a subset of logging messages
  --workingdir      Directory "files" are relative to    [string] [default: "."]
  --tests-match     Files matching pattern in a test plan will be tested
                                          [string] [default: "{,**/}test*.json"]
  --agent-arg                                                            [array]
  --agent-protocol   [choices: "fork", "shell", "api", "auto"] [default: "auto"]
  --plan-protocol
           [choices: "fork", "shell", "api", "stream", "auto"] [default: "auto"]
```

### Loading a test plan

`bin/host.js` can load a test plan through the `plan` command or api with `src/host/plan-from.js`. For convenience the main command takes the same arguments the plan command has and transparentlly uses the plan command to read a plan. For advanced usage the plan command can be used directly to store plans as a file on disk or piped together with other plans through standard input to run a series of plans.

### `bin/agent.js` communication

The host while managing an agent instance can operate it through the `bin/agent.js` tool or `src/agent/main.js` api.

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
$ bin/host.js plan --help --show-hidden
host.js plan <files..>

Options:
  --help        Show help                                              [boolean]
  --version     Show version number                                    [boolean]
  --workingdir  Directory to read files from             [string] [default: "."]
  --protocol    Emit test plan through nodejs fork api or stdout shell stream
                          [string] [choices: "fork", "shell"] [default: "shell"]
```
