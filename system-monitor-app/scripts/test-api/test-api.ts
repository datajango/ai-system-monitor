// test-api.ts
import {
  colors,
  printSection,
  printSummary,
  logAlways,
  logResult,
  logProgress,
  logVerbose,
} from "./logger";
import {
  createResultsTracker,
  settings,
  API_BASE_URL,
  ROOT_URL,
  refreshApiClient,
  finalizeResults,
  TestResults,
} from "./config";
import { parseCliArguments, logConfiguration } from "./cli-parser";
import { testServerStatus } from "./test-runners/server.test";
import {
  testSystemEndpoints,
  cleanupTestSnapshots,
} from "./test-runners/system.test";
import { testSnapshotFilesEndpoints } from "./test-runners/snapshot-files.test";
import { testConfigEndpoints } from "./test-runners/config.test";
import * as fs from "fs";
import * as path from "path";

// Parse command line arguments
const cliOptions = parseCliArguments();

// Update API client with settings
refreshApiClient();

// Main test runner function
async function runTests(): Promise<number> {
  console.log(colors.magenta(colors.bold("\n🔍 SYSTEM MONITOR API TEST\n")));

  // Log configuration in verbose mode
  if (settings.verbose) {
    logConfiguration();
  }

  // Initialize results tracking
  const results = createResultsTracker();

  try {
    // Run requested test suites
    const testSuites = settings.testSuites;

    // Test server status if requested
    if (testSuites.includes("server")) {
      await testServerStatus(results);
    } else {
      logAlways(colors.dim("Skipping server status tests..."));
      results.skipped++;
      results.testSuites.server.skipped++;
    }

    // Test system endpoints if requested
    if (testSuites.includes("system")) {
      await testSystemEndpoints(results);
    } else {
      logAlways(colors.dim("Skipping system endpoint tests..."));
      results.skipped++;
      results.testSuites.system.skipped++;
    }

    // Test snapshot files endpoints if requested
    if (testSuites.includes("files")) {
      await testSnapshotFilesEndpoints(results);
    } else {
      logAlways(colors.dim("Skipping snapshot files tests..."));
      results.skipped++;
      results.testSuites.files.skipped++;
    }

    // // Test config endpoints if requested
    // if (testSuites.includes("config")) {
    //   await testConfigEndpoints(results);
    // } else {
    //   logAlways(colors.dim("Skipping config endpoint tests..."));
    //   results.skipped++;
    //   results.testSuites.config.skipped++;
    // }

    // Finalize and print test summary
    finalizeResults(results);
    printSummary(results);

    // Clean up test snapshots if not skipped
    if (!settings.skipCleanup) {
      await cleanupTestSnapshots();
    } else {
      logAlways(
        colors.yellow("\nSkipping cleanup of test snapshots as requested.")
      );
    }

    // Write results to file if specified
    if (settings.outputFile) {
      await writeResultsToFile(results);
    }

    return results.failed > 0 ? 1 : 0;
  } catch (error) {
    printSection("ERROR");
    console.error(
      colors.red(colors.bold("\n❌ Unhandled error during testing:")),
      error instanceof Error ? error.message : String(error)
    );

    // Try to clean up even after errors, unless cleanup is skipped
    if (!settings.skipCleanup) {
      try {
        await cleanupTestSnapshots();
      } catch (cleanupError) {
        console.error(
          colors.red("Error during snapshot cleanup:"),
          cleanupError instanceof Error
            ? cleanupError.message
            : String(cleanupError)
        );
      }
    }

    return 1;
  }
}

// Write test results to file
async function writeResultsToFile(results: TestResults): Promise<void> {
  try {
    const outputFile = settings.outputFile as string;
    const outputDir = path.dirname(outputFile);

    // Create directory if it doesn't exist
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Format output based on selected format
    let output: string;
    if (settings.outputFormat === "json") {
      output = JSON.stringify(results, null, 2);
    } else {
      // Pretty text format
      output = `System Monitor API Test Results
==============================
Date: ${new Date().toISOString()}
Duration: ${results.duration}ms

Summary:
  Total Tests: ${results.total}
  Successful: ${results.success}
  Failed: ${results.failed}
  Skipped: ${results.skipped}
  Success Rate: ${Math.round((results.success / results.total) * 100)}%

Test Suites:
${Object.entries(results.testSuites)
  .map(
    ([suite, stats]) =>
      `  ${suite}: ${stats.success}/${stats.total} passed, ${stats.failed} failed, ${stats.skipped} skipped`
  )
  .join("\n")}
`;
    }

    // Write to file
    fs.writeFileSync(outputFile, output);
    logAlways(colors.green(`\nTest results written to ${outputFile}`));
  } catch (error) {
    logAlways(
      colors.red(
        `\nError writing test results to file: ${
          error instanceof Error ? error.message : String(error)
        }`
      )
    );
  }
}

// Handle cleanup on process termination
process.on("SIGINT", async () => {
  console.log(colors.yellow("\n\nProcess interrupted. Cleaning up..."));
  if (!settings.skipCleanup) {
    try {
      await cleanupTestSnapshots();
    } catch (error) {
      console.error(colors.red("Error during cleanup:"), error);
    }
  }
  process.exit(2);
});

// Run the tests and exit
runTests()
  .then((exitCode) => {
    logAlways(colors.dim("\nTests completed, exiting..."));
    // Force exit after a short delay to let any remaining outputs finish
    setTimeout(() => {
      process.exit(exitCode);
    }, 500);
  })
  .catch((error) => {
    console.error(
      colors.red("Fatal error:"),
      error instanceof Error ? error.message : String(error)
    );
    process.exit(1);
  });
