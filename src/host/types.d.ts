declare namespace AriaATCIHost {
  export type HostLogType =
    | 'start'
    | 'uncaughtError'
    | 'willStop'
    | 'startServer'
    | 'planRead'
    | 'serverListening'
    | 'stopServer'
    | 'stopDrivers'
    | 'addServerDirectory'
    | 'removeServerDirectory'
    | 'serverLog'
    | 'startTest'
    | 'reportingError'
    | 'testError'
    | 'atDriverComms'
    | 'openPage'
    | 'pressKeys'
    | 'speechEvent'
    | 'invalidKeys'
    | 'noRunTestSetup'
    | 'capabilities';

  export type Log = AriaATCIShared.Log<HostLogType>;

  export interface Logger {
    log: Log;
    emitter: typeof import('events').EventEmitter;
  }

  export interface TestPlan {
    name: string;
    serverOptions: {
      baseUrl: AriaATCIShared.BaseURL;
    };
    tests: Array<{
      id: string;
      filepath: string;
      log: number[];
      results: any[];
    }>;
    files: FileRecord.NamedRecord[];
    log: AriaATCIData.Log[];
  }

  export interface TestPlanServerOptionsPartial {
    baseUrl?: AriaATCIShared.BaseURL;
  }

  export interface ReferenceFileServer {
    addFiles: (files: FileRecord.NamedRecord[]) => ReferenceFileServerSlice;
    removeFiles: (slice: ReferenceFileServerSlice) => void;
    close: () => Promise<void>;
    ready: Promise<void>;
    baseUrl: string;
  }

  export interface ReferenceFileServerSlice {
    id: string;
    baseUrl: AriaATCIShared.BaseURL;
  }

  export type EmitPlanResults = (plan: TestPlan) => Promise<void> | void;
}
