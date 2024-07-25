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
 * | 'atDriverComms'
 * | 'capabilities'
 * } AriaATCIAgent.Message
 */

/**
 * @typedef {AriaATCIShared.Log<AriaATCIAgent.Message>} AriaATCIAgent.Log
 */

/**
 * @typedef {AsyncIterable<AriaATCIData.Test>} AriaATCIAgent.TestIterable
 */

/**
 * @typedef AriaATCIAgent.TestRunner
 * @property {function(AriaATCIData.Test, AriaATCIShared.BaseURL): Promise<AriaATCIData.TestResult>} run run a test
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
 * @typedef {'chrome' | 'firefox' | 'safari'} AriaATCIAgent.Browser
 */

/**
 * @typedef AriaATCIAgent.CliOptions
 * @property {boolean} [debug]
 * @property {boolean} [quiet]
 * @property {AriaATCIAgent.Message[]} [verbose]
 * @property {AriaATCIShared.BaseURL} [referenceBaseUrl]
 * @property {boolean} [mock]
 * @property {'request' | 'skip'} [mockOpenPage]
 * @property {AriaATCIShared.BaseURL} [webDriverUrl]
 * @property {AriaATCIAgent.Browser} [webDriverBrowser]
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
