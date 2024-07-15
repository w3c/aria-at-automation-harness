/** @namespace AriaATCIShared */

/**
 * @template {string} Type
 * @callback AriaATCIShared.Log<Type>
 * @param {Type} type
 * @param {*} [more]
 */

/**
 * @typedef AriaATCIShared.BaseURL
 * @property {string} protocol
 * @property {string} hostname
 * @property {number | string} port
 * @property {string} pathname
 */

/**
 * @typedef AriaATCIShared.PartialBaseURL
 * @property {string} [protocol]
 * @property {string} [hostname]
 * @property {number | string} [port]
 * @property {string} [pathname]
 */

/**
 * A token to some parallelized work.
 *
 * Canceling the job will stop any loops of async iterables that have been
 * wrapped with AriaATCIShared.JobBinding#cancelable.
 *
 * @template T
 * @typedef AriaATCIShared.Job
 * @property {function(): Promise<T>} cancel
 */

/**
 * @template T
 * @typedef AriaATCIShared.JobBinding
 * @property {function(AsyncIterable<T>): AsyncIterable<T>} cancelable finish
 *   the iterable if the job is canceled
 */

/**
 * @template T
 * @callback AriaATCIShared.JobWork
 * @param {AriaATCIShared.JobBinding<*>} binding
 * @returns {Promise<T>}
 */

/**
 * @typedef AriaATCIShared.timesOption
 * @property {Number} afterNav Timeout used after navigation to collect and discard speech.
 * @property {Number} afterKeys Timeout used to wait for speech to finish after pressing keys.
 * @property {Number} testSetup Timeout used after pressing test setup button to collect and discard speech.
 * @property {Number} modeSwitch Timeout used after switching modes to check resulting speech (NVDA).
 * @property {Number} docReady Timeout used waiting for document ready (Safari).
 */
