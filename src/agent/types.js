/// <reference path="../shared/types.js" />

/** @namespace AriaATCIAgent */

/**
 * @typedef {'start' | 'uncaughtError' | 'willStop'} AriaATCIAgent.Message
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
