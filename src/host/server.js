/**
 * @module host
 */

import { Readable } from 'stream';

import express from 'express';

import { HostMessage } from './messages.js';

const defaultBaseUrl = {
  protocol: 'http',
  hostname: 'localhost',
  port: -1,
  pathname: '',
};

export class HostServer {
  /**
   * @param {object} serverOptions
   * @param {AriaATCIHost.Log} serverOptions.log
   * @param {AriaATCIShared.PartialBaseURL} [serverOptions.baseUrl]
   */
  constructor(serverOptions) {
    this.options = serverOptions;

    /** @type {AriaATCIHost.Log} */
    this.log = this.options.log;

    /** @type {Map<string, HostServerDirectory>} */
    this._directories = new Map();

    /** @type {express.Express} */
    this._app = express();
    this._app.use('/:directory', this._request.bind(this));

    this._server = null;

    /** @type {HostServerBaseURL} */
    this.baseUrl = new HostServerBaseURL({ ...defaultBaseUrl, ...this.options.baseUrl });

    /** @type {Promise<void>} */
    this.ready = (async () => {
      this._server = await new Promise((resolve, reject) => {
        const server = this._app.listen(0, () => resolve(server));
        server.on('error', reject);
      });

      const address = this._server.address();
      if (typeof address === 'string') {
        throw new Error('unexpected string address');
      }

      this.port = address.port;
    })();
  }

  get port() {
    return this.baseUrl.port;
  }

  set port(value) {
    this.baseUrl.port = value;
  }

  /**
   * @param {express.Request} request
   * @param {express.Response} response
   */
  _request(request, response) {
    this.log(HostMessage.SERVER_LOG, { text: `Serving '${request.originalUrl}'.` });
    const directory = this._directories.get(request.params.directory);
    if (!directory) {
      this.log(HostMessage.SERVER_LOG, {
        text: `Directory '${request.params.directory}' not found. Current directories: ${Array.from(
          this._directories.keys()
        ).join(', ')}.`,
      });
      response.sendStatus(404).end();
      return;
    }
    const file = directory.find(request.path.substring(1));
    if (!file) {
      this.log(HostMessage.SERVER_LOG, {
        text: `File '${request.path}' not found in directory '${request.params.directory}'.`,
      });
      response.sendStatus(404).end();
      return;
    }
    response.statusCode = 200;
    Readable.from(Buffer.from(file.bufferData)).pipe(response);
  }

  addFiles(files) {
    // Random 6 character string containing numbers and lowercase letters. 2,176,782,335 Possible values.
    const id = Array.from({ length: 6 }, () =>
      (Math.random() * 36).toString(36).substring(0, 1)
    ).join('');
    /** @type {AriaATCIShared.BaseURL} */
    const baseUrl = new HostServerBaseURL({ ...this.baseUrl, pathname: `/${id}` });
    const directory = new HostServerDirectory({ id, baseUrl, files });
    this._directories.set(id, directory);
    return directory;
  }

  removeFiles(directory) {
    this._directories.delete(directory.id);
  }

  async close() {
    await new Promise(resolve => this._server.close(resolve));
  }
}

class HostServerDirectory {
  /**
   * @param {object} options
   * @param {string} options.id
   * @param {AriaATCIShared.BaseURL} options.baseUrl
   * @param {FileRecord.NamedRecord[]} options.files
   */
  constructor({ id, baseUrl, files }) {
    /** @type {string} */
    this.id = id;
    /** @type {AriaATCIShared.BaseURL} */
    this.baseUrl = baseUrl;
    /** @type {FileRecord.NamedRecord[]} */
    this._files = files;
  }

  find(name) {
    for (const file of this._files) {
      if (file.name === name) {
        return file;
      }
    }
  }
}

/**
 * @implements {AriaATCIShared.BaseURL}
 */
class HostServerBaseURL {
  /**
   * @param {object} url
   * @param {string} url.protocol
   * @param {string} url.hostname
   * @param {string|number} url.port
   * @param {string} url.pathname
   */
  constructor({ protocol, hostname, port, pathname }) {
    this.protocol = protocol;
    this.hostname = hostname;
    this.port = port;
    this.pathname = pathname;
  }

  toString() {
    return `${this.protocol}://${this.hostname}:${this.port}${this.pathname}`;
  }
}
