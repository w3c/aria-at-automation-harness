/// <reference path="../types.js"/>

import * as path from 'path';
import { fileURLToPath } from 'url';

import test from 'ava';

import { plansFrom } from '../plan-from.js';

test('plansFrom', async t => {
  // Set a 5 minute timeout on this test.
  t.timeout(5 * 60 * 1000);

  t.plan(216);

  const dirname = path.dirname(fileURLToPath(import.meta.url));
  for (const relativeFixtureWorkingdir of [
    'fixtures/plan-from/plan1',
    'fixtures/plan-from/plan2',
  ]) {
    const workingdir = path.join(dirname, relativeFixtureWorkingdir);
    for (const files of [
      ['*.json'],
      ['*.json', '*.{html,js}'],
      ['*.json', 'reference/**'],
      ['tests/**'],
      ['tests/**', '*.{html,js}'],
      ['tests/**', 'reference/**'],
    ]) {
      for (const protocol of /**@type {('fork'|'developer')[]}*/ ([
        undefined,
        'fork',
        'developer',
      ])) {
        for (const testPattern of [undefined, '*.json', 'tests/*']) {
          for (const log of [undefined, () => {}]) {
            for await (const plan of plansFrom(
              {
                workingdir,
                files,
              },
              {
                testPattern,
                protocol,
                log,
              }
            )) {
              t.snapshot(
                normalizeTestPlanFiles(omitDates(plan)),
                JSON.stringify({
                  workingdir: relativeFixtureWorkingdir,
                  files,
                  protocol,
                  testPattern,
                  log: log !== undefined ? typeof log : undefined,
                })
              );
            }
          }
        }
      }
    }
  }
});

/**
 * @param {AriaATCIHost.TestPlan} testPlan
 * @returns {AriaATCIHost.TestPlan}
 */
function omitDates(testPlan) {
  return {
    ...testPlan,
    log: testPlan.log.map(log => {
      if (log.data && log.data.date) {
        return { ...log, data: { ...log.data, date: undefined } };
      }
      return log;
    }),
  };
}

/**
 * Normalize differences in files between operating system environments.
 * @param {AriaATCIHost.TestPlan} testPlan
 * @returns {AriaATCIHost.TestPlan}
 */
function normalizeTestPlanFiles(testPlan, coders = textCoders()) {
  return {
    ...testPlan,
    files: testPlan.files.map(file => {
      if (isTextFile(file.name)) {
        return normalizeTextRecordEOL(file, coders);
      }
      return file;
    }),
  };
}

/**
 * @param {string} filePath
 * @returns {boolean}
 */
function isTextFile(filePath) {
  return /\.(?:html|js|json|md|txt)$/.test(filePath);
}

/**
 * Replace CRLF line ending sequence with LF line ending sequence.
 * @param {FileRecord.NamedRecord} file
 * @param {object} coders
 * @param {TextEncoder} coders.textEncoder
 * @param {TextDecoder} coders.textDecoder
 * @returns {FileRecord.NamedRecord}
 */
function normalizeTextRecordEOL(file, { textEncoder, textDecoder } = textCoders()) {
  return {
    ...file,
    bufferData: textEncoder.encode(textDecoder.decode(file.bufferData).replace(/\r\n/g, '\n')),
  };
}

/**
 * @returns {{textEncoder: TextEncoder, textDecoder: TextDecoder}}
 */
function textCoders() {
  return { textEncoder: new TextEncoder(), textDecoder: new TextDecoder() };
}
