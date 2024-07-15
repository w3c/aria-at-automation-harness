// modeSwitch - After switching modes, delay this long to receive speech.
// afterNav - Delay this long after a navigation to receive and clear speech.
// afterKeys - After pressing a key, delay this long to receive and record speech.
// testSetup - Delay this long after pressing the test setup to receive and clear speech.
// docReady - Wait this long for document to be ready (safari only).

export const timesOption = {
  afterNav: 1000,
  afterKeys: 5000,
  testSetup: 1000,
  modeSwitch: 750,
  docReady: 2000,
};

const timesDefaults = { ...timesOption };

export function timesArgs(opts = timesOption) {
  return Object.entries(opts)
    .map(([key, value]) => `${key}:${value}`)
    .join(',');
}

export const timesOptionDescription = {
  // hidden by default because it's a really long one
  hidden: true,
  default: timesArgs(timesDefaults),
  describe: 'Configure timeout and delays',
  coerce(arg) {
    if (!arg) return;
    const parts = arg.split(/,/g);
    for (const part of parts) {
      const match = part.match(/^([^:]+):(\d+)$/);
      if (!match) {
        throw new Error(`Error parsing times "${part}"`);
      }
      if (!timesOption[match[1]]) {
        throw new Error(`Unknown times param "${match[1]}"`);
      }
      timesOption[match[1]] = parseInt(match[2], 10);
    }
  },
};
