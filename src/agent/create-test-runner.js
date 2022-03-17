/// <reference path="../shared/types.js" />
/// <reference path="types.js" />

/**
 * @module agent
 */

import { MockTestRunner } from './mock-test-runner.js';
import { DriverTestRunner } from './driver-test-runner.js';
import { createVM } from 'assistive-playwright-client';

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
  const { browser, page, vmWithPlaywright } = await create('firefox', options.abortSignal);

  return new DriverTestRunner({ ...options, browser, page, vmWithPlaywright });
}

async function create(browserName, abortSignal) {
  const vmWithPlaywright = await createVM({
    vmSettings: {
      type: 'virtualbox',
      vm: 'win10-chromium-nvda',
      snapshot: 'nvda',
    },
  });
  abortSignal.then(() => vmWithPlaywright.vm.destroy());

  try {
    const browser = await vmWithPlaywright[browserName].launch({ headless: false });
    const page = await browser.newPage({ viewport: null });

    return { browser, page, vmWithPlaywright };
  } catch (error) {
    await vmWithPlaywright.vm.destroy();
    throw error;
  }
}
