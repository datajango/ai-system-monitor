// config.ts
import axios, { AxiosInstance } from "axios";

// Configuration constants
export const DEFAULT_API_BASE_URL = "http://localhost:3000/api/v1";
export const DEFAULT_ROOT_URL = "http://localhost:3000";
export const DEFAULT_REQUEST_TIMEOUT = 10000; // 10 seconds

// Enhanced application settings
export interface AppSettings {
  verbose: boolean;
  snapshotDir: string;
  logLevel: string;
  apiUrl?: string;
  rootUrl?: string;
  timeout?: number;
  testSuites: string[];
  skipCleanup: boolean;
  outputFormat: "pretty" | "json";
  outputFile?: string;
  concurrency: number;
  retries: number;
}

export const settings: AppSettings = {
  verbose: false,
  snapshotDir: "",
  logLevel: "info",
  testSuites: ["server", "system", "files", "config"],
  skipCleanup: false,
  outputFormat: "pretty",
  concurrency: 1,
  retries: 0,
};

// Computed configuration values
export const API_BASE_URL = (): string =>
  settings.apiUrl || DEFAULT_API_BASE_URL;
export const ROOT_URL = (): string => settings.rootUrl || DEFAULT_ROOT_URL;
export const REQUEST_TIMEOUT = (): number =>
  settings.timeout || DEFAULT_REQUEST_TIMEOUT;

// Create axios instance with configurable timeout
export const getApiClient = (): AxiosInstance => {
  const client = axios.create({
    timeout: REQUEST_TIMEOUT(),
  });

  // Add retry capability
  if (settings.retries > 0) {
    client.interceptors.response.use(undefined, async (error) => {
      const config = error.config;

      // Create retry count if it doesn't exist
      if (!config._retryCount) {
        config._retryCount = 0;
      }

      // Check if we should retry
      if (config._retryCount < settings.retries) {
        config._retryCount += 1;

        // Wait using exponential backoff
        const delay = Math.pow(2, config._retryCount) * 1000;
        await sleep(delay);

        // Retry the request
        return client(config);
      }

      // All retries failed, reject with the last error
      return Promise.reject(error);
    });
  }

  return client;
};

// Initialize api client
export let api: AxiosInstance = getApiClient();

// Result tracking interface
export interface TestResults {
  total: number;
  success: number;
  failed: number;
  skipped: number;
  startTime: Date;
  endTime?: Date;
  duration?: number;
  testSuites: {
    [key: string]: {
      total: number;
      success: number;
      failed: number;
      skipped: number;
    };
  };
}

// Helper function to get error message from unknown error
export const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) return error.message;
  return String(error);
};

// Helper function to wait for a specified time
export const sleep = (ms: number): Promise<void> => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

// Initialize an empty test results object
export const createResultsTracker = (): TestResults => {
  return {
    total: 0,
    success: 0,
    failed: 0,
    skipped: 0,
    startTime: new Date(),
    testSuites: {
      server: { total: 0, success: 0, failed: 0, skipped: 0 },
      system: { total: 0, success: 0, failed: 0, skipped: 0 },
      files: { total: 0, success: 0, failed: 0, skipped: 0 },
      config: { total: 0, success: 0, failed: 0, skipped: 0 },
    },
  };
};

// Update test results with test suite tracking
export const updateResults = (
  results: TestResults,
  success: boolean,
  suiteName: string = "unknown"
): void => {
  results.total++;

  // Update overall results
  if (success) {
    results.success++;
  } else {
    results.failed++;
  }

  // Update suite-specific results
  if (!results.testSuites[suiteName]) {
    results.testSuites[suiteName] = {
      total: 0,
      success: 0,
      failed: 0,
      skipped: 0,
    };
  }

  results.testSuites[suiteName].total++;
  if (success) {
    results.testSuites[suiteName].success++;
  } else {
    results.testSuites[suiteName].failed++;
  }
};

// Finalize test results
export const finalizeResults = (results: TestResults): TestResults => {
  results.endTime = new Date();
  results.duration = results.endTime.getTime() - results.startTime.getTime();
  return results;
};

// Initialize and update API client when settings change
export const refreshApiClient = (): void => {
  api = getApiClient();
};
