/// <reference path="../data/types.js" />
/// <reference path="../shared/file-record.js" />
/// <reference path="../shared/types.js" />
/// <reference path="../agent/types.js" />

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
 * | 'addServerDirectory'
 * | 'removeServerDirectory'
 * | 'serverLog'
 * | 'startAgent'
 * | 'agentProtocol'
 * | 'stopAgent'
 * | 'agentLog'
 * | 'agentCrashed'
 * | 'startTest'
 * } AriaATCIHost.HostLogType
 */

/**
 * @typedef {AriaATCIShared.Log<AriaATCIHost.HostLogType>} AriaATCIHost.Log
 */

/**
 * @typedef {AriaATCIAgent.Log} AriaATCIHost.AgentLog
 */

/**
 * @typedef AriaATCIHost.TestPlan
 * @property {string} name
 * @property {'fork' | 'api' | 'unknown'} source
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
 * @typedef AriaATCIHost.ReferenceFileServer
 * @property {function(FileRecord.NamedRecord[]): AriaATCIHost.ReferenceFileServerSlice} addFiles
 * @property {function(AriaATCIHost.ReferenceFileServerSlice): void} removeFiles
 * @property {Promise<void>} ready
 */

/**
 * @typedef AriaATCIHost.ReferenceFileServerSlice
 * @property {string} {id}
 * @property {AriaATCIShared.BaseURL} baseUrl
 */

/**
 * @typedef AriaATCIHost.Agent
 * @property {function(AriaATCIData.Test): Promise<AriaATCIData.TestResult>} run
 * @property {function(AriaATCIAgent.CliOptions): Promise<void>} start
 * @property {function(): Promise<void>} stop
 */

/**
 * @callback AriaATCIHost.EmitPlanResults
 * @param {AriaATCIHost.TestPlan} plan
 * @returns {Promise<void> | void}
 */
