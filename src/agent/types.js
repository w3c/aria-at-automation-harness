/// <reference path="../data/types.js" />
/// <reference path="../shared/types.js" />

/** @namespace AriaATCIAgent */

/**
 * @typedef {'start'
 * | 'uncaughtError'
 * | 'willStop'
 * | 'startTest'
 * | 'openPage'
 * | 'invalidKeys'
 * | 'pressKeys'
 * | 'speechEvent'
 * | 'noRunTestSetup'
 * } AriaATCIAgent.Message
 */

/**
 * @typedef {AriaATCIShared.Log<AriaATCIAgent.Message>} AriaATCIAgent.Log
 */

/**
 * @typedef {Iterable<AriaATCIData.Test>} AriaATCIAgent.TestIterable
 */

/**
 * @typedef AriaATCIAgent.TestRunner
 * @property {function(AriaATCIData.Test): Promise<AriaATCIData.TestResult>} run run a test
 */

/**
 * @callback AriaATCIAgent.ReportResult
 * @param {AriaATCIData.TestResult} result
 * @returns {Promise<void>}
 */

/**
 * @typedef AriaATCIAgent.MockOptions
 * @property {'request' | 'skip'} [openPage]
 */

/**
 * @typedef AriaATCIAgent.CliOptions
 * @property {boolean} [debug]
 * @property {boolean} [quiet]
 * @property {AriaATCIAgent.Message[]} [verbose]
 * @property {AriaATCIShared.BaseURL} [referenceBaseUrl]
 * @property {boolean} [mock]
 * @property {'request' | 'skip'} [mockOpenPage]
 * @property {URL} [webDriverUrl]
 * @property {URL} [atDriverUrl]
 */
