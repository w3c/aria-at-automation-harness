import { Builder } from 'selenium-webdriver';

/**
 *
 * @param {object} options
 * @param {{toString: function(): string}} options.url
 * @param {Promise<void>} options.abortSignal
 */
export async function createWebDriver({ url, abortSignal }) {
  const driver = await new Builder().forBrowser('firefox').usingServer(url.toString()).build();
  abortSignal.then(() => driver.quit());
  return driver;
}
