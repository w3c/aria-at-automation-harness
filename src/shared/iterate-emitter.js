/**
 * @module shared
 */

/**
 * @param {import("events").EventEmitter} emitter
 * @param {string} nextEvent
 * @param {string} [completeEvent]
 * @param {string} [errorEvent]
 */
export async function* iterateEmitter(emitter, nextEvent, completeEvent, errorEvent) {
  const values = [];
  let open = true;
  let error = null;
  let resolve = (_any = undefined) => {};
  const onnext = function (value) {
    if (open) {
      values.push(value);
    }
    resolve();
  };
  const oncomplete = function () {
    open = false;
    resolve();
  };
  const onerror = function (_error) {
    open = false;
    error = _error;
    resolve();
  };
  try {
    if (nextEvent) {
      emitter.on(nextEvent, onnext);
    }
    if (completeEvent) {
      emitter.on(completeEvent, oncomplete);
    }
    if (errorEvent) {
      emitter.on(errorEvent, onerror);
    }
    while (open || values.length > 0) {
      while (values.length > 0) {
        yield values.shift();
      }
      if (open) {
        await new Promise(_resolve => {
          resolve = _resolve;
        });
      }
    }
    if (error) {
      throw error;
    }
  } finally {
    if (nextEvent) {
      emitter.removeListener(nextEvent, onnext);
    }
    if (completeEvent) {
      emitter.removeListener(completeEvent, oncomplete);
    }
    if (errorEvent) {
      emitter.removeListener(errorEvent, onerror);
    }
  }
}
