// cli-parser.ts
import { program } from "commander";
import { settings } from "./config";
import { colors } from "./logger";

export interface CliOptions {
  verbose: boolean;
  snapshotDir?: string;
  logLevel: string;
  apiUrl?: string;
  timeout?: number;
  testSuites?: string[];
  skipCleanup: boolean;
  outputFormat: "pretty" | "json";
  outputFile?: string;
  concurrency: number;
  retries: number;
}

export function parseCliArguments(): CliOptions {
  program
    .name("system-monitor-test")
    .description("Test runner for System Monitor API")
    .version("1.0.0");

  program
    .option(
      "-v, --verbose",
      "Enable verbose output with detailed response logging"
    )
    .option(
      "--snapshot-dir <dir>",
      "Specify snapshot directory for validation against actual files"
    )
    .option(
      "--log-level <level>",
      "Set logging level (debug, info, warn, error)",
      "info"
    )
    .option("--api-url <url>", "Override API base URL", process.env.API_URL)
    .option(
      "--timeout <ms>",
      "API request timeout in milliseconds",
      parseInt,
      10000
    )
    .option(
      "--test-suites <suites>",
      "Comma-separated list of test suites to run (server,system,files,config)",
      "server,system,files,config"
    )
    .option("--skip-cleanup", "Skip cleanup of test snapshots", false)
    .option(
      "--output-format <format>",
      "Output format (pretty, json)",
      "pretty"
    )
    .option("--output-file <file>", "Write test results to file")
    .option("--concurrency <num>", "Number of concurrent requests", parseInt, 1)
    .option(
      "--retries <num>",
      "Number of retries for failed requests",
      parseInt,
      0
    );

  program.addHelpText(
    "after",
    `
Examples:
  $ ts-node test-api.ts --verbose
  $ ts-node test-api.ts --snapshot-dir /path/to/snapshots
  $ ts-node test-api.ts --test-suites server,system --skip-cleanup
  $ ts-node test-api.ts --output-format json --output-file results.json
  `
  );

  program.parse();

  const options = program.opts();

  // Update settings from options
  settings.verbose = options.verbose || false;
  settings.snapshotDir = options.snapshotDir || "";
  settings.logLevel = options.logLevel || "info";
  settings.apiUrl = options.apiUrl;
  settings.timeout = options.timeout;
  settings.skipCleanup = options.skipCleanup || false;
  settings.outputFormat = options.outputFormat;
  settings.outputFile = options.outputFile;
  settings.concurrency = options.concurrency || 1;
  settings.retries = options.retries || 0;

  // Parse test suites
  if (options.testSuites) {
    settings.testSuites = options.testSuites.split(",");
  } else {
    settings.testSuites = ["server", "system", "files", "config"];
  }

  // Validate required options
  if (options.outputFormat === "json" && !options.outputFile) {
    console.log(
      colors.yellow(
        "Warning: Using JSON output format without specifying an output file."
      )
    );
  }

  return options as CliOptions;
}

// Log the current configuration
export function logConfiguration(): void {
  console.log(colors.dim("\nTest Configuration:"));
  console.log(colors.dim("------------------"));
  Object.entries(settings).forEach(([key, value]) => {
    if (key === "testSuites" && Array.isArray(value)) {
      console.log(colors.dim(`${key}: ${value.join(", ")}`));
    } else {
      console.log(colors.dim(`${key}: ${value}`));
    }
  });
  console.log("");
}
