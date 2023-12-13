/// <reference path="types.js" />

/**
 * @module host
 */

import { startJob } from '../shared/job.js';

import { HostMessage } from './messages.js';
import {
  addLogToTestPlan,
  setServerOptionsInTestPlan,
  addTestLogToTestPlan,
  addTestResultToTestPlan,
} from './plan-object.js';

/**
 * @param {AriaATCIHost.Log} log
 * @param {Response} response
 */
const logUnsuccessfulHTTP = async (log, response) => {
  if (!response.ok) {
    const { status } = response;
    const body = await response.text().catch(() => 'Unknown error - unable to read response body.');

    log(HostMessage.REPORTING_ERROR, { status, body });
  }
};

/**
 * @param {object} options
 * @param {AriaATCIHost.Log} options.log
 * @param {AsyncIterable<AriaATCIHost.TestPlan>} options.plans
 * @param {AriaATCIHost.ReferenceFileServer} options.server
 * @param {AriaATCIHost.Agent} options.agent
 * @param {AriaATCIHost.EmitPlanResults} options.emitPlanResults
 */
export async function hostMain({
  log,
  plans,
  server,
  agent,
  emitPlanResults,
  callbackUrl,
  callbackHeader,
  fetch,
}) {
  log(HostMessage.START);

  const hostLogJob = startJob(async function (signal) {
    for await (const agentLog of signal.cancelable(agent.logs())) {
      log(HostMessage.AGENT_LOG, agentLog);
    }
  });

  await server.ready;
  log(HostMessage.SERVER_LISTENING, { url: server.baseUrl });

  const textDecoder = new TextDecoder();
  for await (let plan of plans) {
    const serverDirectory = server.addFiles(plan.files);
    log(HostMessage.ADD_SERVER_DIRECTORY, { url: serverDirectory.baseUrl });
    setServerOptionsInTestPlan(plan, { baseUrl: serverDirectory.baseUrl });

    log(HostMessage.START_AGENT);
    await agent.start({ referenceBaseUrl: serverDirectory.baseUrl });

    const callbackRequests = [];

    for (const test of plan.tests) {
      log(HostMessage.START_TEST);
      const testLogJob = startJob(async function (signal) {
        for await (const testLog of signal.cancelable(agent.logs())) {
          plan = addLogToTestPlan(plan, testLog);
          plan = addTestLogToTestPlan(plan, test);
        }
      });

      const file = plan.files.find(({ name }) => name === test.filepath);
      const result = await agent.run(JSON.parse(textDecoder.decode(file.bufferData)));
      if (callbackUrl) {
        const headers = {
          'Content-Type': 'application/json',
          ...(callbackHeader || {}),
        };
        const { testId, capabilities, commands } = result;
        const body = JSON.stringify({
          testCsvRow: testId,
          capabilities,
          responses: commands.map(({ output }) => output),
          // a v2 of this API should allow the aria at app to parse the capabilities we are sending instead.
          atVersionName: capabilities.atVersion,
          browserVersionName: capabilities.browserVersion,
        });
        callbackRequests.push(
          fetch(callbackUrl, {
            method: 'post',
            body,
            headers,
          }).then(logUnsuccessfulHTTP.bind(null, log))
        );
      }
      plan = addTestResultToTestPlan(plan, test.filepath, result);
      await Promise.allSettled(callbackRequests);
      await testLogJob.cancel();
    }

    server.removeFiles(serverDirectory);
    log(HostMessage.REMOVE_SERVER_DIRECTORY, { url: serverDirectory.baseUrl });

    log(HostMessage.STOP_AGENT);
    await agent.stop();

    await emitPlanResults(plan);
  }

  await hostLogJob.cancel();

  log(HostMessage.STOP_SERVER);
  await server.close();

  log(HostMessage.WILL_STOP);
}
