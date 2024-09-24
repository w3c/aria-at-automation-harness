import { Builder } from 'selenium-webdriver';
import { until, By } from 'selenium-webdriver';

/** @returns {Promise<AriaATCIRunner.BrowserDriver>} */
export default async (browser, serverUrl) => {
  const driver = await new Builder().forBrowser(browser).usingServer(serverUrl).build();

  return {
    async navigate(url) {
      await driver.switchTo().defaultContent();
      // Minimizing then restoring the window is recommended to trick the window
      // manager on the OS to put focus in the browser. This is needed to
      // steal focus away from a terminal/powershell tab if you launch the tests
      // locally.
      await driver.manage().window().minimize();
      await driver.manage().window().setRect({ x: 0, y: 0 });
      await driver.switchTo().defaultContent();
      await driver.navigate().to(url);
    },

    documentReady() {
      return driver.executeAsyncScript(function (callback) {
        // @ts-expect-error (The TypeScript compiler cannot be configured to
        // recognize that this function executes in another environment--one
        // where `document` is defined globally.)
        if (document.readyState === 'complete') {
          callback();
        } else {
          new Promise(resolve => {
            // @ts-expect-error (The TypeScript compiler cannot be configured
            // to recognize that this function executes in another
            // environment--one where `window` is defined globally.)
            window.addEventListener('load', () => resolve());
          })
            // Wait until after any microtasks registered by other 'load' event
            // handlers.
            .then(() => Promise.resolve())
            .then(callback);
        }
      });
    },

    async clickWhenPresent(selector, timeout) {
      const runTestSetup = await driver.wait(until.elementLocated(By.css(selector)), timeout);

      await runTestSetup.click();
    },

    async getCapabilities() {
      const capabilities = await driver.getCapabilities();
      return {
        browserName: capabilities.get('browserName'),
        browserVersion: capabilities.get('browserVersion'),
      };
    },

    async quit() {
      return driver.quit();
    },
  };
};
