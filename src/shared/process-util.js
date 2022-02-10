/**
 * @module shared
 */

import { iterateEmitter } from './iterate-emitter.js';
import { startJob } from './job.js';

export function processExited(fork) {
  return new Promise((resolve, reject) => {
    fork.once('exit', (code, signal) => resolve({ code, signal }));
    fork.once('error', reject);
  });
}

const MAX_COLLECT_PIPE_BYTES = 4096;
export function collectProcessPipe(readable, { maxKeptBytes = MAX_COLLECT_PIPE_BYTES } = {}) {
  return startJob(async function ({ cancelable }) {
    let bytes = 0;
    const carry = [];
    for await (const buffer of cancelable(iterateEmitter(readable, 'data', 'end', 'error'))) {
      bytes += buffer.length;
      carry.push(buffer);

      while (bytes > maxKeptBytes) {
        const firstBuffer = carry[0];
        if (bytes - firstBuffer.length <= maxKeptBytes) {
          const difference = bytes - maxKeptBytes;
          carry[0] = firstBuffer.slice(difference);
          bytes -= difference;
        } else {
          carry.shift();
          bytes -= firstBuffer.length;
        }
      }
    }
    return carry.join('');
  });
}
