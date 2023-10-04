/// <reference path="../shared/types.js" />
/// <reference path="types.js" />

/**
 * @module agent
 */

import { MockTestRunner } from './mock-test-runner.js';
import { DriverTestRunner } from './driver-test-runner.js';
import { createWebDriver } from './web-driver.js';
import { createATDriver } from './at-driver.js';
import { AgentMessage } from './messages.js';

/**
 * @param {object} options
 * @param {Promise<void>} options.abortSignal resolves when runner should stop
 * @param {{hostname: string, port: number | string, pathname: string}} options.atDriverUrl
 * @param {AriaATCIShared.BaseURL} options.baseUrl
 * @param {AriaATCIAgent.Log} options.log
 * @param {AriaATCIAgent.MockOptions} [options.mock]
 * @param {AriaATCIAgent.Browser} [options.webDriverBrowser]
 * @param {{toString: function(): string}} options.webDriverUrl
 * @returns {Promise<AriaATCIAgent.TestRunner>}
 */
export async function createRunner(options) {
  if (!options.abortSignal) {
    throw new Error('createRunner requires abortSignal option.');
  }
  if (options.mock) {
    return new MockTestRunner(options);
  }
  await new Promise(resolve => setTimeout(resolve, 1000));
  const [webDriver, atDriver] = await Promise.all([
    createWebDriver({
      url: options.webDriverUrl,
      browser: options.webDriverBrowser,
      abortSignal: options.abortSignal,
      log: options.log,
    }),
    createATDriver({
      url: options.atDriverUrl,
      abortSignal: options.abortSignal,
      log: options.log,
    }),
  ]);
  return new DriverTestRunner({ ...options, webDriver, atDriver });
}
