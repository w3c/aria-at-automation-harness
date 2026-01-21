import { RunnerMessage } from '../../runner/messages.js';
import { HostMessage } from '../messages.js';

export async function verbose(argv) {
  const { debug, quiet, verbose } = argv;

  let verbosity;
  if (debug) {
    verbosity = Object.values({ ...HostMessage, ...RunnerMessage });
  } else if (quiet) {
    verbosity = [];
  } else {
    verbosity = Array.isArray(verbose)
      ? verbose
      : [
          HostMessage.START,
          HostMessage.UNCAUGHT_ERROR,
          HostMessage.WILL_STOP,
          HostMessage.SERVER_LISTENING,
          HostMessage.ADD_SERVER_DIRECTORY,
          HostMessage.REMOVE_SERVER_DIRECTORY,
          HostMessage.UNCAUGHT_ERROR,
          RunnerMessage.OPEN_PAGE,
        ];
  }

  argv.verbosity = verbosity;
}
