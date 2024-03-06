/**
 * Data types shared between systems in this harness and used as input and output.
 * @namespace AriaATCIData
 */

// This is a copy of CollectedTest defined in
// https://github.com/w3c/aria-at/blob/master/types/aria-at-file.js.
/**
 * All the data collected into one file needed to run a test.
 * @typedef AriaATCIData.CollectedTest
 * @property {object} info
 * @property {number} info.testId
 * @property {string} info.title
 * @property {string} info.task
 * @property {string} [info.presentationNumber]
 * @property {object[]} info.references
 * @property {string} info.references[].refId
 * @property {string} info.references[].value
 * @property {object} instructions
 * @property {string[]} instructions.user
 * @property {string} [instructions.mode]
 * @property {string} instructions.raw
 * @property {object} target
 * @property {object} target.at
 * @property {string} target.at.key
 * @property {string} target.at.raw original test plan file assistive tech id
 * @property {string} target.at.name
 * @property {"interaction" | "reading"} target.mode
 * @property {string} target.referencePage
 * @property {object} [target.setupScript]
 * @property {string} target.setupScript.name
 * @property {string} target.setupScript.description
 * @property {string} target.setupScript.source load with `new Function` if supported
 * @property {string} target.setupScript.modulePath load with `import(...)` if supported
 * @property {string} target.setupScript.jsonpPath load with `<script src="...">`
 * @property {object[]} commands
 * @property {string} commands[].id
 * @property {string} commands[].keystroke human-readable sequence of key and key chord presses
 * @property {object[]} commands[].keypresses
 * @property {string} commands[].keypresses[].id
 * @property {string} commands[].keypresses[].keystroke single human-readable key or key chord press
 * @property {string} [commands[].extraInstruction] human-readable additional instruction to follow
 * @property {string} [commands[].settings] this property only exists on v2 tests
 * @property {object[]} assertions[]
 * @property {1 | 2} assertions[].priority
 * @property {string} [assertions[].expectation] assertion statement string, this property only exists on v1 tests
 * @property {string} [assertions[].assertionStatement] assertion statement string, this property only exists on v2 tests
 */

/**
 * @typedef AriaATCIData.Log
 * @property {AriaATCIData.LogTypeDateData | Object<string, *>} data
 * @property {string} text
 */

/**
 * @typedef AriaATCIData.LogTypeDateData
 * @property {string} type
 * @property {Date} date
 */

/**
 * Accepted test formats.
 * @typedef {AriaATCIData.CollectedTest} AriaATCIData.Test
 */

/**
 * Result from a test plan.
 * @typedef AriaATCIData.TestPlanResult
 * @property {string} name name of the test plan, defaults to 'unknown'
 * @property {AriaATCIData.Log[]} log debug messages emitted during execution of test plan
 * @property {object[]} tests
 * @property {string} tests[].filepath filepath of file describing the test in the test plan
 * @property {AriaATCIData.Log[]} tests[].log subset of log emitted during this single test
 * @property {AriaATCIData.TestResult[]} tests[].results
 */

/**
 * Result from a single test in a test plan.
 * @typedef AriaATCIData.TestResult
 * @property {number} testId numeric id of a test in a test plan
 * @property {object[]} commands input commands and the speech emitted
 * @property {string} commands[].command id of input command sent to system
 * @property {string} [commands[].output] speech emitted
 * @property {string[]} [commands[].errors] errors that occured while during command
 * @property {object[]} results permutation of input commands and assertions passing or not passing
 * @property {string} results[].command id of input command sent to system
 * @property {string} results[].expectation description of expected assertion
 * @property {boolean} results[].pass did command pass or not pass expectation
 */
