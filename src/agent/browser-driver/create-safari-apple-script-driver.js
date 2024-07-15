import { execFile } from 'child_process';
import { timesOption } from '../../shared/times-option.js';

/**
 * @param {string} source
 * @returns {Promise<string>}
 * @throws
 */
const execScript = async source => {
  return new Promise((resolve, reject) => {
    const child = execFile('/usr/bin/osascript', [], {}, (e, stdout) => {
      if (e) {
        return reject(e);
      }

      if (!stdout) {
        resolve('');
      } else {
        resolve(stdout.trim());
      }
    });

    if (!child.stdin) {
      throw new Error('Missing stdin pipe');
    }

    child.stdin.write(source);
    child.stdin.end();
  });
};

/**
 * @param {string} source
 * @returns {Promise<any>}
 */
const evalJavaScript = source => {
  // TODO(jugglinmike): Verify the appropriateness of the following use of the
  // "document" parameter for "do JavaScript".
  return execScript(`tell application "Safari"
    do JavaScript ${JSON.stringify(source)} in document 1
  end tell`);
};

export default async () => {
  await execScript(`tell application "Safari"
    if documents = {} then make new document
    activate
  end tell`);

  return {
    async navigate(url) {
      await execScript(`tell application "Safari"
        open location "${url}"
        activate
      end tell`);
    },

    async documentReady() {
      const start = Date.now();

      while (Date.now() - start < timesOption.docReady) {
        const readyState = await evalJavaScript('document.readyState');
        if (readyState === 'complete') {
          return;
        }
      }
      throw new Error('Timed out while waiting for document to be ready.');
    },

    async clickWhenPresent(selector, timeout) {
      const start = Date.now();
      const source = `
        const elem = document.querySelector('${selector}');
        if (elem) {
          elem.click();
          true;
        }`;

      while (Date.now() - start < timeout) {
        const clicked = await evalJavaScript(source);
        if (clicked === 'true') {
          return;
        }
      }
      throw new Error(`Timed out while waiting to click button at "${selector}".`);
    },

    async getCapabilities() {
      const browserVersion = await execScript(`tell application "Safari"
        version
      end tell`);
      return {
        browserName: 'safari',
        browserVersion,
      };
    },

    async quit() {
      await execScript('quit app "Safari"');
    },
  };
};
