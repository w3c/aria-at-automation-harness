/// <reference path="../data/types.js" />
/// <reference path="../shared/types.js" />
/// <reference path="types.js" />

import { WebDriver, until, By } from 'selenium-webdriver';

import { startJob } from '../shared/job.js';

import { ATDriver, ATKey, webDriverCodePoints } from './at-driver.js';
import { AgentMessage } from './messages.js';

/**
 * @module agent
 */

const AFTER_NAVIGATION_DELAY = 1000;
const AFTER_KEYS_DELAY = 5000;
const RUN_TEST_SETUP_BUTTON_TIMEOUT = 1000;

export class DriverTestRunner {
  /**
   * @param {object} options
   * @param {AriaATCIShared.BaseURL} options.baseUrl
   * @param {AriaATCIAgent.Log} options.log
   * @param {WebDriver} options.webDriver
   * @param {ATDriver} options.atDriver
   */
  constructor({ baseUrl, log, webDriver, atDriver }) {
    this.baseUrl = baseUrl;
    this.log = log;
    this.webDriver = webDriver;
    this.atDriver = atDriver;
    this.collectedCapabilities = this.getCapabilities();
  }

  async getCapabilities() {
    const capabilities = await this.webDriver.getCapabilities();
    const browserName = capabilities.get('browserName');
    const browserVersion = capabilities.get('browserVersion');
    const { atName, atVersion, platformName } = await this.atDriver.getCapabilities();
    return { atName, atVersion, browserName, browserVersion, platformName };
  }

  /**
   * @param {URL} url
   */
  async openPage({ url, referencePage }) {
    await this.log(AgentMessage.OPEN_PAGE, { url });
    await this.webDriver.switchTo().defaultContent();
    // Minimizing then restoring the window is recommended to trick the window
    // manager on the OS to put focus in the browser. This is needed to
    // steal focus away from a terminal/powershell tab if you launch the tests
    // locally.
    await this.webDriver.manage().window().minimize();
    await this.webDriver.manage().window().setRect({ x: 0, y: 0 });
    await this.webDriver.switchTo().defaultContent();
    await this.webDriver.navigate().to(url.toString());

    try {
      await this.webDriver.executeAsyncScript(function (callback) {
        if (document.readyState === 'complete') {
          callback();
        } else {
          new Promise(resolve => {
            window.addEventListener('load', () => resolve());
          })
            // Wait until after any microtasks registered by other 'load' event
            // handlers.
            .then(() => Promise.resolve())
            .then(callback);
        }
      });

      const runTestSetup = await this.webDriver.wait(
        until.elementLocated(By.className('button-run-test-setup')),
        RUN_TEST_SETUP_BUTTON_TIMEOUT
      );

      await runTestSetup.click();
    } catch ({}) {
      await this.log(AgentMessage.NO_RUN_TEST_SETUP, { referencePage });
    }
  }

  /**
   * @param {ATKeySequence} sequence
   */
  async sendKeys(sequence) {
    await this.log(AgentMessage.PRESS_KEYS, { keys: sequence });
    await this.atDriver.sendKeys(sequence);
  }

  async ensureMode(mode) {
    const capabilities = await this.collectedCapabilities;
    if (capabilities.atName == 'NVDA') {
      const desiredResponse = mode === 'reading' ? 'Browse mode' : 'Focus mode';
      const MODE_SWITCH_SPEECH_TIMEOUT = 500;
      let speechResponse;
      for (let triesRemain = 2; triesRemain > 0; triesRemain--) {
        speechResponse = await this._collectSpeech(MODE_SWITCH_SPEECH_TIMEOUT, () =>
          this.sendKeys(ATKey.sequence(ATKey.chord(ATKey.key('insert'), ATKey.key('space'))))
        );
        speechResponse = speechResponse.join(' ').replace(/^\s+|\s+$/g, '');
        if (speechResponse === desiredResponse) return;
      }
      this.log(AgentMessage.AT_DRIVER_COMMS, {
        direction: 'modeSwitch',
        message: `Unable to ensure proper mode ${desiredResponse} ${speechResponse}`,
      });
    }
  }

  /**
   * @param {AriaATFile.CollectedTest} test
   */
  async run(test) {
    const capabilities = await this.collectedCapabilities;
    await this.log(AgentMessage.CAPABILITIES, { capabilities });

    await this.log(AgentMessage.START_TEST, { id: test.info.testId, title: test.info.task });

    await this.log(AgentMessage.OPEN_PAGE, { url: 'about:blank' });
    await this.webDriver.navigate().to('about:blank');

    const commandsOutput = [];
    const results = [];

    for (const command of test.commands) {
      const { value: validCommand, errors } = validateKeysFromCommand(command);

      if (validCommand) {
        await this._collectSpeech(AFTER_NAVIGATION_DELAY, () =>
          this.openPage({
            url: this._appendBaseUrl(test.target.referencePage),
            referencePage: test.target.referencePage,
          })
        );

        if (test.target?.mode) {
          await this.ensureMode(test.target.mode);
        }

        const spokenOutput = await this._collectSpeech(AFTER_KEYS_DELAY, () =>
          this.sendKeys(atKeysFromCommand(validCommand))
        );

        await this._collectSpeech(AFTER_NAVIGATION_DELAY, async () => {
          await this.log(AgentMessage.OPEN_PAGE, { url: 'about:blank' });
          await this.webDriver.navigate().to('about:blank');
        });

        commandsOutput.push({
          command: command.id,
          output: spokenOutput.join('\n'),
        });

        for (const assertion of test.assertions) {
          results.push({
            command: command.id,
            expectation: assertion.expectation,
            pass: true,
          });
        }
      } else {
        await this.log(AgentMessage.INVALID_KEYS, { command, errors });

        commandsOutput.push({
          command: command.id,
          errors,
        });

        for (const assertion of test.assertions) {
          results.push({
            command: command.id,
            expectation: assertion.expectation,
            pass: false,
          });
        }
      }
    }

    const testId = test.info.testId;

    return {
      testId,
      capabilities,
      commands: commandsOutput,
      results,
    };
  }

  /**
   * @param {number} debounceDelay
   * @param {function(): Promise<void>} asyncOperation
   * @returns {Promise<string[]>}
   */
  async _collectSpeech(debounceDelay, asyncOperation) {
    let spoken = [];
    const speechJob = startJob(async signal => {
      for await (const speech of signal.cancelable(this.atDriver.speeches())) {
        spoken.push(speech);
        this.log(AgentMessage.SPEECH_EVENT, { spokenText: speech });
      }
    });

    await asyncOperation();
    // this.log(AgentMessage.DEBUG, {msg: '_collectSpeech - operation completed'});

    let i = 0;
    do {
      i = spoken.length;
      // this.log(AgentMessage.DEBUG, {msg: `collected ${i} speech events so far - delay ${debounceDelay}`});
      await timeout(debounceDelay);
    } while (i < spoken.length);

    // this.log(AgentMessage.DEBUG, {msg: 'canceling speech job'});
    await speechJob.cancel();
    // this.log(AgentMessage.DEBUG, {msg: 'done collecting speech'});
    return spoken;
  }

  _appendBaseUrl(pathname) {
    return new URL(
      `${this.baseUrl.pathname ? `${this.baseUrl.pathname}/` : ''}${pathname}`,
      this.baseUrl
    );
  }
}

export function validateKeysFromCommand(command) {
  const errors = [];
  for (let { id } of command.keypresses) {
    // PAGE_DOWN and PAGE_UP are the only commands that have the extra _ inside a key
    id = id.replace(/(PAGE)_(DOWN|UP)/, '$1$2');
    if (/\//.test(id)) {
      errors.push(`'${id}' cannot contain '/'.`);
    }
    if (/[()]/.test(id)) {
      errors.push(`'${id}' cannot contain '(' or ')'.`);
    }
    if (/\bor\b/.test(id)) {
      errors.push(`'${id}' cannot contain 'or'.`);
    }
    if (/\bfollowed\b/.test(id)) {
      errors.push(`'${id}' cannot contain 'followed' or 'followed by'.`);
    }
    for (const part of id.split('_')) {
      // Some old test plans have keys that contain indications of unspecified
      // instructions ('/') or additional instructions that are not standardized
      // in test plans. These keys should be updated to be separate commands or
      // use a standardized approach.

      if (part.length != 1 && !webDriverCodePoints[part.toUpperCase()]) {
        errors.push(
          `'${part}' of '${id}' is not a recognized key - use single characters or "Normalized" values from https://w3c.github.io/webdriver/#keyboard-actions`
        );
      }
    }
  }

  if (errors.length > 0) {
    return { errors };
  }
  return { value: command };
}

/**
 * @param {CommandKeystroke} command
 */
export function atKeysFromCommand(command) {
  return ATKey.sequence(
    ...command.keypresses.map(({ id }) =>
      ATKey.chord(
        ...id
          .replace(/(PAGE)_(DOWN|UP)/, '$1$2')
          .split('_')
          .map(key => key.trim().toLowerCase())
          // `up arrow`, `down arrow`, etc are sent as `up`, `down`, etc
          .map(key => key.replace(/\s?arrow\s?/g, ''))
          // remove whitespace for keys like 'page up'
          .map(key => key.replace(/\s/g, ''))
          .map(key => ATKey.key(key.toLowerCase()))
      )
    )
  );
}

async function timeout(delay) {
  await new Promise(resolve => setTimeout(resolve, delay));
}

/**
 * @typedef CommandKeystroke
 * @property {string} id
 * @property {string} keystroke
 * @property {object[]} keypresses
 * @property {string} keypresses.id
 * @property {string} keypresses.keystroke
 */
