import { AriaATCIShared } from '../shared/types';

declare namespace AriaATCIRunner {
  type Message =
    | 'start'
    | 'uncaughtError'
    | 'willStop'
    | 'startTest'
    | 'openPage'
    | 'invalidKeys'
    | 'pressKeys'
    | 'speechEvent'
    | 'noRunTestSetup'
    | 'atDriverComms'
    | 'capabilities';

  type Log = AriaATCIShared.Log<Message>;

  type TestIterable = AsyncIterable<AriaATCIData.Test>;

  interface TestRunner {
    run(test: AriaATCIData.Test): Promise<AriaATCIData.TestResult>;
  }

  type ReportResult = (result: AriaATCIData.TestResult) => Promise<void>;

  type Browser = 'chrome' | 'firefox' | 'safari';

  interface CliOptions {
    debug?: boolean;
    quiet?: boolean;
    verbose?: Message[];
    referenceBaseUrl?: AriaATCIShared.BaseURL;
    mock?: boolean;
    webDriverUrl?: AriaATCIShared.BaseURL;
    webDriverBrowser?: Browser;
    atDriverUrl?: AriaATCIShared.BaseURL;
    timesOption?: AriaATCIShared.TimesOption;
  }

  interface BrowserCapabilities {
    browserName: string;
    browserVersion: string;
  }

  interface BrowserDriver {
    navigate(url: string): Promise<void>;
    documentReady(): Promise<void>;
    clickWhenPresent(selector: string, timeout: number): Promise<void>;
    getCapabilities(): Promise<BrowserCapabilities>;
    quit(): Promise<void>;
  }
}
