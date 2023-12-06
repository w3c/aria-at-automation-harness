/// <reference path="types.js" />

/**
 * @module host
 */

import { createSharedLogger } from '../shared/messages.js';

/** @enum {AriaATCIHost.Message} */
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
  /** @type {'addServerDirectory'} */
  ADD_SERVER_DIRECTORY: 'addServerDirectory',
  /** @type {'removeServerDirectory'} */
  REMOVE_SERVER_DIRECTORY: 'removeServerDirectory',
  /** @type {'serverLog'} */
  SERVER_LOG: 'serverLog',
  /** @type {'startAgent'} */
  START_AGENT: 'startAgent',
  /** @type {'agentProtocol'} */
  AGENT_PROTOCOL: 'agentProtocol',
  /** @type {'stopAgent'} */
  STOP_AGENT: 'stopAgent',
  /** @type {'agentLog'} */
  AGENT_LOG: 'agentLog',
  /** @type {'agentCrashed'} */
  AGENT_CRASHED: 'agentCrashed',
  /** @type {'startTest'} */
  START_TEST: 'startTest',
  /** @type {'reportingError'} */
  REPORTING_ERROR: 'reportingError',
};

export const HOST_TEMPLATES = {
  [HostMessage.START]: () => `Starting...`,
  [HostMessage.UNCAUGHT_ERROR]: ({ error }) => `Uncaught error: ${error.message}`,
  [HostMessage.WILL_STOP]: () => `Stopping...`,
  [HostMessage.PLAN_READ]: ({ name, source, tests, files }) =>
    `Plan '${name}' with ${tests.length} tests and ${files.length} files read from source '${source}'.`,
  [HostMessage.START_SERVER]: () => `Starting reference server.`,
  [HostMessage.SERVER_LISTENING]: ({ url }) => `Reference server listening on '${url}'.`,
  [HostMessage.STOP_SERVER]: () => `Stopping reference server.`,
  [HostMessage.ADD_SERVER_DIRECTORY]: ({ url }) => `Reference available on '${url}'.`,
  [HostMessage.REMOVE_SERVER_DIRECTORY]: ({ url }) => `Removing reference from '${url}'.`,
  [HostMessage.SERVER_LOG]: ({ text }) => `[Server]: ${text}`,
  [HostMessage.START_AGENT]: () => `Starting test agent.`,
  [HostMessage.AGENT_PROTOCOL]: ({ protocol }) => `Agent running with protocol '${protocol}'.`,
  [HostMessage.STOP_AGENT]: () => `Stopping test agent.`,
  [HostMessage.AGENT_LOG]: ({ text }) => `[Agent]: ${text}`,
  [HostMessage.AGENT_CRASHED]: () => `Agent crashed.`,
  [HostMessage.START_TEST]: () => `Starting test.`,
  [HostMessage.REPORTING_ERROR]: ({ status, body }) =>
    `HTTP ${status} response received when reporting result: '${body}'.`,
};

/**
 * @param {*} messages
 * @returns {{log: AriaATCIHost.Log, emitter: EventEmitter}}
 */
export function createHostLogger(messages = HOST_TEMPLATES) {
  return createSharedLogger(messages);
}
