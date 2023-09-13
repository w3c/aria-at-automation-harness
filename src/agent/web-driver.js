import { Builder } from 'selenium-webdriver';

/**
 * @param {object} options
 * @param {{toString: function(): string}} options.url
 * @param {AriaATCIAgent.Browser} [options.browser]
 * @param {Promise<void>} options.abortSignal
 */
export async function createWebDriver({ url, browser = 'firefox', abortSignal }) {
  const driver = await new Builder().forBrowser(browser).usingServer(url.toString()).build();
  abortSignal.then(() => driver.quit());
  return driver;
}
