/// <reference path="./types.js" />

/**
 * @module agent
 */

import { Message } from './messages.js';

/**
 * Run agent's main application loop, waiting for tests, running them, and reporting results.
 * @param {object} args
 * @param {AriaATCIAgent.TestRunner} args.runner
 * @param {AriaATCIAgent.Log} args.log
 * @param {AriaATCIAgent.TestIterable} args.tests
 * @param {AriaATCIAgent.ReportResult} args.reportResult
 */
export async function main({ runner, log, tests, reportResult }) {
  try {
    log(Message.START);
    // Wait for a test.
    for await (const test of tests) {
      // Perform the test and report result.
      await reportResult(await runner.run(test));
    }
  } catch (error) {
    log(Message.UNCAUGHT_ERROR, { error });
  } finally {
    log(Message.WILL_STOP);
  }
}
