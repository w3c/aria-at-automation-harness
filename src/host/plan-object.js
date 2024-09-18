/// <reference path="../shared/file-record.js" />

/**
 * @module host
 */

import * as arrayUtil from '../shared/array-util.js';

/**
 * @param {string} name
 * @returns {AriaATCIHost.TestPlan}
 */
export function blankTestPlan(name) {
  return {
    name,
    serverOptions: {
      baseUrl: {
        protocol: 'unknown',
        hostname: 'unknown',
        port: 0xffff,
        pathname: '',
      },
    },
    tests: [],
    files: [],
    log: [],
  };
}

/**
 * @param {AriaATCIHost.TestPlan} testPlan
 * @param {FileRecord.NamedRecord} file
 * @returns {AriaATCIHost.TestPlan}
 */
export function addFileToTestPlan(testPlan, file) {
  file = validateTestPlanFile(file);
  return { ...testPlan, files: [...testPlan.files, file] };
}

/**
 * @param {AriaATCIHost.TestPlan} testPlan
 * @param {AriaATCIHost.TestPlanServerOptionsPartial} serverOptions
 * @returns {AriaATCIHost.TestPlan}
 */
export function setServerOptionsInTestPlan(testPlan, serverOptions) {
  serverOptions = validateTestPlanServerOptionsPartial(serverOptions);
  return { ...testPlan, serverOptions: { ...testPlan.serverOptions, ...serverOptions } };
}

/**
 * @param {AriaATCIHost.TestPlan} testPlan
 * @param {string} filepath
 * @returns {AriaATCIHost.TestPlan}
 */
export function addTestToTestPlan(testPlan, filepath) {
  invariant(
    testPlan.files.find(file => file.name === filepath),
    () => `File ${filepath} does not exist in test plan.`
  );
  return { ...testPlan, tests: [...testPlan.tests, { filepath, id: '', log: [], results: [] }] };
}

/**
 * @param {AriaATCIHost.TestPlan} testPlan
 * @param {*} log
 * @returns {AriaATCIHost.TestPlan}
 */
export function addLogToTestPlan(testPlan, log) {
  return { ...testPlan, log: [...testPlan.log, log] };
}

/**
 * @param {AriaATCIHost.TestPlan} testPlan
 * @param {{filepath: string}} testFilepath
 * @returns {AriaATCIHost.TestPlan}
 */
export function addTestLogToTestPlan(testPlan, { filepath: testFilepath }) {
  const test = testPlan.tests.find(({ filepath }) => filepath === testFilepath);
  return {
    ...testPlan,
    tests: arrayUtil.replace(testPlan.tests, test, {
      ...test,
      log: [...test.log, testPlan.log.length - 1],
    }),
  };
}

/**
 * @param {AriaATCIHost.TestPlan} testPlan
 * @param {string} testFilepath
 * @param {*} result
 * @returns {AriaATCIHost.TestPlan}
 */
export function addTestResultToTestPlan(testPlan, testFilepath, result) {
  const test = testPlan.tests.find(({ filepath }) => filepath === testFilepath);
  const { testId, presentationNumber, ...resultOutput } = result;
  return {
    ...testPlan,
    tests: arrayUtil.replace(testPlan.tests, test, {
      ...test,
      id: testId,
      results: [...test.results, resultOutput],
    }),
  };
}

/**
 * @param {*} serverOptions
 * @returns {AriaATCIHost.TestPlanServerOptionsPartial}
 */
function validateTestPlanServerOptionsPartial(serverOptions) {
  invariant(typeof serverOptions === 'object' && serverOptions !== null);
  for (const key of Object.keys(serverOptions)) {
    invariant(['baseUrl', 'files'].includes(key));
  }
  if (serverOptions.baseUrl) {
    validateTestPlanURL(serverOptions.baseUrl);
  }
  if (serverOptions.files) {
    invariant(
      typeof serverOptions.files === 'object' &&
        serverOptions.files !== null &&
        Array.isArray(serverOptions.files)
    );
    for (const file of serverOptions.files) {
      invariant(typeof file === 'string');
    }
  }
  return serverOptions;
}

/**
 * @param {*} url
 * @returns {AriaATCIShared.BaseURL}
 */
function validateTestPlanURL(url) {
  invariant(typeof url === 'object' && url !== null);
  for (const key of Object.keys(url)) {
    invariant(['protocol', 'hostname', 'port', 'pathname'].includes(key));
  }
  invariant(typeof url.protocol === 'string');
  invariant(typeof url.hostname === 'string');
  validatePort(url.port);
  invariant(typeof url.pathname === 'string');
  return url;
}

function validatePort(port) {
  invariant(typeof port === 'number', () => `typeof ${port} === 'number'`);
  invariant(port > 0 && port < 0x10000);
  return port;
}

/**
 * @param {*} file
 * @returns {FileRecord.NamedRecord}
 */
function validateTestPlanFile(file) {
  invariant(typeof file === 'object' && file !== null);
  for (const key of Object.keys(file)) {
    invariant(['name', 'bufferData'].includes(key));
  }
  invariant(typeof file.name === 'string');
  validateUint8Array(file.bufferData);
  return file;
}

function validateUint8Array(bufferData) {
  invariant(
    bufferData instanceof Uint8Array,
    () =>
      `'${bufferData && bufferData.constructor && bufferData.constructor.name}' === 'Uint8Array'`
  );
  return bufferData;
}

function invariant(condition, message) {
  if (!condition) {
    if (message) {
      throw new Error(message());
    } else {
      throw new Error('assertion failed');
    }
  }
}
