/// <reference path="../shared/types.js" />

/** @namespace AriaATCIAgent */

/**
 * @typedef {'start'
 * | 'uncaughtError'
 * | 'willStop'
 * | 'openPage'
 * } AriaATCIAgent.Message
 */

/**
 * @typedef {AriaATCIShared.Log<AriaATCIAgent.Message>} AriaATCIAgent.Log
 */

/**
 * @typedef {Iterable<*>} AriaATCIAgent.TestIterable
 */

/**
 * @typedef AriaATCIAgent.TestRunner
 * @property {function(*): Promise<*>} run run a test
 */

/**
 * @callback AriaATCIAgent.ReportResult
 * @param {*} result
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
 * @property {AriaATCIAgent.MockOptions} [mock]
 * @property {'fork' | 'shell'} [protocol]
 */
