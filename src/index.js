'use strict';

const {Builder, By, Key, until} = require('selenium-webdriver');
const child_process= require('child_process');

// Loading the `geckodriver` module updates the process's PATH environment
// variable to include the directory where the geckodriver binary is stored.
require('geckodriver');

const syntheticTypingPath = process.argv[2];

function type(sequence) {
  const child = child_process.spawn(syntheticTypingPath, [sequence]);

  return new Promise((resolve, reject) => {
    child.on('error', reject);
    child.on('exit', (exitCode) => {
      if (exitCode === 0) {
        resolve();
      } else {
        reject(new Error(`Failed to type ${sequence}`));
      }
    });
  });
}

(async function example() {
  const driver = await new Builder()
    .forBrowser('firefox')
    .build();

  try {
    await driver.get('http://www.google.com/ncr');

    // The search input element receives focus during page load, so a search
    // term can be entered immediately.
    await type('a,r,i,a');
    // Switch to NVDA's "browse mode", navigate to the "Google Search" button,
    // and use it to submit the form.
    await type('CapsLock+Space,b,b,b,Shift+b,Enter');

    await driver.wait(until.titleIs('aria - Google Search'), 1000);
  } finally {
    await driver.quit();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
