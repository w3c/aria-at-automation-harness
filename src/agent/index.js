/**
 * @module agent
 */

import { parse } from './cli';

export function runCli(argv = process.argv) {
  const { stdin, stdout, stderr } = process;
  return parse({
    argv,
    signals: process,
    postMessage: process.postMessage ? process.postMessage.bind(process) : null,
    stdin,
    stdout,
    stderr,
  });
}
