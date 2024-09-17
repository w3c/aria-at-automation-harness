export namespace AriaATCIShared {
  export type Log<Type extends string> = (type: Type, more?: any) => void;

  export interface BaseURL {
    protocol: string;
    hostname: string;
    port: number | string;
    pathname: string;
  }

  export interface PartialBaseURL {
    protocol?: string;
    hostname?: string;
    port?: number | string;
    pathname?: string;
  }

  /**
   * A token for some parallelized work.
   * Canceling the job will stop any loops of async iterables that have been
   * wrapped with AriaATCIShared.JobBinding#cancelable.
   */
  export interface Job<T> {
    cancel: () => Promise<T>;
  }

  /**
   * A binding for some parallelized work.
   */
  export interface JobBinding<T> {
    cancelable: (iterable: AsyncIterable<T>) => AsyncIterable<T>;
  }

  /**
   * The work to be done in a job.
   */
  export type JobWork<T> = (binding: JobBinding<any>) => Promise<T>;

  export interface TimesOption {
    /**
     * Timeout used after navigation to collect and discard speech.
     */
    afterNav: number;
    /**
     * Timeout used to wait for speech to finish after pressing keys.
     */
    afterKeys: number;
    /**
     * Timeout used after pressing test setup button to collect and discard speech.
     */
    testSetup: number;
    /**
     * Timeout used after switching modes to check resulting speech (NVDA).
     */
    modeSwitch: number;
    /**
     * docReady Timeout used waiting for document ready (Safari).
     */
    docReady: number;
  }
}
