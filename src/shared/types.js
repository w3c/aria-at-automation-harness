// @ts-nocheck
/** @namespace AriaATCIShared */

/**
 * @callback AriaATCIShared.Log
 * @param {Type} type
 * @param {*} [more]
 * @template {string} Type
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
 * @typedef AriaATCIShared.Job
 * @property {function(): Promise<T>} cancel
 * @template T
 */

/**
 * @typedef AriaATCIShared.JobBinding
 * @property {function(AsyncIterable<T>): AsyncIterable<T>} cancelable finish
 *   the iterable if the job is canceled
 * @template T
 */

/**
 * @callback AriaATCIShared.JobWork
 * @param {AriaATCIShared.JobBinding<*>} binding
 * @returns {Promise<T>}
 * @template T
 */
