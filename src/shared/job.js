// @ts-nocheck
/// <reference path="types.js" />

/**
 * @module shared
 */

/**
 * Start parallelized work that can be canceled at a later time.
 *
 * @param {W} asyncWork
 * @returns {R}
 * @template T
 * @template {AriaATCIShared.JobWork<T>} W
 * @template {AriaATCIShared.Job<T>} R
 */
export function startJob(asyncWork) {
  let completed = null;
  let cancel = null;
  let canceled = false;
  const cancelToken = new Promise(resolve => {
    cancel = () => {
      canceled = true;
      resolve({ done: true });
      return completed;
    };
  });

  const privateSignal = {
    cancelable(iterable) {
      return {
        [Symbol.asyncIterator]() {
          if (canceled) {
            return {
              async next() {
                return { done: true };
              },
            };
          }

          const iterator = iterable[Symbol.asyncIterator]();
          return {
            async next() {
              return await Promise.race([
                (async () => {
                  // If this promise never resolves, this wrapped iterable may
                  // not be cancelable. Depending on how its implemented there
                  // isn't an interface from here to stop what it is trying to
                  // do.
                  const next = await iterator.next();
                  if (canceled) {
                    if (iterator.return) {
                      await iterator.return();
                    }
                    return { done: true };
                  }
                  return next;
                })(),
                cancelToken,
              ]);
            },
            async throw(error) {
              if (iterator.throw) {
                return await iterator.throw(error);
              }
              throw error;
            },
            async return(value) {
              if (iterator.return) {
                return await iterator.return(value);
              }
              return { value, done: true };
            },
          };
        },
      };
    },
  };
  const publicSignal = {
    cancel,
  };

  completed = asyncWork(privateSignal);

  return publicSignal;
}
