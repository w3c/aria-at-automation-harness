import createWebDriver from './create-web-driver.js';
import createSafariAppleScriptDriver from './create-safari-apple-script-driver.js';

/**
 * @param {object} options
 * @param {{toString: function(): string}} options.url
 * @param {AriaATCIRunner.Browser} [options.browser]
 * @param {Promise<void>} options.abortSignal
 * @param {AriaATCIShared.timesOption} options.timesOption
 *
 * @returns {Promise<AriaATCIRunner.BrowserDriver>}
 */
export async function createBrowserDriver({ url, browser = 'firefox', abortSignal, timesOption }) {
  const driver =
    browser === 'safari'
      ? await createSafariAppleScriptDriver(timesOption)
      : await createWebDriver(browser, url.toString());
  abortSignal.then(() => driver.quit());
  return driver;
}
