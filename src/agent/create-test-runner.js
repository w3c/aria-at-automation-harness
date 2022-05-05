/// <reference path="../shared/types.js" />
/// <reference path="types.js" />

/**
 * @module agent
 */

import { Builder, Browser } from 'selenium-webdriver';

import { MockTestRunner } from './mock-test-runner.js';
import { DriverTestRunner } from './driver-test-runner.js';

/**
 * @param {object} options
 * @param {Promise<void>} options.abortSignal resolves when runner should stop
 * @param {AriaATCIShared.BaseURL} options.baseUrl
 * @param {AriaATCIAgent.Log} options.log
 * @param {AriaATCIAgent.MockOptions} [options.mock]
 * @returns {Promise<AriaATCIAgent.TestRunner>}
 */
export async function createRunner(options) {
  if (!options.abortSignal) {
    throw new Error('createRunner requires abortSignal option.');
  }
  if (options.mock) {
    return new MockTestRunner(options);
  }
  const driver = await create({
    abortSignal: options.abortSignal,
    browserName: process.env.AWD_BROWSER_NAME,
    screenReaderName: process.env.AWD_SCREEN_READER_NAME,
  });

  return new DriverTestRunner({ ...options, driver });
}

async function create({ abortSignal, browserName, screenReaderName }) {
  const driver = await new Builder()
    .withCapabilities({
      'awd:vm-config': screenReaderName,
    })
    .forBrowser(Browser[browserName])
    .usingServer('http://localhost:3000/')
    .build();

  abortSignal.then(() => driver.quit());

  return driver;
}
