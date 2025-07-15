import { startJob } from '../shared/job.js';

import { ATKey, webDriverCodePoints } from './at-driver.js';
import { RunnerMessage } from './messages.js';

const ARIA_AT_TO_JAWS_CURSOR_SETTING_VALUE = new Map(
  Object.entries({
    virtualCursor: 'VPC',
    pcCursor: 'PC',
  })
);

/**
 * @module runner
 */

export const NVDASettingResponses = {
  browseMode: ['Browse mode'],
  focusMode: ['Focus mode'],
};

// Supports known setting responses up to macOS 15.4.1
export const VOSettingResponses = {
  quickNavOn: ['Quick nav on', 'All quick nav on'],
  quickNavOff: ['Quick nav off', 'All quick nav off'],
  singleKeyQuickNavOn: ['single-key quick nav on'],
  singleKeyQuickNavOff: ['single-key quick nav off'],
};

export const JAWSSettingResponses = {
  virtualCursor: ['use virtual PC cursor on'],
  pcCursor: ['use virtual PC cursor off'],
};

/**
 * @param {string} lastMessage
 * @param {string[]} desiredResponses
 */
export function isDesiredSettingResponse(lastMessage, desiredResponses) {
  return desiredResponses.map(r => r.toLowerCase()).includes(lastMessage.toLowerCase());
}

export class DriverTestRunner {
  /**
   * @param {object} options
   * @param {URL} options.baseUrl
   * @param {AriaATCIRunner.Log} options.log
   * @param {AriaATCIRunner.BrowserDriver} options.browserDriver
   * @param {import('./at-driver.js').ATDriver} options.atDriver
   * @param {AriaATCIShared.TimesOption} options.timesOption
   */
  constructor({ baseUrl, log, browserDriver, atDriver, timesOption }) {
    this.baseUrl = baseUrl;
    this.log = log;
    this.browserDriver = browserDriver;
    this.atDriver = atDriver;
    this.collectedCapabilities = this.getCapabilities();
    this.timesOption = timesOption;
  }

  async getCapabilities() {
    const { browserName, browserVersion } = await this.browserDriver.getCapabilities();
    const { atName, atVersion, platformName } = await this.atDriver.getCapabilities();
    return { atName, atVersion, browserName, browserVersion, platformName };
  }

  /**
   * @param {object} options
   * @param {URL} options.url
   * @param {string} options.referencePage
   */
  async openPage({ url, referencePage }) {
    await this.log(RunnerMessage.OPEN_PAGE, { url });
    await this.browserDriver.navigate(url.toString());

    await this.browserDriver.documentReady();

    try {
      await this.browserDriver.clickWhenPresent(
        '.button-run-test-setup',
        this.timesOption.testSetup
      );
    } catch {
      await this.log(RunnerMessage.NO_RUN_TEST_SETUP, { referencePage });
    }
  }

  /**
   * @param {import('./at-driver.js').ATKeySequence} sequence
   */
  async sendKeys(sequence) {
    await this.log(RunnerMessage.PRESS_KEYS, { keys: sequence });
    await this.atDriver.sendKeys(sequence);
  }

  /**
   * @param {import('./at-driver.js').ATKeySequence} sequence
   * @param {string[]} desiredResponses
   */
  async pressKeysToToggleSetting(sequence, desiredResponses) {
    let unknownCollected = '';
    // Although the settings currently supported only have two states, it is
    // possible that the harness receives a non-empty response before the
    // system is correctly responding to settings-related commands (see the
    // explanation of `silenceAllowance`, below). Tolerate one additional
    // unexpected response to accommodate this condition.
    let unexpectedAllowance = 3;
    // The browser has been observed to be unavailable for keyboard interaction
    // for many seconds following the resolution of the "new session" WebDriver
    // command (and even the subsequent "document ready" event from the active
    // browsing context). In this state, some screen readers may ignore commands
    // to modify some settings. (Specifically, this situation has been observed
    // with NVDA's "mode switch" command when using the Chrome browser.)
    //
    // Handle this situation gracefully by tolerating silence from the command
    // for a large number of trials.
    let silenceAllowance = 20;

    while (silenceAllowance > 0 && unexpectedAllowance > 0) {
      const speechResponse = await this._collectSpeech(this.timesOption.modeSwitch, () =>
        this.sendKeys(sequence)
      );

      if (speechResponse.length === 0) {
        silenceAllowance--;
      } else {
        unexpectedAllowance--;
        silenceAllowance = 1;
      }

      while (speechResponse.length) {
        const lastMessage = speechResponse.shift().trim();
        if (isDesiredSettingResponse(lastMessage, desiredResponses)) {
          return;
        }

        if (unknownCollected.length) unknownCollected += '\n';
        unknownCollected += lastMessage;
      }
    }
    throw new Error(
      `Unable to apply setting. Expected: One of "${desiredResponses}" Got: "${unknownCollected}"`
    );
  }

  /**
   * Used for v2 tests to ensure proper settings.
   *
   * @param {string} settings - space seperated list of settings. "browseMode", "focusMode" for NVDA,
                                "quickNavOn", "defaultMode", etc for VoiceOver.
   */
  async ensureSettings(settings) {
    const { atName } = await this.collectedCapabilities;
    // break up the space-separated settings into an array so we can iterate over it
    const settingsArray = settings.split(' ');

    if (atName == 'NVDA') {
      // disable the "beeps" when switching focus/browse mode, forces it to speak the mode after switching
      await this.atDriver._send({
        method: 'nvda:settings.setSettings',
        params: { settings: [{ name: 'virtualBuffers.passThroughAudioIndication', value: false }] },
      });

      try {
        for (const setting of settingsArray) {
          switch (setting.toLowerCase()) {
            case 'browsemode':
              await this.pressKeysToToggleSetting(
                ATKey.sequence(ATKey.chord(ATKey.key('insert'), ATKey.key('space'))),
                NVDASettingResponses.browseMode
              );
              break;
            case 'focusmode':
              await this.pressKeysToToggleSetting(
                ATKey.sequence(ATKey.chord(ATKey.key('insert'), ATKey.key('space'))),
                NVDASettingResponses.focusMode
              );
              break;
            default:
              throw new Error(`Unknown command settings for NVDA "${setting}"`);
          }
        }
      } finally {
        // turn the "beeps" back on so mode switches won't be spoken (default setting)
        await this.atDriver._send({
          method: 'nvda:settings.setSettings',
          params: {
            settings: [{ name: 'virtualBuffers.passThroughAudioIndication', value: true }],
          },
        });
      }
    } else if (atName == 'JAWS') {
      for (const setting of settingsArray) {
        const value = ARIA_AT_TO_JAWS_CURSOR_SETTING_VALUE.get(setting);

        if (!value) {
          throw new Error(`Unknown command setting for JAWS "${setting}"`);
        }

        // Two "setSettings" commands are needed to safely bring JAWS to a
        // known state. This is because JAWS does not vocalize a response to
        // set a setting which is already in effect. This presents a problem
        // for the harness because it must consume all state-related
        // vocalizations so that they do not leak into the output collected by
        // whatever test is to follow. By setting the *undesired* value
        // followed by the desired value, the harness can deterministically
        // consume all such vocalizations.
        //
        // When JAWS supports the "getSettings" command, this logic should be
        // simplified to first check the current state and only issue a
        // "setSettings" command (for the desired value) when necessary.
        //
        // https://github.com/w3c/aria-at-automation-harness/issues/91
        await this.atDriver._send({
          method: 'settings.setSettings',
          params: {
            settings: [
              {
                name: 'cursor',
                value: ARIA_AT_TO_JAWS_CURSOR_SETTING_VALUE.get(
                  setting == 'virtualCursor' ? 'pcCursor' : 'virtualCursor'
                ),
              },
            ],
          },
        });

        let unknownCollected = '';
        const speechResponse = await this._collectSpeech(this.timesOption.modeSwitch, () =>
          this.atDriver._send({
            method: 'settings.setSettings',
            params: {
              settings: [{ name: 'cursor', value }],
            },
          })
        );
        while (speechResponse.length) {
          const lastMessage = speechResponse.shift().trim();
          if (isDesiredSettingResponse(lastMessage, JAWSSettingResponses[setting])) {
            return;
          }

          if (unknownCollected.length) unknownCollected += '\n';
          unknownCollected += lastMessage;
        }
        throw new Error(
          `Unable to apply setting. Expected one of "${JAWSSettingResponses[setting]}" got "${unknownCollected}"`
        );
      }
    } else if (atName == 'VoiceOver') {
      for (const setting of settingsArray) {
        switch (setting) {
          case 'quickNavOn':
          case 'arrowQuickKeyNavOn':
            await this.pressKeysToToggleSetting(
              ATKey.sequence(ATKey.chord(ATKey.key('left'), ATKey.key('right'))),
              VOSettingResponses.quickNavOn
            );
            break;
          case 'quickNavOff':
          case 'arrowQuickKeyNavOff':
            await this.pressKeysToToggleSetting(
              ATKey.sequence(ATKey.chord(ATKey.key('left'), ATKey.key('right'))),
              VOSettingResponses.quickNavOn
            );
            break;
          case 'singleQuickKeyNavOn':
            await this.pressKeysToToggleSetting(
              ATKey.sequence(
                ATKey.chord(ATKey.key('control'), ATKey.key('option'), ATKey.key('q'))
              ),
              VOSettingResponses.singleKeyQuickNavOn
            );
            break;
          case 'singleQuickKeyNavOff':
            await this.pressKeysToToggleSetting(
              ATKey.sequence(
                ATKey.chord(ATKey.key('control'), ATKey.key('option'), ATKey.key('q'))
              ),
              VOSettingResponses.singleKeyQuickOff
            );
            break;
          case 'defaultMode':
            // nothing to do here
            break;
          default:
            throw new Error(`Unrecognized setting for VoiceOver: ${setting}`);
        }
      }
      return;
    } else if (!atName) {
      return;
    } else {
      throw new Error(`Unable to ensure proper settings. Unknown atName ${atName}`);
    }
  }

  /**
   * Used for v1 aria-at tests, "reading" and "interaction" map to various settings based on AT.
   * @param {"reading" | "interaction"} mode
   */
  async ensureMode(mode) {
    const { atName } = await this.collectedCapabilities;
    if (atName === 'NVDA') {
      await this.ensureSettings(mode.toLowerCase() === 'reading' ? 'browseMode' : 'focusMode');
      return;
    } else if (atName === 'JAWS') {
      await this.ensureSettings(mode.toLowerCase() === 'reading' ? 'virtualCursor' : 'pcCursor');
      return;
    } else if (atName === 'VoiceOver') {
      return;
    } else if (!atName) {
      return;
    }
    throw new Error(`Unable to ensure proper mode. Unknown atName ${atName}`);
  }

  /**
   * @param {AriaATCIData.CollectedTest} test
   */
  async run(test) {
    const capabilities = await this.collectedCapabilities;
    await this.log(RunnerMessage.CAPABILITIES, { capabilities });

    await this.log(RunnerMessage.START_TEST, { id: test.info.testId, title: test.info.task });

    await this.log(RunnerMessage.OPEN_PAGE, { url: 'about:blank' });
    await this.browserDriver.navigate('about:blank');

    const commandsOutput = [];

    for (const command of test.commands) {
      const { value: validCommand, errors } = validateKeysFromCommand(command);
      const assertions = test.assertions.map(assertion => {
        return {
          expectation: assertion.expectation || assertion.assertionStatement,
          verdict: null,
        };
      });
      if (validCommand) {
        await this._collectSpeech(this.timesOption.afterNav, () =>
          this.openPage({
            url: this._appendBaseUrl(test.target.referencePage),
            referencePage: test.target.referencePage,
          })
        );

        if (command.settings) {
          // Ensure AT is in proper mode for tests.  V2 tests define "settings" per command.
          await this.ensureSettings(command.settings);
        } else if (test.target?.mode) {
          // V1 tests define a "mode" of "reading" or "interaction" on the test.target
          await this.ensureMode(test.target.mode);
        }

        const spokenOutput = await this._collectSpeech(this.timesOption.afterKeys, () =>
          this.sendKeys(atKeysFromCommand(validCommand))
        );

        await this._collectSpeech(this.timesOption.afterNav, async () => {
          await this.log(RunnerMessage.OPEN_PAGE, { url: 'about:blank' });
          await this.browserDriver.navigate('about:blank');
        });

        commandsOutput.push({
          command: command.id,
          response: spokenOutput.join('\n'),
          assertions,
        });
      } else {
        await this.log(RunnerMessage.INVALID_KEYS, { command, errors });

        commandsOutput.push({
          command: command.id,
          errors,
          assertions,
        });
      }
    }

    const { testId, presentationNumber } = test.info;

    return {
      testId,
      presentationNumber,
      capabilities,
      commands: commandsOutput,
    };
  }

  /**
   * @param {number} debounceDelay
   * @param {function(): Promise<void>} asyncOperation
   * @returns {Promise<string[]>}
   */
  async _collectSpeech(debounceDelay, asyncOperation) {
    let spoken = [];
    const isJAWS = (await this.collectedCapabilities).atName == 'JAWS';

    const speechJob = startJob(async signal => {
      for await (let speech of signal.cancelable(this.atDriver.speeches())) {
        if (isJAWS) {
          // temporary workaround to double-escaped string literals.
          // see https://github.com/w3c/aria-at-automation-harness/issues/90
          speech = JSON.parse(`"${speech}"`);
        }
        spoken.push(speech);
        this.log(RunnerMessage.SPEECH_EVENT, { spokenText: speech });
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
    const newPath = `${this.baseUrl.pathname ? `${this.baseUrl.pathname}/` : ''}${pathname}`;
    return new URL(newPath, this.baseUrl.toString());
  }
}

export function validateKeysFromCommand(command) {
  const errors = [];
  for (let { id } of command.keypresses) {
    id = id
      // PAGE_DOWN and PAGE_UP are the only commands that have the extra _ inside a key
      .replace(/(PAGE)_(DOWN|UP)/, '$1$2')
      // + is used to connect keys that are pressed simultaneously in v2 tests
      .replace('+', '_')
      // `UP_ARROW`, `DOWN_ARROW`, etc are sent as `up`, `down`, etc
      .replace(/_ARROW/g, '');
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
    for (const part of id.split(/[_+,]/)) {
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
          .replace(/\+/g, '_') // + is used to connect keys that are pressed simultaneously in v2 tests
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
