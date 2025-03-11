// logger.ts
import { TestResults, settings } from "./config";

// Terminal color formatting functions
export const colors = {
  red: (text: string) => `\x1b[31m${text}\x1b[0m`,
  green: (text: string) => `\x1b[32m${text}\x1b[0m`,
  yellow: (text: string) => `\x1b[33m${text}\x1b[0m`,
  blue: (text: string) => `\x1b[34m${text}\x1b[0m`,
  magenta: (text: string) => `\x1b[35m${text}\x1b[0m`,
  cyan: (text: string) => `\x1b[36m${text}\x1b[0m`,
  white: (text: string) => `\x1b[37m${text}\x1b[0m`,
  dim: (text: string) => `\x1b[2m${text}\x1b[0m`,
  bold: (text: string) => `\x1b[1m${text}\x1b[0m`,
  underline: (text: string) => `\x1b[4m${text}\x1b[0m`,
  bgRed: (text: string) => `\x1b[41m${text}\x1b[0m`,
  bgGreen: (text: string) => `\x1b[42m${text}\x1b[0m`,
  bgYellow: (text: string) => `\x1b[43m${text}\x1b[0m`,
  bgBlue: (text: string) => `\x1b[44m${text}\x1b[0m`,
};

// Log levels
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  NONE = 4,
}

// Map string log levels to enum
const LOG_LEVEL_MAP: { [key: string]: LogLevel } = {
  debug: LogLevel.DEBUG,
  info: LogLevel.INFO,
  warn: LogLevel.WARN,
  error: LogLevel.ERROR,
  none: LogLevel.NONE,
};

// Get current log level from settings
function getLogLevel(): LogLevel {
  const levelStr = settings.logLevel.toLowerCase();
  return LOG_LEVEL_MAP[levelStr] || LogLevel.INFO;
}

// Check if a message should be logged based on current log level
function shouldLog(level: LogLevel): boolean {
  return level >= getLogLevel();
}

// Helper function to log results with color
export const logResult = (
  endpoint: string,
  success: boolean,
  data: any,
  errorMsg?: string
): void => {
  if (!shouldLog(success ? LogLevel.INFO : LogLevel.ERROR)) return;

  console.log(
    `\n${
      success ? colors.green("✅ SUCCESS") : colors.red("❌ FAILED")
    } ${colors.blue(endpoint)}`
  );

  // Only log response data in verbose mode
  if (success) {
    if (settings.verbose && shouldLog(LogLevel.DEBUG)) {
      let responseData = "";
      try {
        responseData =
          JSON.stringify(data, null, 2).substring(0, 500) +
          (JSON.stringify(data, null, 2).length > 500 ? "..." : "");
      } catch (e) {
        responseData = "Data could not be stringified: " + String(e);
      }

      console.log(colors.dim("  Response:"), colors.cyan(responseData));
    }
  } else {
    // Always log errors, regardless of verbose mode (but respect log level)
    console.log(
      colors.dim("  Error:"),
      colors.red(errorMsg || "Unknown error")
    );
  }
};

// Helper function to print section headers (only if log level allows it)
export const printSection = (title: string): void => {
  if (!shouldLog(LogLevel.INFO)) return;

  // Always print section headers in verbose mode, otherwise only for ERROR or WARN
  if (settings.verbose || getLogLevel() >= LogLevel.WARN) {
    console.log(
      "\n" +
        colors.yellow(
          "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        )
    );
    console.log(colors.yellow(colors.bold(` ${title}`)));
    console.log(
      colors.yellow(
        "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
      )
    );
  }
};

// Print the test summary (always show this)
export const printSummary = (results: TestResults): void => {
  if (getLogLevel() === LogLevel.NONE) return;

  console.log(
    "\n" +
      colors.yellow(
        "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
      )
  );
  console.log(colors.yellow(colors.bold(` TEST SUMMARY`)));
  console.log(
    colors.yellow(
      "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    )
  );

  console.log(
    colors.bold(`Total tests: ${colors.white(String(results.total))}`)
  );
  console.log(
    colors.bold(`Successful: ${colors.green(String(results.success))}`)
  );
  console.log(colors.bold(`Failed: ${colors.red(String(results.failed))}`));
  console.log(
    colors.bold(`Skipped: ${colors.yellow(String(results.skipped))}`)
  );
  console.log(
    `Success rate: ${colors.yellow(
      Math.round((results.success / results.total) * 100) + "%"
    )}`
  );
  console.log(
    `Duration: ${colors.cyan(
      results.duration ? `${results.duration}ms` : "N/A"
    )}`
  );

  // Print per-suite results
  console.log("\nTest Suite Results:");
  Object.entries(results.testSuites).forEach(([suite, stats]) => {
    // Skip suites with no tests
    if (stats.total === 0 && stats.skipped === 0) return;

    const statusColor = stats.failed > 0 ? colors.red : colors.green;
    console.log(
      `  ${colors.bold(suite.padEnd(10))}: ${statusColor(
        `${stats.success}/${stats.total}`
      )} passed` +
        (stats.failed > 0 ? `, ${colors.red(`${stats.failed}`)} failed` : "") +
        (stats.skipped > 0
          ? `, ${colors.yellow(`${stats.skipped}`)} skipped`
          : "")
    );
  });

  if (results.failed === 0) {
    console.log(
      colors.green(colors.bold("\n✨ All tests passed successfully!\n"))
    );
  } else {
    console.log(
      colors.yellow(
        colors.bold(
          `\n⚠️ ${results.failed} test(s) failed. Please check the logs above.\n`
        )
      )
    );
  }
};

// Log debug messages (only in debug mode)
export const logDebug = (message: string): void => {
  if (shouldLog(LogLevel.DEBUG)) {
    console.log(colors.dim(`[DEBUG] ${message}`));
  }
};

// Log a progress message (only in info or debug mode)
export const logProgress = (message: string): void => {
  if (shouldLog(LogLevel.INFO)) {
    console.log(colors.dim(`\n${message}`));
  }
};

// Log a warning message
export const logWarning = (message: string): void => {
  if (shouldLog(LogLevel.WARN)) {
    console.log(colors.yellow(`\n⚠️ ${message}`));
  }
};

// Log an error message
export const logError = (message: string, error?: unknown): void => {
  if (shouldLog(LogLevel.ERROR)) {
    console.log(colors.red(`\n❌ ERROR: ${message}`));
    if (error) {
      if (error instanceof Error) {
        console.log(colors.red(`   ${error.message}`));
        if (error.stack && settings.verbose) {
          console.log(colors.dim(`   ${error.stack}`));
        }
      } else {
        console.log(colors.red(`   ${String(error)}`));
      }
    }
  }
};

// Log a verbose-only message
export const logVerbose = (message: string): void => {
  if (shouldLog(LogLevel.DEBUG) && settings.verbose) {
    console.log(colors.dim(message));
  }
};

// Log a message that is always shown (unless log level is NONE)
export const logAlways = (message: string): void => {
  if (getLogLevel() < LogLevel.NONE) {
    console.log(message);
  }
};
