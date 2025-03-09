// test-api.ts
import axios from "axios";

// Use console colors instead of chalk
const colors = {
  red: (text: string) => `\x1b[31m${text}\x1b[0m`,
  green: (text: string) => `\x1b[32m${text}\x1b[0m`,
  yellow: (text: string) => `\x1b[33m${text}\x1b[0m`,
  blue: (text: string) => `\x1b[34m${text}\x1b[0m`,
  magenta: (text: string) => `\x1b[35m${text}\x1b[0m`,
  cyan: (text: string) => `\x1b[36m${text}\x1b[0m`,
  white: (text: string) => `\x1b[37m${text}\x1b[0m`,
  dim: (text: string) => `\x1b[2m${text}\x1b[0m`,
  bold: (text: string) => `\x1b[1m${text}\x1b[0m`,
};

const API_BASE_URL = "http://localhost:3000/api/v1";

// Helper function to get error message from unknown error
const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) return error.message;
  return String(error);
};

// Helper function to log results with color
const logResult = (
  endpoint: string,
  success: boolean,
  data: any,
  errorMsg?: string
) => {
  console.log(
    `\n${
      success ? colors.green("✅ SUCCESS") : colors.red("❌ FAILED")
    } ${colors.blue(endpoint)}`
  );
  if (success) {
    console.log(
      colors.dim("  Response:"),
      colors.cyan(
        JSON.stringify(data, null, 2).substring(0, 500) +
          (JSON.stringify(data, null, 2).length > 500 ? "..." : "")
      )
    );
  } else {
    console.log(
      colors.dim("  Error:"),
      colors.red(errorMsg || "Unknown error")
    );
  }
};

// Helper function to print section headers
const printSection = (title: string) => {
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
};

// Create a new Axios instance with a timeout to prevent hanging
const api = axios.create({
  timeout: 10000, // 10 seconds
});

// Test all endpoints
const testEndpoints = async (): Promise<number> => {
  console.log(colors.magenta(colors.bold("\n🔍 SYSTEM MONITOR API TEST\n")));

  const results = {
    total: 0,
    success: 0,
    failed: 0,
  };

  try {
    // 1. Test server status
    printSection("SERVER STATUS");

    try {
      const rootResponse = await api.get("http://localhost:3000/");
      logResult("GET /", true, rootResponse.data);
      results.total++;
      results.success++;
    } catch (error) {
      logResult("GET /", false, null, getErrorMessage(error));
      results.total++;
      results.failed++;
    }

    // 2. System endpoints
    printSection("SYSTEM ENDPOINTS");

    // 2.1 Get all snapshots
    try {
      const snapshotsResponse = await api.get(
        `${API_BASE_URL}/system/snapshots`
      );
      logResult("GET /system/snapshots", true, snapshotsResponse.data);
      results.total++;
      results.success++;
    } catch (error) {
      logResult("GET /system/snapshots", false, null, getErrorMessage(error));
      results.total++;
      results.failed++;
    }

    // 2.2 Create a new snapshot
    let newSnapshotId: string | undefined;
    try {
      console.log(colors.dim("\nCreating a new test snapshot..."));
      const collectResponse = await api.post(`${API_BASE_URL}/system/collect`, {
        description: "API Test Snapshot",
      });
      newSnapshotId = collectResponse.data.snapshotId;
      logResult("POST /system/collect", true, collectResponse.data);
      console.log(colors.green(`  Created snapshot with ID: ${newSnapshotId}`));
      results.total++;
      results.success++;
    } catch (error) {
      logResult("POST /system/collect", false, null, getErrorMessage(error));
      results.total++;
      results.failed++;
    }

    // Wait to ensure snapshot is created
    if (newSnapshotId) {
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // 2.3 Get a specific snapshot
      try {
        const snapshotResponse = await api.get(
          `${API_BASE_URL}/system/snapshots/${newSnapshotId}`
        );
        logResult(
          `GET /system/snapshots/${newSnapshotId}`,
          true,
          snapshotResponse.data
        );
        results.total++;
        results.success++;
      } catch (error) {
        logResult(
          `GET /system/snapshots/${newSnapshotId}`,
          false,
          null,
          getErrorMessage(error)
        );
        results.total++;
        results.failed++;
      }

      // 2.4 Run analysis on the snapshot
      try {
        console.log(colors.dim("\nRunning analysis on the test snapshot..."));
        const analysisResponse = await api.post(
          `${API_BASE_URL}/system/analyze/${newSnapshotId}`,
          {
            focus: ["System", "Network"],
          }
        );
        logResult(
          `POST /system/analyze/${newSnapshotId}`,
          true,
          analysisResponse.data
        );
        results.total++;
        results.success++;
      } catch (error) {
        logResult(
          `POST /system/analyze/${newSnapshotId}`,
          false,
          null,
          getErrorMessage(error)
        );
        results.total++;
        results.failed++;
      }

      // Wait to ensure analysis is completed
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // 2.5 Get analysis for the snapshot
      try {
        const getAnalysisResponse = await api.get(
          `${API_BASE_URL}/system/analysis/${newSnapshotId}`
        );
        logResult(
          `GET /system/analysis/${newSnapshotId}`,
          true,
          getAnalysisResponse.data
        );
        results.total++;
        results.success++;
      } catch (error) {
        logResult(
          `GET /system/analysis/${newSnapshotId}`,
          false,
          null,
          getErrorMessage(error)
        );
        results.total++;
        results.failed++;
      }

      // 2.6 Compare snapshots (if we have at least two snapshots)
      try {
        const allSnapshots = await api.get(`${API_BASE_URL}/system/snapshots`);
        if (allSnapshots.data.length >= 2) {
          const baselineId = allSnapshots.data[1].id; // Second most recent
          const currentId = allSnapshots.data[0].id; // Most recent

          console.log(
            colors.dim(
              `\nComparing snapshots: ${baselineId} vs ${currentId}...`
            )
          );
          const compareResponse = await api.post(
            `${API_BASE_URL}/system/compare`,
            {
              baselineId,
              currentId,
              sections: ["InstalledPrograms", "Path"],
            }
          );
          logResult(`POST /system/compare`, true, compareResponse.data);
          results.total++;
          results.success++;
        } else {
          console.log(
            colors.yellow(
              "\n⚠️ Skipping comparison test - need at least 2 snapshots"
            )
          );
        }
      } catch (error) {
        logResult(`POST /system/compare`, false, null, getErrorMessage(error));
        results.total++;
        results.failed++;
      }
    }

    // 3. Configuration endpoints
    printSection("CONFIGURATION ENDPOINTS");

    // 3.1 Get configuration
    try {
      const configResponse = await api.get(`${API_BASE_URL}/config`);
      logResult("GET /config", true, configResponse.data);
      results.total++;
      results.success++;
    } catch (error) {
      logResult("GET /config", false, null, getErrorMessage(error));
      results.total++;
      results.failed++;
    }

    // 3.2 Update configuration
    try {
      const updateConfigResponse = await api.put(`${API_BASE_URL}/config`, {
        llmTemperature: 0.8,
      });
      logResult("PUT /config", true, updateConfigResponse.data);
      results.total++;
      results.success++;
    } catch (error) {
      logResult("PUT /config", false, null, getErrorMessage(error));
      results.total++;
      results.failed++;
    }

    // 3.3 Get available LLM models
    try {
      const modelsResponse = await api.get(`${API_BASE_URL}/config/models`);
      logResult("GET /config/models", true, modelsResponse.data);
      results.total++;
      results.success++;
    } catch (error) {
      logResult("GET /config/models", false, null, getErrorMessage(error));
      results.total++;
      results.failed++;
    }

    // 3.4 Test LLM connection
    try {
      const testLlmResponse = await api.post(
        `${API_BASE_URL}/config/test-llm-connection`,
        {
          serverUrl: "http://localhost:1234/v1",
          model: "gemma-2-9b-it",
        }
      );
      logResult("POST /config/test-llm-connection", true, testLlmResponse.data);
      results.total++;
      results.success++;
    } catch (error) {
      logResult(
        "POST /config/test-llm-connection",
        false,
        null,
        getErrorMessage(error)
      );
      results.total++;
      results.failed++;
    }

    // Print summary
    printSection("TEST SUMMARY");
    console.log(
      colors.bold(`Total tests: ${colors.white(String(results.total))}`)
    );
    console.log(
      colors.bold(`Successful: ${colors.green(String(results.success))}`)
    );
    console.log(colors.bold(`Failed: ${colors.red(String(results.failed))}`));
    console.log(
      `Success rate: ${colors.yellow(
        Math.round((results.success / results.total) * 100) + "%"
      )}`
    );

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

    return results.failed > 0 ? 1 : 0;
  } catch (error) {
    console.error(
      colors.red(colors.bold("\n❌ Error during testing:")),
      getErrorMessage(error)
    );
    return 1;
  }
};

// Run the tests and force exit
testEndpoints()
  .then((exitCode) => {
    console.log(colors.dim("Tests completed, exiting..."));
    // Force exit after a short delay to let any remaining outputs finish
    setTimeout(() => {
      process.exit(exitCode);
    }, 500);
  })
  .catch((error) => {
    console.error(colors.red("Unhandled error:"), getErrorMessage(error));
    process.exit(1);
  });
