/// <reference path="../shared/file-record-types.js" />
/// <reference path="types.js" />

/**
 * @module host
 */

import * as path from 'path';

import { compileGlob } from '../shared/file-glob.js';
import { createHost } from '../shared/file-record.js';

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

async function planFrom({ workingdir, files }) {
  const host = createHost();
  const glob = files.length === 1 ? files[0] : `{${files.join(',')}}`;
  const record = await host.read(workingdir, { glob });
  return { ...planFromRecord(record) };
}

async function planFromFiles({ workingdir, files }) {
  try {
    return await planFrom({ workingdir, files });
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
  const plan = await planFromFiles({ workingdir, files });
  const testPlan = planSelectTests(plan, { pattern: testPattern });
  log(HostMessage.PLAN_READ, testPlan);
  yield testPlan;
}
