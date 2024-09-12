/// <reference path="../data/types.js" />
/// <reference path="../shared/types.js" />

/** @namespace AriaATCIRunner */

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
 * | 'atDriverComms'
 * | 'capabilities'
 * } AriaATCIRunner.Message
 */

/**
 * @typedef {AriaATCIShared.Log<AriaATCIRunner.Message>} AriaATCIRunner.Log
 */

/**
 * @typedef {AsyncIterable<AriaATCIData.Test>} AriaATCIRunner.TestIterable
 */

/**
 * @typedef AriaATCIRunner.TestRunner
 * @property {function(AriaATCIData.Test): Promise<AriaATCIData.TestResultOutput>} run run a test
 */

/**
 * @callback AriaATCIRunner.ReportResult
 * @param {AriaATCIData.TestResult} result
 * @returns {Promise<void>}
 */

/**
 * @typedef {'chrome' | 'firefox' | 'safari'} AriaATCIRunner.Browser
 */

/**
 * @typedef AriaATCIRunner.CliOptions
 * @property {boolean} [debug]
 * @property {boolean} [quiet]
 * @property {AriaATCIRunner.Message[]} [verbose]
 * @property {AriaATCIShared.BaseURL} [referenceBaseUrl]
 * @property {boolean} [mock]
 * @property {AriaATCIShared.BaseURL} [webDriverUrl]
 * @property {AriaATCIRunner.Browser} [webDriverBrowser]
 * @property {AriaATCIShared.BaseURL} [atDriverUrl]
 * @property {AriaATCIShared.timesOption} [timesOption]
 */

/**
 * @typedef {object} BrowserCapabilities
 * @property {string} browserName
 * @property {string} browserVersion
 */

/**
 * @typedef {object} BrowserDriver
 * @property {(url: string) => Promise<void>} navigate
 * @property {() => Promise<void>} documentReady
 * @property {(selector: string, timeout: number) => Promise<void>} clickWhenPresent
 * @property {() => Promise<BrowserCapabilities>} getCapabilities
 * @property {() => Promise<void>} quit
 */
