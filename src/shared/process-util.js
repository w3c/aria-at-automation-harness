/**
 * @module shared
 */

export function processExited(fork) {
  return new Promise((resolve, reject) => {
    fork.once('exit', (code, signal) => resolve({ code, signal }));
    fork.once('error', reject);
  });
}
