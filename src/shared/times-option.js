/// <reference path="./types.js" />

/**
 * @module shared
 */

/**
 * @type AriaATCIShared.timesOption
 */
export const timesOption = {
  afterNav: 1000,
  afterKeys: 5000,
  testSetup: 1000,
  modeSwitch: 750,
  docReady: 2000,
};

/**
 * @type AriaATCIShared.timesOption
 */
const timesDefaults = { ...timesOption };

/**
 * Convert from 'afterNav' to 'time-after-nav'.
 * @param {keyof AriaATCIShared.timesOption} optionName
 * @returns String
 */
function makeSnakeCasedOption(optionName) {
  const snakeCased = optionName.replace(/[A-Z]/g, cap => '-' + cap.toLowerCase());
  const optionText = `time-${snakeCased}`;
  return optionText;
}

/**
 * Create a yargs description for the specified timesOption.
 * @param {keyof AriaATCIShared.timesOption} optionName Key from timesOption
 * @param {String} describe Description to be used in --show-help
 */
function addOptionConfig(optionName, describe) {
  timesOptionsConfig[makeSnakeCasedOption(optionName)] = {
    hidden: true,
    default: timesOption[optionName],
    describe,
    coerce(arg) {
      const isNumber = typeof arg === 'number';
      if (!isNumber && !arg.match(/^\d+$/)) {
        throw new Error('option value not a number');
      }
      const time = isNumber ? arg : parseInt(arg, 10);
      if (time <= 0) {
        throw new Error('time must be positive and non-zero');
      }
      timesOption[optionName] = time;
    },
  };
}

/**
 * the yargs configuration for the time options
 */
export const timesOptionsConfig = {};
addOptionConfig('afterNav', 'Timeout used after navigation to collect and discard speech.');
addOptionConfig('afterKeys', 'Timeout used to wait for speech to finish after pressing keys.');
addOptionConfig(
  'testSetup',
  'Timeout used after pressing test setup button to collect and discard speech.'
);
addOptionConfig(
  'modeSwitch',
  'Timeout used after switching modes to check resulting speech (NVDA).'
);
addOptionConfig('docReady', 'Timeout used waiting for document ready (Safari).');

/**
 * Convert the times dictionary to an array of strings to pass back to args.
 * @param {AriaATCIShared.timesOption} opts
 * @returns [string]
 */
export function timesArgs(opts = timesOption) {
  const args = [];
  for (const key of Object.keys(timesOption)) {
    const value = timesOption[key];
    // no need to pass on "default" value
    if (value === timesDefaults[key]) continue;
    // casting in jsdoc syntax is complicated - the extra () around key are
    // required to make the type annotation work.
    args.push(makeSnakeCasedOption(/** @type {keyof AriaATCIShared.timesOption} */ (key)));
    args.push(String(value));
  }
  return args;
}
