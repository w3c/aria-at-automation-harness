# aria-at-automation-harness

A command-line utility for executing test plans from [w3c/aria-at](https://github.com/w3c/aria-at) without human intervention using [the aria-at-automation-driver](https://github.com/bocoup/aria-at-automation-driver)

**[aria-at-automation](https://github.com/bocoup/aria-at-automation)** &middot; aria-at-automation-harness &middot; [aria-at-automation-driver](https://github.com/bocoup/aria-at-automation-driver) &middot; [aria-at-automation-results-viewer](https://github.com/bocoup/aria-at-automation-results-viewer)

## Tools

- `aria-at-harness-agent` - run tests individually read from an input stream
- `aria-at-harness-host` - run a test plan, a collection of reference files and test files, read from a client
- `aria-at-harness-client` - (coming soon) read a test plan from disk, run it in a host, report result to aria-at-app

## `aria-at-harness-agent`

```
$ bin/agent.js --help
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
  --show-hidden         Show hidden options                            [boolean]
```

## `aria-at-harness-host`

```
$ bin/host.js run-plan --help
host.js run-plan [plan-files..]

Run test plans

Positionals:
  plan-files  Files in a test plan                         [array] [default: []]

Options:
  --help             Show help                                         [boolean]
  --version          Show version number                               [boolean]
  --quiet            Disable all logging
  --debug            Enable all logging
  --verbose          Enable a subset of logging messages
  --tests-match      Files matching pattern in a test plan will be tested
                                          [string] [default: "{,**/}test*.json"]
  --plan-workingdir  Directory "plan-files" are relative to
                                                         [string] [default: "."]
  --show-hidden      Show hidden options                               [boolean]
```

---

### [aria-at-automation](https://github.com/bocoup/aria-at-automation)

A collection of projects for automating assistive technology tests from [w3c/aria-at](https://github.com/w3c/aria-at) and beyond

**aria-at-automation-harness**  
A command-line utility for executing test plans from [w3c/aria-at](https://github.com/w3c/aria-at) without human intervention using [the aria-at-automation-driver](https://github.com/bocoup/aria-at-automation-driver)

**[aria-at-automation-driver](https://github.com/bocoup/aria-at-automation-driver)**  
A WebSocket server which allows clients to observe the text enunciated by a screen reader and to simulate user input

**[aria-at-automation-results-viewer](https://github.com/bocoup/aria-at-automation-results-viewer)**  
A tool which translates the JSON-formatted data produced by the [aria-at-automation-harness](https://github.com/bocoup/aria-at-automation-harness) into a human-readable form
