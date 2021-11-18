/**
 * @param {W} asyncWork
 * @returns {{cancel: function(): Promise<R>}}
 * @template {function({cancelable: function(AsyncIterable<T>): AsyncIterable<T>}): Promise<R>} W
 * @template T
 * @template R
 */
export function createJob(asyncWork) {
  let completed = null;
  let cancel = null;
  let canceled = false;
  const cancelToken = new Promise((resolve, reject) => {
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
                  // If this promise never resolves, we can truly cancel this iterable.
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
            async throw(...args) {
              if (iterator.throw) {
                return await iterator.throw(...args);
              }
              return { done: true };
            },
            async return(...args) {
              if (iterator.return) {
                return await iterator.return(...args);
              }
              return { done: true };
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
