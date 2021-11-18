/// <reference path="types.js" />

import { Readable } from 'stream';

import express from 'express';

import { HostMessage } from './messages.js';

export class Server {
  constructor(serverOptions) {
    this.options = serverOptions;

    this.log = this.options.log;

    this._directories = new Map();

    this._app = express();
    this._app.use('/:directory', this._request.bind(this));

    this._server = null;

    this.baseUrl = new BaseUrl({
      protocol: 'http',
      hostname: 'localhost',
      port: -1,
      pathname: '',
    });
    this.port = -1;

    this.ready = (async () => {
      this._server = await new Promise((resolve, reject) => {
        const server = this._app.listen(0, () => resolve(server));
        server.on('error', error => reject(error));
      });

      const address = this._server.address();
      if (typeof address === 'string') {
        throw new Error('unexpected string address');
      }

      this.port = address.port;
      this.baseUrl.port = this.port;
    })();
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
    Readable.from(file.buffer).pipe(response.sendStatus(200));
  }

  addFiles(files) {
    // Random 6 character string containing numbers and lowercase letters. 2,176,782,335 Possible values.
    const id = Array.from({ length: 6 }, () =>
      (Math.random() * 36).toString(36).substring(0, 1)
    ).join('');
    /** @type {AriaATCIShared.BaseURL} */
    const baseUrl = new BaseUrl({ ...this.baseUrl, pathname: `/${id}` });
    const directory = new ServerDirectory({ id, baseUrl, files });
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

class ServerDirectory {
  constructor({ id, baseUrl, files }) {
    /** @type {string} */
    this.id = id;
    /** @type {AriaATCIShared.BaseURL} */
    this.baseUrl = baseUrl;
    /** @type {FileRecord.NamedRecord} */
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

class BaseUrl {
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
