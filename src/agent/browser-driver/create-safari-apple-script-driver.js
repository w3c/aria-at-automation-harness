/** @returns {Promise<BrowserDriver>} */
export default async () => {
  return {
    async navigate(url) {},
    async documentReady() {},
    async clickWhenPresent(selector, timeout) {},
    async getCapabilities() {
      return {
        browserName: 'safari',
        browserVersion: 'not a real version', // TODO(jugglinmike)
      };
    },
    async quit() {},
  };
};
