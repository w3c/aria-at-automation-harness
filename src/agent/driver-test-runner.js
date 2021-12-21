/// <reference path="../data/types.js" />
/// <reference path="../shared/types.js" />
/// <reference path="types.js" />

import { WebDriver, until, By } from 'selenium-webdriver';

import { startJob } from '../shared/job.js';

import { ATDriver, ATKey } from './at-driver.js';
import { AgentMessage } from './messages.js';

/**
 * @module agent
 */

const AFTER_NAVIGATION_DELAY = 1000;
const AFTER_KEYS_DELAY = 5000;
const AFTER_RUN_TEST_SETUP_BUTTON_DELAY = 500;
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
  }

  /**
   * @param {URL} url
   */
  async openPage({ url, referencePage }) {
    await this.log(AgentMessage.OPEN_PAGE, { url });
    await this.webDriver.switchTo().defaultContent();
    await this.webDriver.navigate().to(url.toString());

    try {
      const runTestSetup = await this.webDriver.wait(
        until.elementLocated(By.className('button-run-test-setup')),
        RUN_TEST_SETUP_BUTTON_TIMEOUT
      );
      await timeout(AFTER_RUN_TEST_SETUP_BUTTON_DELAY);
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

  /**
   * @param {AriaATFile.CollectedTest} test
   */
  async run(test) {
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

    return {
      testId: test.info.testId,
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

    let i = 0;
    do {
      i = spoken.length;
      await timeout(debounceDelay);
    } while (i < spoken.length);

    await speechJob.cancel();
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
  for (const { keystroke } of command.keypresses) {
    // Some old test plans have keys that contain indications of unspecified
    // instructions ('/') or additional instructions that are not standardized
    // in test plans. These keys should be updated to be separate commands or
    // use a standardized approach.
    if (/\//.test(keystroke)) {
      errors.push(`'${keystroke}' cannot contain '/'.`);
    }
    if (/[()]/.test(keystroke)) {
      errors.push(`'${keystroke}' cannot contain '(' or ')'.`);
    }
    if (/\bor\b/.test(keystroke)) {
      errors.push(`'${keystroke}' cannot contain 'or'.`);
    }
    if (/\bfollowed\b/.test(keystroke)) {
      errors.push(`'${keystroke}' cannot contain 'followed' or 'followed by'.`);
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
    ...command.keypresses.map(({ keystroke }) =>
      ATKey.chord(
        ...keystroke
          .split('+')
          .map(key => key.trim().toLowerCase())
          // `up arrow`, `down arrow`, etc are sent as `up`, `down`, etc
          .map(key => key.replace(/\s?arrow\s?/g, ''))
          // remove whitespace for keys like 'page up'
          .map(key => key.replace(/\s/g, ''))
          .map(key => ATKey.key(key))
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
