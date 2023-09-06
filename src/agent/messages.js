/// <reference path="../shared/types.js" />
/// <reference path="types.js" />

/**
 * @module agent
 */

import { createSharedLogger } from '../shared/messages.js';

/** @enum {AriaATCIAgent.Message} */
export const AgentMessage = {
  /** @type {'start'} */
  START: 'start',
  /** @type {'uncaughtError'} */
  UNCAUGHT_ERROR: 'uncaughtError',
  /** @type {'willStop'} */
  WILL_STOP: 'willStop',
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
  /** @type {'debug'} */
  DEBUG: 'debug',
};

export const AGENT_TEMPLATES = {
  [AgentMessage.START]: () => `Starting...`,
  [AgentMessage.UNCAUGHT_ERROR]: ({ error }) => `Uncaught error: ${error.stack || error.message}`,
  [AgentMessage.WILL_STOP]: () => `Stopping...`,
  [AgentMessage.START_TEST]: ({ id, title }) => `Starting test #${id} '${title}'.`,
  [AgentMessage.OPEN_PAGE]: ({ url }) => `Open page: '${url}'.`,
  [AgentMessage.INVALID_KEYS]: ({ command, errors }) =>
    `Keys in '${command.id}' have issues:\n${errors.map(error => `- ${error}`).join('\n')}`,
  [AgentMessage.PRESS_KEYS]: ({ keys }) => `Press keys: '${keys.toString()}'.`,
  [AgentMessage.SPEECH_EVENT]: ({ spokenText }) => `Speech event: '${spokenText}'.`,
  [AgentMessage.NO_RUN_TEST_SETUP]: ({ referencePage }) =>
    `Test reference, ${referencePage}, does not have a Run Test Setup button.`,
  [AgentMessage.DEBUG]: ({ msg }) => `[debug] ${msg}`,
};

export function createAgentLogger(messages = AGENT_TEMPLATES) {
  return createSharedLogger(messages);
}
