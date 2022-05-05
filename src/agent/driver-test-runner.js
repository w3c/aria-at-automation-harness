/// <reference path="../data/types.js" />
/// <reference path="../shared/types.js" />
/// <reference path="types.js" />

import { refreshScreenReaderText } from 'assistive-webdriver';
import { By, until } from 'selenium-webdriver';

import { startJob } from '../shared/job.js';
import { iterateEmitter } from '../shared/iterate-emitter.js';

import { ATDriver, ATKey } from './at-driver.js';
import { AgentMessage } from './messages.js';

/**
 * @module agent
 */

const AFTER_NAVIGATION_DELAY = 1000;
const AFTER_KEYS_DELAY = 5000;
const AFTER_RUN_TEST_SETUP_BUTTON_DELAY = 500;
const RUN_TEST_SETUP_BUTTON_TIMEOUT = 1000;

// const AFTER_NAVIGATION_DELAY = 100;
// const AFTER_KEYS_DELAY = 100;
// const AFTER_RUN_TEST_SETUP_BUTTON_DELAY = 100;
// const RUN_TEST_SETUP_BUTTON_TIMEOUT = 100;

export class DriverTestRunner {
  /**
   * @param {object} options
   * @param {AriaATCIShared.BaseURL} options.baseUrl
   * @param {AriaATCIAgent.Log} options.log
   */
  constructor({ baseUrl, log, driver }) {
    this.baseUrl = baseUrl;
    this.log = log;
    this.driver = driver;
  }

  /**
   * @param {URL} url
   */
  async openPage({ url, referencePage }) {
    await this.log(AgentMessage.OPEN_PAGE, { url });
    await this.driver.get(url.toString());

    try {
      const runTestSetup = await this.driver.wait(
        until.elementsLocated(By.css('.button-run-test-setup'))
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

    for (const chord of sequences) {
      const actions = this.driver.actions();

      for (const { key } of chord) {
        actions.keyDown(Key[key]);
      }

      for (const { key } of Array.from(chord).reverse()) {
        actions.keyUp(Key[key]);
      }

      await actions.perform();
    }
  }

  /**
   * @param {AriaATFile.CollectedTest} test
   */
  async run(test) {
    await this.log(AgentMessage.START_TEST, { id: test.info.testId, title: test.info.task });

    await this.log(AgentMessage.OPEN_PAGE, { url: 'about:blank' });
    await this.driver.get('about:blank');

    const commandsOutput = [];
    const results = [];

    for (const command of test.commands) {
      const openPageSpeech = this._collectSpeech();
      await this.openPage({
        url: this._appendBaseUrl(test.target.referencePage),
        referencePage: test.target.referencePage,
      });
      await openPageSpeech.wait({ debounceDelay: AFTER_NAVIGATION_DELAY });

      const { value: validCommand, errors } = validateKeysFromCommand(command);

      if (validCommand) {
        const commandOutputSpeech = this._collectSpeech();
        await this.sendKeys(atKeysFromCommand(validCommand));
        const spokenOutput = await commandOutputSpeech.wait({ debounceDelay: AFTER_KEYS_DELAY });

        const clearSpeechJob = this._collectSpeech();
        await this.log(AgentMessage.OPEN_PAGE, { url: 'about:blank' });
        await this.driver.get('about:blank');
        await clearSpeechJob.wait({ debounceDelay: AFTER_NAVIGATION_DELAY });

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

  _collectSpeech() {
    let spoken = [];
    const speechJob = startJob(async signal => {
      const messages = (async function* () {
        while (true) {
          for (const text of await refreshScreenReaderText(this.driver)) {
            yield text;
          }
        }
      })();

      for await (const speech of signal.cancelable(messages)) {
        spoken.push(speech);
        this.log(AgentMessage.SPEECH_EVENT, { spokenText: speech });
      }
    });

    return {
      async wait({ debounceDelay }) {
        let i = 0;
        do {
          i = spoken.length;
          await timeout(debounceDelay);
        } while (i < spoken.length);

        await speechJob.cancel();
        return spoken;
      },
    };
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
    if (!(keystroke in Keys)) {
      errors.push(`Unrecognized key: "${keystroke}"`);
    }
  }

  if (errors.length > 0) {
    return { errors };
  }
  return { value: command };
}

const replaceDirection = (_, direction) => {
  return `Arrow${direction[0].toUpperCase()}${direction.slice(1).toLowerCase()}`;
};

/**
 * @param {CommandKeystroke} command
 */
export function atKeysFromCommand(command) {
  return ATKey.sequence(
    ...command.keypresses.map(({ keystroke }) =>
      ATKey.chord(
        ...keystroke
          .split('+')
          .map(key => key.trim())
          .map(key => (key.length === 1 ? key.toLowerCase() : key))
          // `up arrow`, `down arrow`, etc are sent as `ArrowUp`, `ArrowDown`, etc
          .map(key => key.replace(/([^\s]+)\s*arrow/gi, replaceDirection))
          // transform `up`, `down`, etc. to `ArrowUp`, `ArrowDown`, etc.
          .map(key => key.replace(/^(up|right|down|left)$/i, replaceDirection))
          // Tests written for macOS may reference the "Option" key, which
          // corresponds to the key named "Alt" on non-Apple hardware.
          .map(key => (key === 'Option' ? 'Alt' : key))
          .map(key => (key === 'Ctrl' ? 'ControlLeft' : key))
          // Tests written for macOS may reference the "Command" key, which
          // AssistiveWebdriver names "OSLeft" and "OSRight".
          .map(key => (key === 'Command' ? 'OSLeft' : key))
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
