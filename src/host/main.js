/// <reference path="types.js" />

import { startJob } from '../shared/job.js';

import { HostMessage } from './messages.js';
import {
  addLogToTestPlan,
  setServerOptionsInTestPlan,
  addTestLogToTestPlan,
  addTestResultToTestPlan,
} from './plan-object.js';

/**
 * @param {object} options
 * @param {AriaATCIHost.Log} options.log
 * @param {AsyncIterable<AriaATCIHost.TestPlan>} options.plans
 * @param {AriaATCIHost.ReferenceFileServer} options.server
 * @param {AriaATCIHost.Agent} options.agent
 * @param {AriaATCIHost.EmitPlanResults} options.emitPlanResults
 */
export async function hostMain({ log, plans, server, agent, emitPlanResults }) {
  log(HostMessage.START);

  const hostLogJob = startJob(async function (signal) {
    for await (const agentLog of signal.cancelable(agent.logs())) {
      log(HostMessage.AGENT_LOG, agentLog);
    }
  });

  await server.ready;
  log(HostMessage.SERVER_LISTENING, { url: server.baseUrl });

  for await (let plan of plans) {
    const serverDirectory = server.addFiles(plan.files);
    log(HostMessage.ADD_SERVER_DIRECTORY, { url: serverDirectory.baseUrl });
    setServerOptionsInTestPlan(plan, { baseUrl: serverDirectory.baseUrl });

    log(HostMessage.START_AGENT);
    await agent.start({ referenceBaseUrl: serverDirectory.baseUrl });

    for (const test of plan.tests) {
      log(HostMessage.START_TEST);
      const testLogJob = startJob(async function (signal) {
        for await (const testLog of signal.cancelable(agent.logs())) {
          plan = addLogToTestPlan(plan, testLog);
          plan = addTestLogToTestPlan(plan, test);
        }
      });

      const file = plan.files.find(({ name }) => name === test.filepath);
      const result = await agent.run(JSON.parse(Buffer.from(file.buffer).toString()));
      plan = addTestResultToTestPlan(plan, test.filepath, result);

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
