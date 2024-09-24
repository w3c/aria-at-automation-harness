/**
 * @module runner
 */

import { createSharedLogger } from '../shared/messages.js';

/** @enum {AriaATCIRunner.Message} */
export const RunnerMessage = {
  /** @type {'startTest'} */
  START_TEST: 'startTest',
  /** @type {'openPage'} */
  OPEN_PAGE: 'openPage',
  /** @type {'invalidKeys'} */
  INVALID_KEYS: 'invalidKeys',
  /** @type {'pressKeys'} */
  PRESS_KEYS: 'pressKeys',
  /** @type {'speechEvent'} */
  SPEECH_EVENT: 'speechEvent',
  /** @type {'noRunTestSetup'} */
  NO_RUN_TEST_SETUP: 'noRunTestSetup',
  /** @type {'atDriverComms'} */
  AT_DRIVER_COMMS: 'atDriverComms',
  /** @type {'capabilities'} */
  CAPABILITIES: 'capabilities',
};

export const RUNNER_TEMPLATES = {
  [RunnerMessage.START_TEST]: ({ id, title }) => `Starting test #${id} '${title}'.`,
  [RunnerMessage.OPEN_PAGE]: ({ url }) => `Open page: '${url}'.`,
  [RunnerMessage.INVALID_KEYS]: ({ command, errors }) =>
    `Keys in '${command.id}' have issues:\n${errors.map(error => `- ${error}`).join('\n')}`,
  [RunnerMessage.PRESS_KEYS]: ({ keys }) => `Press keys: '${keys.toString()}'.`,
  [RunnerMessage.SPEECH_EVENT]: ({ spokenText }) => `Speech event: '${spokenText}'.`,
  [RunnerMessage.NO_RUN_TEST_SETUP]: ({ referencePage }) =>
    `Test reference, ${referencePage}, does not have a Run Test Setup button.`,
  [RunnerMessage.AT_DRIVER_COMMS]: ({ direction, message }) =>
    `AT-Driver: ${direction}: ${message}`,
  [RunnerMessage.CAPABILITIES]: ({ capabilities }) =>
    `Capabilities: ${JSON.stringify(capabilities)}`,
};

export function createRunnerLogger(messages = RUNNER_TEMPLATES) {
  return createSharedLogger(messages);
}
