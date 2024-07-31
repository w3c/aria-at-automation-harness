# aria-at-automation-harness

A command-line utility for executing test plans from [w3c/aria-at](https://github.com/w3c/aria-at). It operates by communicating with an [AT Driver](https://github.com/w3c/at-driver) server and (in some environments) a [WebDriver](https://github.com/w3c/webdriver) server.

**[aria-at-automation](https://github.com/w3c/aria-at-automation)** &middot; aria-at-automation-harness &middot; [aria-at-automation-driver](https://github.com/w3c/aria-at-automation-driver) &middot; [aria-at-automation-results-viewer](https://github.com/w3c/aria-at-automation-results-viewer)

## Usage instructions

### Installation

1. Install the software under test
   - an assistive technology (currently limited to [the NVDA screen reader](https://www.nvaccess.org/about-nvda/) and [the VoiceOver screenreader](https://www.apple.com/accessibility/vision/))
   - an [AT Driver](https://w3c.github.io/at-driver/) server for the assistive technology under test (e.g. [the NVDA AT Driver server](https://github.com/Prime-Access-Consulting/nvda-at-automation/) for NVDA or [macOS AT Driver server](https://github.com/bocoup/at-driver-servers) for VoiceOver)
   - a web browser (e.g. [Mozilla Firefox](https://mozilla.org/firefox), [Google Chrome](https://www.google.com/chrome/index.html), or [Apple Safari](https://www.apple.com/safari/))
   - a WebDriver server for the browser under test (e.g. [GeckoDriver](https://github.com/mozilla/geckodriver) for Firefox or [ChromeDriver](https://developer.chrome.com/docs/chromedriver/downloads) for Chrome--this project does not currently require SafariDriver to test Safari)
2. Install [Node.js](https://nodejs.org)
3. Download ARIA-AT and build the tests:
   ```
   $ git clone https://github.com/w3c/aria-at
   $ cd aria-at && npm install && npm run build
   ```
4. Download this project's source code and install its dependencies:
   ```
   $ git clone https://github.com/w3c/aria-at-automation-harness.git
   $ cd aria-at-automation-harness && npm install
   ```

### Environment configuration

1. Run the AT Driver server for the assistive technology under test
2. Run the appropriate WebDriver server (if testing with Firefox or Chrome)
3. Run the assistive technology under test

### Execution

With the required software in place and the environment correctly configured,
the `host.js` command-line application can be used to run ARIA-AT test plans.
Execute the following command to review the available arguments:

```
$ bin/host.js run-plan --help --show-hidden
```

For example, to run ARIA-AT's "Horizontal slider" test plan using NVDA and
Firefox, execute the following command in a terminal:

```
$ node aria-at-automation-harness/bin/host.js run-plan \
    --plan-workingdir aria-at/build/tests/horizontal-slider \
    '{reference/**,test-*-nvda.*}' \
    --web-driver-url=http://127.0.0.1:4444 \
    --at-driver-url=ws://127.0.0.1:4382/session \
    --reference-hostname=127.0.0.1 \
    --web-driver-browser=firefox
```

## [aria-at-automation](https://github.com/w3c/aria-at-automation)

A collection of projects for automating assistive technology tests from [w3c/aria-at](https://github.com/w3c/aria-at) and beyond

**aria-at-automation-harness**  
A command-line utility for executing test plans from [w3c/aria-at](https://github.com/w3c/aria-at) without human intervention using [the aria-at-automation-driver](https://github.com/w3c/aria-at-automation-driver)

**[aria-at-automation-driver](https://github.com/w3c/aria-at-automation-driver)**  
A WebSocket server which allows clients to observe the text enunciated by a screen reader and to simulate user input

**[aria-at-automation-results-viewer](https://github.com/w3c/aria-at-automation-results-viewer)**  
A tool which translates the JSON-formatted data produced by the [aria-at-automation-harness](https://github.com/w3c/aria-at-automation-harness) into a human-readable form
