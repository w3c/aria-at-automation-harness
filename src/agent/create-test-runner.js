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
    return new MockTestRunner({ mock: options.mock, ...options });
  }
  await new Promise(resolve => setTimeout(resolve, 1000));
  const [webDriver, atDriver] = await Promise.all([
    createWebDriver({
      url: options.webDriverUrl,
      browser: options.webDriverBrowser,
      abortSignal: options.abortSignal,
    }).catch(cause => {
      throw new Error('Error connecting to web-driver', { cause });
    }),
    createATDriver({
      url: options.atDriverUrl,
      abortSignal: options.abortSignal,
      log: options.log,
    }).catch(cause => {
      throw new Error('Error connecting to at-driver', { cause });
    }),
  ]);
  return new DriverTestRunner({ ...options, webDriver, atDriver });
}
