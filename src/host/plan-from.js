/// <reference path="../shared/file-record-types.js" />
/// <reference path="types.js" />

/**
 * @module host
 */

import * as child_process from 'child_process';
import * as path from 'path';
import { fileURLToPath } from 'url';

import { compileGlob } from '../shared/file-glob.js';
import { createHost } from '../shared/file-record.js';
import { iterateEmitter } from '../shared/iterate-emitter.js';
import { processExited, collectProcessPipe } from '../shared/process-util.js';

import { HostMessage } from './messages.js';
import { blankTestPlan, addFileToTestPlan, addTestToTestPlan } from './plan-object.js';

/**
 * @param {FileRecord.Record} record
 * @returns {AriaATCIHost.TestPlan}
 */
function planFromRecord(record) {
  const host = createHost({ path: path.posix });
  const recordList = host.collapse(record);
  let plan = blankTestPlan('unknown');
  for (const { name, bufferData } of recordList) {
    plan = addFileToTestPlan(plan, { name, bufferData });
  }
  return plan;
}

/**
 * @param {AriaATCIHost.TestPlan} plan
 * @param {object} options
 * @param {string} options.pattern
 * @returns {AriaATCIHost.TestPlan}
 */
function planSelectTests(plan, { pattern = '{,**/}test*' }) {
  const isTestFile = compileGlob(pattern);
  for (const { name } of plan.files) {
    if (isTestFile(name)) {
      plan = addTestToTestPlan(plan, name);
    }
  }
  return plan;
}

async function planFromCommandFork({ workingdir, files }) {
  const fork = child_process.fork(
    path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../bin/host.js'),
    ['read-plan', '--protocol', 'fork', ...files],
    {
      cwd: workingdir,
      stdio: 'pipe',
      serialization: 'advanced',
    }
  );

  const stdoutJob = collectProcessPipe(fork.stdout);
  const stderrJob = collectProcessPipe(fork.stderr);
  const exited = processExited(fork);
  try {
    for await (const message of iterateEmitter(fork, 'message', 'exit', 'error')) {
      if (message.type === 'record') {
        await stdoutJob.cancel();
        await stderrJob.cancel();
        return { ...planFromRecord(message.data), source: 'fork' };
      }
    }
    throw new Error(
      `did not receive record
stdout:
${await stdoutJob.cancel()}
stderr:
${await stderrJob.cancel()}`
    );
  } finally {
    await exited;
  }
}

planFromCommandFork.protocolName = 'fork';

async function planFromDeveloperInterface({ workingdir, files }) {
  const host = createHost();
  const glob = files.length === 1 ? files[0] : `{${files.join(',')}}`;
  const record = await host.read(workingdir, { glob });
  return { ...planFromRecord(record), source: 'developer' };
}

planFromDeveloperInterface.protocolName = 'developer';

const PLAN_PROTOCOL = {
  fork: planFromCommandFork,
  developer: planFromDeveloperInterface,
};

async function planFromFiles({ workingdir, files }, { protocol = 'fork' }) {
  try {
    const activeProtocol = PLAN_PROTOCOL[protocol];
    return await activeProtocol({ workingdir, files });
  } catch (error) {
    throw Object.assign(new Error('could not load files'), { error });
  }
}

/**
 * @param {object} target
 * @param {string} target.workingdir
 * @param {string[]} target.files
 * @param {object} [options]
 * @param {'fork' | 'developer'} [options.protocol]
 * @param {string} [options.testPattern]
 * @param {AriaATCIHost.Log} [options.log]
 * @returns {AsyncGenerator<AriaATCIHost.TestPlan>}
 */
export async function* plansFrom(
  { workingdir, files },
  { log = () => {}, protocol, testPattern } = {}
) {
  const plan = await planFromFiles({ workingdir, files }, { protocol });
  const testPlan = planSelectTests(plan, { pattern: testPattern });
  log(HostMessage.PLAN_READ, testPlan);
  yield testPlan;
}
