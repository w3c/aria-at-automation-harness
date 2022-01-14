/// <reference path="../shared/file-record-types.js" />
/// <reference path="types.js" />

/**
 * @module host
 */

import child_process from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

import { compileGlob } from '../shared/file-glob.js';
import { createHost } from '../shared/file-record.js';
import { iterateEmitter } from '../shared/iterate-emitter.js';
import { startJob } from '../shared/job.js';
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
function planSelectTests(plan, { pattern = '{,**/}test*' } = {}) {
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
        return { ...planFromRecord(parseRecordBuffers(message.data)), source: 'fork' };
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

/**
 * @param {FileRecord.Record} record
 * @returns {FileRecord.Record}
 */
function parseRecordBuffers(record) {
  if (record.entries) {
    return { ...record, entries: record.entries.map(parseRecordBuffers) };
  }
  const { bufferData } = record;
  if (bufferData && bufferData.type === 'Buffer') {
    return { ...record, bufferData: new Uint8Array(Buffer.from(bufferData)) };
  } else if (Array.isArray(bufferData)) {
    return { ...record, bufferData: new Uint8Array(bufferData) };
  } else if (bufferData && Object.keys(bufferData).every(key => Number.isInteger(Number(key)))) {
    return { ...record, bufferData: new Uint8Array(Object.values(bufferData)) };
  }
  return record;
}

async function planFromAPI({ workingdir, files }) {
  const host = createHost();
  const record = await host.read(workingdir, { glob: files.join(',') });
  return { ...planFromRecord(record), source: 'api' };
}

planFromAPI.protocolName = 'api';

const PLAN_PROTOCOLS = {
  fork: [planFromCommandFork],
  api: [planFromAPI],
  auto: [planFromCommandFork, planFromAPI],
};

async function planFromFiles({ workingdir, files }, { protocol = 'auto' }) {
  const errors = [];
  for (const activeProtocol of PLAN_PROTOCOLS[protocol]) {
    try {
      return await activeProtocol({ workingdir, files });
    } catch (error) {
      errors.push(error);
    }
  }
  throw Object.assign(new Error('could not load files'), { errors });
}

/**
 * @param {object} target
 * @param {string} target.workingdir
 * @param {string[]} target.files
 * @param {object} [options]
 * @param {'fork' | 'api' | 'auto'} [options.protocol]
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
