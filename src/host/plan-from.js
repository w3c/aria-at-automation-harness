/// <reference path="../shared/file-record-types.js" />
/// <reference path="types.js" />

import child_process from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

import { createHost } from '../shared/file-record.js';
import { iterateEmitter } from '../shared/iterate-emitter.js';
import {
  multipartStreams,
  partsFromMultipart,
  recordFromFlatRecordList,
  flatRecordsFromMultipartParts,
  recordToFlatRecordList,
} from '../shared/multipart.js';

import { HostMessage } from './messages.js';
import { blankTestPlan, addFileToTestPlan, addTestToTestPlan } from './plan-object.js';

/**
 * @param {FileRecord.Record} record
 * @returns {AriaATCIHost.TestPlan}
 */
function planFromRecord(record) {
  const recordList = recordToFlatRecordList(record);
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

/**
 * @param {Readable} readable
 */
async function* plansFromStream(readable) {
  for await (const multipart of multipartStreams(
    iterateEmitter(readable, 'data', 'end', 'error')
  )) {
    let recordList = [];
    for await (const flatRecord of flatRecordsFromMultipartParts(partsFromMultipart(multipart))) {
      recordList.push(flatRecord);
    }
    if (recordList.length > 0) {
      yield { ...planFromRecord(recordFromFlatRecordList(recordList)), source: 'stream' };
    }
  }
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
  const exited = new Promise((resolve, reject) => {
    fork.once('exit', (code, signal) => resolve({ code, signal }));
    fork.once('error', reject);
  });
  try {
    for await (const message of iterateEmitter(fork, 'message', 'exit', 'error')) {
      if (message.type === 'record') {
        return { ...planFromRecord(bufferizeRecord(message.data)), source: 'fork' };
      }
    }
    throw new Error('did not receive record');
  } finally {
    await exited;
  }
}

planFromCommandFork.protocol = 'fork';

function bufferizeRecord(record) {
  const recordList = recordToFlatRecordList(record);
  for (const record of recordList) {
    if (
      typeof record.buffer === 'object' &&
      'type' in record.buffer &&
      record.buffer.type === 'Buffer'
    ) {
      record.buffer = new Uint8Array(Buffer.from(record.buffer));
    }
  }
  return recordFromFlatRecordList(recordList);
}

export async function planFromCommandShell({ workingdir, files }) {
  const shell = child_process.spawn(
    path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../bin/host.js'),
    ['plan', '--protocol', 'shell', ...files],
    {
      cwd: workingdir,
    }
  );
  const exited = new Promise(resolve =>
    shell.once('exit', (code, signal) => resolve({ code, signal }))
  );
  try {
    const recordList = [];
    for await (const record of flatRecordsFromMultipartParts(partsFromMultipart(shell.stdout))) {
      recordList.push(record);
    }
    return { ...planFromRecord(recordFromFlatRecordList(recordList)), source: 'shell' };
  } finally {
    await exited;
  }
}

planFromCommandShell.protocol = 'shell';

async function planFromAPI({ workingdir, files }) {
  const host = createHost({ path: path.posix });
  const record = await host.read(workingdir, { glob: files.join(',') });
  return { ...planFromRecord(record), source: 'api' };
}

planFromAPI.protocol = 'api';

const PLAN_TOOLS = {
  fork: [planFromCommandFork],
  shell: [planFromCommandShell],
  api: [planFromAPI],
  auto: [planFromCommandFork, planFromCommandShell, planFromAPI],
};

async function planFromFiles({ protocol = 'auto', workingdir, files }) {
  const errors = [];
  for (const tool of PLAN_TOOLS[protocol]) {
    try {
      return await tool({ workingdir, files });
    } catch (error) {
      errors.push(error);
    }
  }
  throw Object.assign(new Error('could not load files'), { errors });
}

export async function* plansFrom(
  { stream, protocol, workingdir, files },
  { log, testPattern } = {}
) {
  if (files && files.length > 0) {
    const plan = await planFromFiles({ protocol, workingdir, files });
    const testPlan = planSelectTests(plan, { pattern: testPattern });
    log(HostMessage.PLAN_READ, testPlan);
    yield testPlan;
  }
  if (stream) {
    for await (const plan of plansFromStream(stream)) {
      const testPlan = planSelectTests(plan, { pattern: testPattern });
      log(HostMessage.PLAN_READ, testPlan);
      yield testPlan;
    }
  }
}
