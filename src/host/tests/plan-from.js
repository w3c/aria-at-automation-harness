/// <reference path="../types.js"/>

import path from 'path';
import { fileURLToPath } from 'url';

import test from 'ava';

import { plansFrom } from '../plan-from.js';

test('plansFrom', async t => {
  const dirname = path.dirname(fileURLToPath(import.meta.url));
  for (const _workingdir of ['fixtures/plan-from/plan1']) {
    const workingdir = path.join(dirname, _workingdir);
    for (const files of [
      ['*.json'],
      ['*.json', 'reference/**'],
      ['tests/*.json'],
      ['tests/*.json', 'reference/**'],
    ]) {
      for (const protocol of [undefined, 'fork', 'developer']) {
        for (const testPattern of [undefined]) {
          for (const log of [undefined]) {
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
                  workingdir: _workingdir,
                  files,
                  protocol,
                  testPattern,
                  log,
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
      return isTextFile(file.name) ? normalizeTextRecordEOL(file, coders) : file;
    }),
  };
}

/**
 * @param {string} filePath
 * @returns {boolean}
 */
function isTextFile(filePath) {
  return /\.(?:html|js|json|txt)$/.test(filePath);
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
    bufferData: textEncoder.encode(textDecoder.decode(file.bufferData).replace('\r\n', '\n')),
  };
}

/**
 * @returns {{textEncoder: TextEncoder, textDecoder: TextDecoder}}
 */
function textCoders() {
  return { textEncoder: new TextEncoder(), textDecoder: new TextDecoder() };
}
