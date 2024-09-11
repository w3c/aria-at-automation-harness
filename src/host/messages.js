/// <reference path="types.js" />

/**
 * @module host
 */

import { RUNNER_TEMPLATES } from '../runner/messages.js';
import { createSharedLogger } from '../shared/messages.js';

/** @enum {AriaATCIHost.HostLogType} */
export const HostMessage = {
  /** @type {'start'} */
  START: 'start',
  /** @type {'uncaughtError'} */
  UNCAUGHT_ERROR: 'uncaughtError',
  /** @type {'willStop'} */
  WILL_STOP: 'willStop',
  /** @type {'planRead'} */
  PLAN_READ: 'planRead',
  /** @type {'startServer'} */
  START_SERVER: 'startServer',
  /** @type {'serverListening'} */
  SERVER_LISTENING: 'serverListening',
  /** @type {'stopServer'} */
  STOP_SERVER: 'stopServer',
  /** @type {'stopDrivers'} */
  STOP_DRIVERS: 'stopDrivers',
  /** @type {'addServerDirectory'} */
  ADD_SERVER_DIRECTORY: 'addServerDirectory',
  /** @type {'removeServerDirectory'} */
  REMOVE_SERVER_DIRECTORY: 'removeServerDirectory',
  /** @type {'serverLog'} */
  SERVER_LOG: 'serverLog',
  /** @type {'startTest'} */
  START_TEST: 'startTest',
  /** @type {'reportingError'} */
  REPORTING_ERROR: 'reportingError',
  /** @type {'testError'} */
  TEST_ERROR: 'testError',
};

export const HOST_TEMPLATES = {
  [HostMessage.START]: () => `Starting...`,
  [HostMessage.UNCAUGHT_ERROR]: ({ error }) => `Uncaught error: ${error.message}`,
  [HostMessage.WILL_STOP]: () => `Stopping...`,
  [HostMessage.PLAN_READ]: ({ name, tests, files }) =>
    `Plan '${name}' with ${tests.length} tests and ${files.length} files read.`,
  [HostMessage.START_SERVER]: () => `Starting reference server.`,
  [HostMessage.SERVER_LISTENING]: ({ url }) => `Reference server listening on '${url}'.`,
  [HostMessage.STOP_SERVER]: () => `Stopping reference server.`,
  [HostMessage.STOP_DRIVERS]: () => `Stopping drivers.`,
  [HostMessage.ADD_SERVER_DIRECTORY]: ({ url }) => `Reference available on '${url}'.`,
  [HostMessage.REMOVE_SERVER_DIRECTORY]: ({ url }) => `Removing reference from '${url}'.`,
  [HostMessage.SERVER_LOG]: ({ text }) => `[Server]: ${text}`,
  [HostMessage.START_TEST]: () => `Starting test.`,
  [HostMessage.TEST_ERROR]: ({ error }) => `Test Error ${error}`,
  [HostMessage.REPORTING_ERROR]: ({ status, body }) =>
    `HTTP ${status} response received when reporting result: '${body}'.`,
};

/**
 * @param {*} messages
 * @returns {{log: AriaATCIHost.Log, emitter: import("events").EventEmitter}}
 */
export function createHostLogger(messages = { ...HOST_TEMPLATES, ...RUNNER_TEMPLATES }) {
  return createSharedLogger(messages);
}
