/// <reference path="../shared/types.js" />
/// <reference path="types.js" />

/**
 * @module agent
 */

import { _createLogger } from '../shared/messages.js';

/** @enum {AriaATCIAgent.Message} */
export const AgentMessage = {
  /** @type {'start'} */
  START: 'start',
  /** @type {'uncaughtError'} */
  UNCAUGHT_ERROR: 'uncaughtError',
  /** @type {'willStop'} */
  WILL_STOP: 'willStop',
  /** @type {'OPEN_PAGE'} */
  OPEN_PAGE: 'openPage',
};

export const AGENT_TEMPLATES = {
  [AgentMessage.START]: () => `Starting...`,
  [AgentMessage.UNCAUGHT_ERROR]: ({ error }) => `Uncaught error: ${error.message}`,
  [AgentMessage.WILL_STOP]: () => `Stopping...`,
  [AgentMessage.OPEN_PAGE]: ({ url }) => `Open page: '${url}'.`,
};

export function createAgentLogger(messages = AGENT_TEMPLATES) {
  return _createLogger(messages);
}
