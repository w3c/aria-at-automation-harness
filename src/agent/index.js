// @ts-nocheck
/**
 * @module agent
 */

import { parseAgentCli } from './cli.js';

export async function runCli(argv = process.argv) {
  const { stdin, stdout, stderr } = process;
  return await parseAgentCli({
    argv,
    signals: process,
    send: process.send ? process.send.bind(process) : null,
    stdin,
    stdout,
    stderr,
  });
}
