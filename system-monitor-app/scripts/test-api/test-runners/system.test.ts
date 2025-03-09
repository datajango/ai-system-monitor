// test-runners/system.test.ts
import {
  TestResults,
  api,
  API_BASE_URL,
  getErrorMessage,
  updateResults,
  sleep,
  settings,
} from "../config";
import { logResult, printSection, logProgress, logAlways } from "../logger";
import {
  scanSnapshotDirectory,
  validateSnapshotResponse,
} from "../snapshot-validation";

// Store created test snapshots for cleanup
export const testSnapshots: string[] = [];

// Format date for consistent snapshot naming
const formatTimestamp = (): string => {
  const now = new Date();
  const dateStr = now.toISOString().split("T")[0];
  const timeStr = now.toTimeString().slice(0, 8).replace(/:/g, "-");
  return `${dateStr}_${timeStr}`;
};

// Delete a snapshot by ID
export async function deleteSnapshot(id: string): Promise<boolean> {
  try {
    // This assumes you've added a delete endpoint to your API
    // If not, this would need to be implemented
    await api.delete(`${API_BASE_URL()}/system/snapshots/${id}`);
    return true;
  } catch (error) {
    console.error(`Could not delete snapshot ${id}: ${getErrorMessage(error)}`);
    return false;
  }
}

// System endpoints tests
export async function testSystemEndpoints(results: TestResults): Promise<void> {
  printSection("SYSTEM ENDPOINTS");

  // Store snapshot ID for use in later tests
  let newSnapshotId: string | undefined;
  let baselineId: string | undefined;
  let allSnapshots: any[] = [];

  // 1. Get all snapshots
  try {
    const snapshotsResponse = await api.get(
      `${API_BASE_URL()}/system/snapshots`
    );

    logResult("GET /system/snapshots", true, snapshotsResponse.data);
    updateResults(results, true);

    allSnapshots = snapshotsResponse.data;

    // If we have at least one snapshot, store its ID for later tests
    if (allSnapshots.length > 0) {
      baselineId = allSnapshots[0].id;

      // Add validation if snapshot directory is provided
      if (settings.snapshotDir && baselineId) {
        // Validate against expected snapshots in directory
        const snapshotDirs = await scanSnapshotDirectory(settings.snapshotDir);

        // Check if all snapshots from directory are in the API response
        const apiSnapshotIds = new Set(allSnapshots.map((s) => s.id));
        for (const dirId of snapshotDirs) {
          if (!apiSnapshotIds.has(dirId)) {
            logResult(
              `Snapshot directory validation`,
              false,
              null,
              `API response missing snapshot "${dirId}" that exists in snapshot directory`
            );
            updateResults(results, false);
          }
        }
      }
    }
  } catch (error) {
    logResult("GET /system/snapshots", false, null, getErrorMessage(error));
    updateResults(results, false);
  }

  // 2. Create a new snapshot
  try {
    // Create with a standard naming convention
    const timestamp = formatTimestamp();
    const snapshotDescription = "API-Test-Snapshot";

    // No need to log this in non-verbose mode
    logProgress("Creating a new test snapshot...");

    const collectResponse = await api.post(`${API_BASE_URL()}/system/collect`, {
      description: snapshotDescription,
    });

    const newSnapshotId = collectResponse.data.snapshotId;
    testSnapshots.push(newSnapshotId); // Track for cleanup

    logResult("POST /system/collect", true, collectResponse.data);
    updateResults(results, true);
  } catch (error) {
    logResult("POST /system/collect", false, null, getErrorMessage(error));
    updateResults(results, false);
  }

  // Wait to ensure snapshot is created
  if (newSnapshotId) {
    await sleep(1000);

    // 3. Get the new snapshot
    try {
      const snapshotResponse = await api.get(
        `${API_BASE_URL()}/system/snapshots/${newSnapshotId}`
      );
      logResult(
        `GET /system/snapshots/${newSnapshotId}`,
        true,
        snapshotResponse.data
      );
      updateResults(results, true);

      // Validate new snapshot data against files if snapshot directory is provided
      if (settings.snapshotDir) {
        await validateSnapshotResponse(
          newSnapshotId,
          snapshotResponse.data,
          settings.snapshotDir,
          results
        );
      }
    } catch (error) {
      logResult(
        `GET /system/snapshots/${newSnapshotId}`,
        false,
        null,
        getErrorMessage(error)
      );
      updateResults(results, false);
    }

    // 4. Run analysis on the snapshot
    try {
      logProgress("Running analysis on the test snapshot...");
      const analysisResponse = await api.post(
        `${API_BASE_URL()}/system/analyze/${newSnapshotId}`,
        {
          focus: ["System", "Network"],
        }
      );
      logResult(
        `POST /system/analyze/${newSnapshotId}`,
        true,
        analysisResponse.data
      );
      updateResults(results, true);
    } catch (error) {
      logResult(
        `POST /system/analyze/${newSnapshotId}`,
        false,
        null,
        getErrorMessage(error)
      );
      updateResults(results, false);
    }

    // Wait to ensure analysis is completed
    await sleep(1000);

    // 5. Get analysis for the snapshot
    try {
      const getAnalysisResponse = await api.get(
        `${API_BASE_URL()}/system/analysis/${newSnapshotId}`
      );
      logResult(
        `GET /system/analysis/${newSnapshotId}`,
        true,
        getAnalysisResponse.data
      );
      updateResults(results, true);

      // Optional: Add validation for analysis data if needed
      // This would require a different validation function focused on analysis data
    } catch (error) {
      logResult(
        `GET /system/analysis/${newSnapshotId}`,
        false,
        null,
        getErrorMessage(error)
      );
      updateResults(results, false);
    }

    // 6. Compare snapshots (if baseline exists)
    if (baselineId && baselineId !== newSnapshotId) {
      try {
        logProgress(
          `Comparing snapshots: ${baselineId} vs ${newSnapshotId}...`
        );
        const compareResponse = await api.post(
          `${API_BASE_URL()}/system/compare`,
          {
            baselineId,
            currentId: newSnapshotId,
            sections: ["InstalledPrograms", "Path"],
          }
        );
        logResult(`POST /system/compare`, true, compareResponse.data);
        updateResults(results, true);

        // Optional: Add validation for comparison data if needed
      } catch (error) {
        logResult(`POST /system/compare`, false, null, getErrorMessage(error));
        updateResults(results, false);
      }
    } else {
      logProgress(
        "⚠️ Skipping comparison test - need at least 2 different snapshots"
      );
    }
  }

  return;
}

// Cleanup test snapshots
export async function cleanupTestSnapshots(): Promise<void> {
  if (testSnapshots.length > 0) {
    logAlways("\nCleaning up test snapshots...");

    for (const id of testSnapshots) {
      try {
        const success = await deleteSnapshot(id);
        if (success) {
          logAlways(`  - Deleted test snapshot: ${id}`);
        }
      } catch (error) {
        logAlways(
          `  - Failed to delete test snapshot ${id}: ${getErrorMessage(error)}`
        );
      }
    }

    // Clear the array
    testSnapshots.length = 0;
  }
}
