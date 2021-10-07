/// <reference path="./types.js" />

/**
 * @module agent
 */

import { createLogger as _createLogger } from '../shared/messages.js';

/** @enum {AriaATCIAgent.Message} */
export const Message = {
  /** @type {'start'} */
  START: 'start',
  /** @type {'uncaughtError'} */
  UNCAUGHT_ERROR: 'uncaughtError',
  /** @type {'willStop'} */
  WILL_STOP: 'willStop',
};

export const TEMPLATES = {
  [Message.START]: () => `Starting test agent.`,
  [Message.UNCAUGHT_ERROR]: ({ error }) => `Uncaught error: ${error.message}`,
  [Message.WILL_STOP]: () => `Stopping test agent.`,
};

export function createLogger(messages = TEMPLATES) {
  return _createLogger(messages);
}
