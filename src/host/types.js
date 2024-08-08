/// <reference path="../data/types.js" />
/// <reference path="../shared/file-record.js" />
/// <reference path="../shared/types.js" />
/// <reference path="../runner/types.js" />

/**
 * @namespace AriaATCIHost
 */

/**
 * @typedef {'start'
 * | 'uncaughtError'
 * | 'willStop'
 * | 'startServer'
 * | 'planRead'
 * | 'serverListening'
 * | 'stopServer'
 * | 'stopDrivers'
 * | 'addServerDirectory'
 * | 'removeServerDirectory'
 * | 'serverLog'
 * | 'startTest'
 * | 'reportingError'
 * | 'testError'
 * | 'atDriverComms'
 * | 'openPage'
 * | 'pressKeys'
 * | 'speechEvent'
 * | 'invalidKeys'
 * | 'noRunTestSetup'
 * | 'capabilities'
 * } AriaATCIHost.HostLogType
 */

/**
 * @typedef {AriaATCIShared.Log<AriaATCIHost.HostLogType>} AriaATCIHost.Log
 */

/**
 * @typedef AriaATCIHost.Logger
 * @property {AriaATCIHost.Log} log
 * @property {import("events").EventEmitter} emitter
 */

/**
 * @typedef AriaATCIHost.TestPlan
 * @property {string} name
 * @property {'fork' | 'developer' | 'unknown'} source
 * @property {object} serverOptions
 * @property {AriaATCIShared.BaseURL} serverOptions.baseUrl
 * @property {object[]} tests
 * @property {string} tests[].filepath
 * @property {number[]} tests[].log
 * @property {Array} tests[].results
 * @property {FileRecord.NamedRecord[]} files
 * @property {AriaATCIData.Log[]} log
 */

/**
 * @typedef AriaATCIHost.TestPlanServerOptionsPartial
 * @property {AriaATCIShared.BaseURL} [baseUrl]
 */

/**
 * @typedef AriaATCIHost.ReferenceFileServer
 * @property {function(FileRecord.NamedRecord[]): AriaATCIHost.ReferenceFileServerSlice} addFiles
 * @property {function(AriaATCIHost.ReferenceFileServerSlice): void} removeFiles
 * @property {function(): Promise<void>} close
 * @property {Promise<void>} ready
 * @property {string} baseUrl
 */

/**
 * @typedef AriaATCIHost.ReferenceFileServerSlice
 * @property {string} id
 * @property {AriaATCIShared.BaseURL} baseUrl
 */

/**
 * @callback AriaATCIHost.EmitPlanResults
 * @param {AriaATCIHost.TestPlan} plan
 * @returns {Promise<void> | void}
 */
