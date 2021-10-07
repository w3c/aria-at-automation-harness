/**
 * @module agent
 */

import { parse } from './cli';

export function runCli(argv = process.argv) {
  const { stdin, stdout, stderr } = process;
  return parse({
    argv,
    signals: process,
    send: process.send ? process.send.bind(process) : null,
    stdin,
    stdout,
    stderr,
  });
}
