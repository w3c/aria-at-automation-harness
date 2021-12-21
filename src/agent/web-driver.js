import { Builder } from 'selenium-webdriver';

export async function createWebDriver({ url, abortSignal }) {
  const driver = await new Builder().forBrowser('firefox').usingServer(url.toString()).build();
  abortSignal.then(() => driver.quit());
  return driver;
}
