/// <reference path="../shared/file-record.js" />
/// <reference path="../shared/types.js" />

/**
 * @typedef Host
 * @property {string} hostId a unique id
 * @property {Feature[]} features
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
 * } HostLogType
 */

/**
 * @typedef {AriaATCIShared.Log<HostLogType>} AriaATCIHost.Log
 */

/**
 * @typedef {'exists' | 'queued' | 'performing' | 'canceled' | 'finished'} TestPlanJobStatus
 */

/**
 * @typedef TestPlanJob
 * @property {string} jobId
 * @property {TestPlan} plan
 * @property {TestResult[]} results
 * @property {AgentLog} log
 */

/**
 * @typedef TestPlan
 * @property {string} id
 * @property {TestPlanTask[]} tasks
 */

/**
 * @typedef TestPlanTask
 * @property {string} id
 * @proprety {*} data
 */

/**
 * @typedef TestTaskResult
 * @property {string} id
 * @property {*} data
 */

/**
 * @typedef {'start' | 'uncaughtError' | 'willStop'} AgentLogType
 */

/**
 * @typedef {Log<AgentLogType>} AgentLog
 */

/**
 * @typedef Agent
 */

/**
 * @typedef {'browser'
 *   | 'operatingSystem'
 *   | 'screenReader'
 * } FeatureType
 */

/**
 * @typedef Feature
 * @property {FeatureType} type
 * @property {string} fullName
 * @property {string} fullVersion
 * @property {string} [shortName] shortened name from a list of known names
 * @property {string} [shortVersion] shortened version from a list of known versions
 */

/**
 * @typedef FeatureFilter
 */

/**
 * @typedef AriaATCIHost.TestPlan
 * @property {string} name
 * @property {'fork' | 'shell' | 'api' | 'stream' | 'unknown'} source
 * @property {object} serverOptions
 * @property {AriaATCIShared.BaseURL} serverOptions.baseUrl
 * @property {object[]} tests
 * @property {string} tests[].filepath
 * @property {number[]} tests[].log
 * @property {Array} tests[].results
 * @property {FileRecord.NamedRecord[]} files
 * @property {AriaATCIShared.Log[]} log
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
 * @property {function(Uint8Array): Promise<{}>} run
 * @property {function(): Promise<void>} start
 * @property {function(): Promise<void>} stop
 */

/**
 * @typedef {function(AriaATCIHost.TestPlan): Promise<void> | void} AriaATCIHost.EmitPlanResults
 */
