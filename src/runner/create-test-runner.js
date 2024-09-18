/**
 * @module agent
 */

import { MockTestRunner } from './mock-test-runner.js';
import { DriverTestRunner } from './driver-test-runner.js';
import { createBrowserDriver } from './browser-driver/create.js';
import { createATDriver } from './at-driver.js';

/**
 * @param {object} options
 * @param {{hostname: string, port: number | string, pathname: string}} options.atDriverUrl
 * @param {URL} options.baseUrl
 * @param {AriaATCIHost.Log} options.log
 * @param {Promise<void>} options.abortSignal
 * @param {boolean} [options.mock]
 * @param {AriaATCIRunner.Browser} [options.webDriverBrowser]
 * @param {AriaATCIShared.TimesOption} options.timesOption
 * @param {{toString: function(): string}} options.webDriverUrl
 * @returns {Promise<AriaATCIRunner.TestRunner>}
 */
export async function createRunner(options) {
  const { abortSignal, log, timesOption } = options;

  if (options.mock) {
    return new MockTestRunner(options);
  }
  await new Promise(resolve => setTimeout(resolve, 1000));

  const [browserDriver, atDriver] = await Promise.all([
    createBrowserDriver({
      url: options.webDriverUrl,
      browser: options.webDriverBrowser,
      abortSignal,
      timesOption,
    }).catch(cause => {
      throw new Error('Error initializing browser driver', { cause });
    }),
    createATDriver({
      url: options.atDriverUrl,
      abortSignal,
      log,
    }).catch(cause => {
      throw new Error('Error connecting to at-driver', { cause });
    }),
  ]);
  return new DriverTestRunner({ ...options, browserDriver, atDriver });
}
