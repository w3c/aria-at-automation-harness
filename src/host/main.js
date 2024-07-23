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
 * @param {AriaATCIAgent.TestRunner} options.runner
 * @param {AriaATCIHost.EmitPlanResults} options.emitPlanResults
 * @param {string} [options.callbackUrl]
 * @param {Record<string, string>} [options.callbackHeader]
 * @param {typeof fetch} options.fetch
 */
export async function hostMain({
  log,
  plans,
  server,
  runner,
  emitPlanResults,
  callbackUrl,
  callbackHeader,
  fetch,
}) {
  log(HostMessage.START);

  // const hostLogJob = startJob(async function (signal) {
  //   for await (const agentLog of signal.cancelable(agent.logs())) {
  //     log(HostMessage.AGENT_LOG, agentLog);
  //   }
  // });

  await server.ready;
  log(HostMessage.SERVER_LISTENING, { url: server.baseUrl });

  const textDecoder = new TextDecoder();
  for await (let plan of plans) {
    const serverDirectory = server.addFiles(plan.files);
    log(HostMessage.ADD_SERVER_DIRECTORY, { url: serverDirectory.baseUrl });
    setServerOptionsInTestPlan(plan, { baseUrl: serverDirectory.baseUrl });

    log(HostMessage.START_AGENT);
    // await agent.start({ referenceBaseUrl: serverDirectory.baseUrl });

    let lastCallbackRequest = Promise.resolve();

    const postCallbackWhenEnabled = body => {
      // ignore if not in callback mode
      if (!callbackUrl) return;
      const headers = {
        'Content-Type': 'application/json',
        ...(callbackHeader || {}),
      };
      const perTestUrl = callbackUrl.replace(
        ':testRowNumber',
        body.presentationNumber ?? body.testCsvRow
      );
      lastCallbackRequest = lastCallbackRequest.then(() =>
        fetch(perTestUrl, {
          method: 'post',
          body: JSON.stringify(body),
          headers,
        }).then(logUnsuccessfulHTTP.bind(null, log))
      );
    };

    for (const test of plan.tests) {
      log(HostMessage.START_TEST);
      // const testLogJob = startJob(async function (signal) {
      //   for await (const testLog of signal.cancelable(agent.logs())) {
      //     plan = addLogToTestPlan(plan, testLog);
      //     plan = addTestLogToTestPlan(plan, test);
      //   }
      // });

      const file = plan.files.find(({ name }) => name === test.filepath);
      const testSource = JSON.parse(textDecoder.decode(file.bufferData));

      const { presentationNumber, testId: testCsvRow } = testSource.info;

      const callbackBody = presentationNumber ? { presentationNumber } : { testCsvRow };

      try {
        postCallbackWhenEnabled({ ...callbackBody, status: 'RUNNING' });

        const result = await runner.run(testSource, serverDirectory.baseUrl);

        const { capabilities, commands } = result;

        postCallbackWhenEnabled({
          ...callbackBody,
          capabilities,
          status: 'COMPLETED',
          responses: commands.map(({ output }) => output),
        });

        plan = addTestResultToTestPlan(plan, test.filepath, result);
      } catch (exception) {
        const error = `${exception.message ?? exception}`;
        log(HostMessage.TEST_ERROR, { error });
        postCallbackWhenEnabled({ ...callbackBody, error, status: 'ERROR' });
        await lastCallbackRequest;
        throw exception;
      } finally {
        // await testLogJob.cancel();
      }
    }

    server.removeFiles(serverDirectory);
    log(HostMessage.REMOVE_SERVER_DIRECTORY, { url: serverDirectory.baseUrl });

    log(HostMessage.STOP_AGENT);
    await lastCallbackRequest;
    // await agent.stop();
    await emitPlanResults(plan);
  }

  // await hostLogJob.cancel();

  log(HostMessage.STOP_SERVER);
  await server.close();

  log(HostMessage.WILL_STOP);
}
