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
  const { browser, page, mouse, vmWithPlaywright } = await create({
    browserName: process.env.AWD_BROWSER_NAME,
    vmName: process.env.AWD_VM_NAME,
    snapshotName: process.env.AWD_SNAPSHOT_NAME,
    abortSignal: options.abortSignal,
  });

  return new DriverTestRunner({ ...options, browser, page, mouse, vmWithPlaywright });
}

async function create({ browserName, vmName, snapshotName, abortSignal }) {
  const vmWithPlaywright = await createVM({
    vmSettings: {
      type: 'virtualbox',
      vm: vmName,
      snapshot: snapshotName,
    },
  });
  abortSignal.then(() => vmWithPlaywright.vm.destroy());

  try {
    const browser = await vmWithPlaywright[browserName].launch({ headless: false });
    const page = await browser.newPage({ viewport: null });
    // The "mouse" interface provided by AssistivePlaywright is not used by
    // tests directly. Instead, it is used to ensure that the browser window
    // has focus in the operating system window manager, ensuring that any key
    // presses scripted by the tests are sent to the correct window.
    const mouse = await vmWithPlaywright.calibrateMouse(page);

    return { browser, page, mouse, vmWithPlaywright };
  } catch (error) {
    await vmWithPlaywright.vm.destroy();
    throw error;
  }
}
