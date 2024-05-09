import createWebDriver from './create-web-driver.js';
import createSafariAppleScriptDriver from './create-safari-apple-script-driver.js';

/**
 * @param {object} options
 * @param {{toString: function(): string}} options.url
 * @param {AriaATCIAgent.Browser} [options.browser]
 * @param {Promise<void>} options.abortSignal
 *
 * @returns {Promise<BrowserDriver>}
 */
export async function createBrowserDriver({ url, browser = 'firefox', abortSignal }) {
  const driver =
    browser === 'safari'
      ? await createSafariAppleScriptDriver()
      : await createWebDriver(browser, url.toString());
  abortSignal.then(() => driver.quit());
  return driver;
}
