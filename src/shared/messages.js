/// <reference path="./types.js" />

/**
 * @module shared
 */

import { EventEmitter } from 'events';

/**
 * @param {Object<T, (function(*): string)>} messages
 * @returns {{log: AriaATCIShared.Log<T>, emitter: EventEmitter}}
 * @template T
 */
export function _createLogger(messages) {
  const emitter = new EventEmitter();
  return {
    log(type, more) {
      const data = { type, date: new Date(), ...more };
      emitter.emit('message', { data, text: messages[type](data) });
    },
    emitter,
  };
}
