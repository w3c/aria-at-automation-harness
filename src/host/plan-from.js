/// <reference path="../shared/file-record-types.js" />
/// <reference path="types.js" />

import child_process from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

import { createHost } from '../shared/file-record.js';
import { iterateEmitter } from '../shared/iterate-emitter.js';
import { processExited } from '../shared/process-util.js';

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
  for (const { name, buffer } of recordList) {
    plan = addFileToTestPlan(plan, { name, buffer });
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
  const host = createHost({ path: path.posix });
  const isTestFile = host.compileGlob(pattern);
  for (const { name } of plan.files) {
    if (isTestFile(name)) {
      plan = addTestToTestPlan(plan, name);
    }
  }
  return plan;
}

export async function planFromCommandFork({ workingdir, files }) {
  const fork = child_process.fork(
    path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../bin/host.js'),
    ['plan', '--protocol', 'fork', ...files],
    {
      cwd: workingdir,
      stdio: 'pipe',
    }
  );
  const exited = processExited(fork);
  try {
    for await (const message of iterateEmitter(fork, 'message', 'exit', 'error')) {
      if (message.type === 'record') {
        return { ...planFromRecord(parseRecordBuffers(message.data)), source: 'fork' };
      }
    }
    throw new Error('did not receive record');
  } finally {
    await exited;
  }
}

planFromCommandFork.protocol = 'fork';

/**
 * @param {FileRecord.Record} record
 * @returns {FileRecord.Record}
 */
function parseRecordBuffers(record) {
  if (record.entries) {
    return { ...record, entries: record.entries.map(parseRecordBuffers) };
  }
  const { buffer } = record;
  if (buffer && buffer.type === 'Buffer') {
    return { ...record, buffer: new Uint8Array(Buffer.from(buffer)) };
  } else if (Array.isArray(buffer)) {
    return { ...record, buffer: new Uint8Array(buffer) };
  } else if (buffer && Object.keys(buffer).every(key => Number.isInteger(key))) {
    return { ...record, buffer: new Uint8Array(Object.values(buffer)) };
  }
  return record;
}

async function planFromAPI({ workingdir, files }) {
  const host = createHost();
  const record = await host.read(workingdir, { glob: files.join(',') });
  return { ...planFromRecord(record), source: 'api' };
}

planFromAPI.protocol = 'api';

const PLAN_PROTOCOLS = {
  fork: [planFromCommandFork],
  api: [planFromAPI],
  auto: [planFromCommandFork, planFromAPI],
};

async function planFromFiles({ protocol = 'auto', workingdir, files }) {
  const errors = [];
  for (const protocol of PLAN_PROTOCOLS[protocol]) {
    try {
      return await protocol({ workingdir, files });
    } catch (error) {
      errors.push(error);
    }
  }
  throw Object.assign(new Error('could not load files'), { errors });
}

export async function* plansFrom({ protocol, workingdir, files }, { log, testPattern } = {}) {
  const plan = await planFromFiles({ protocol, workingdir, files });
  const testPlan = planSelectTests(plan, { pattern: testPattern });
  log(HostMessage.PLAN_READ, testPlan);
  yield testPlan;
}
