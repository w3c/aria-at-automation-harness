/// <reference path="../shared/types.js" />
/// <reference path="types.js" />

import { MockTestRunner } from './mock-test-runner.js';

/**
 * @param {object} options
 * @param {AriaATCIShared.BaseURL} options.baseUrl
 * @param {AriaATCIAgent.Log} options.log
 * @param {AriaATCIAgent.MockOptions} [options.mock]
 * @returns {Promise<AriaATCIAgent.TestRunner>}
 */
export async function createRunner(options) {
  if (options.mock) {
    return new MockTestRunner(options);
  }
  throw new Error('Non-mocked test runner not implemented');
}
