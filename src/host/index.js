// @ts-nocheck
/**
 * @module host
 */

import { parse } from './cli.js';

export async function runCli(argv = process.argv) {
  const { stdin, stdout, stderr } = process;
  return await parse({
    argv,
    signals: process,
    send: process.send ? process.send.bind(process) : null,
    stdin,
    stdout,
    stderr,
  });
}
