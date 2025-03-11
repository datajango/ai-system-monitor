// test-runners/snapshot-files.test.ts
import {
  TestResults,
  api,
  API_BASE_URL,
  getErrorMessage,
  updateResults,
  settings,
} from "../config";
import {
  logResult,
  printSection,
  logProgress,
  colors,
  logVerbose,
} from "../logger";
import { validateSnapshotFileResponse } from "../snapshot-validation";

// Snapshot files endpoints tests
export async function testSnapshotFilesEndpoints(
  results: TestResults
): Promise<void> {
  printSection("SNAPSHOT FILES ENDPOINTS");

  try {
    // 1. Get all snapshots to find an ID to use
    logProgress("Getting all snapshots to find a test snapshot...");
    const snapshotsResponse = await api.get(
      `${API_BASE_URL()}/system/snapshots`
    );

    if (!snapshotsResponse.data || snapshotsResponse.data.length === 0) {
      logProgress(
        colors.red("No snapshots found. Please create a snapshot first.")
      );
      return;
    }

    const testSnapshotId = snapshotsResponse.data[0].id;
    logProgress(colors.green(`Found snapshot: ${testSnapshotId}`));

    // 2. Test getting all files in the snapshot
    logProgress("Getting all files in the snapshot...");
    try {
      const filesResponse = await api.get(
        `${API_BASE_URL()}/system/snapshots/${testSnapshotId}/files`
      );
      logResult(
        `GET /system/snapshots/${testSnapshotId}/files`,
        true,
        filesResponse.data
      );
      updateResults(results, true);

      // Only show detailed file info in verbose mode
      if (settings.verbose) {
        logProgress(
          `Found ${filesResponse.data.length} files. First few files:`
        );
        filesResponse.data.slice(0, 3).forEach((file: any) => {
          logVerbose(colors.cyan(`  - ${file.name} (${file.size} bytes)`));
        });
      } else {
        logProgress(`Found ${filesResponse.data.length} files.`);
      }

      // If snapshot directory is provided, validate file list against directory
      if (settings.snapshotDir) {
        try {
          const fs = require("fs");
          const path = require("path");
          const snapshotPath = path.join(settings.snapshotDir, testSnapshotId);

          // Check if directory exists
          if (fs.existsSync(snapshotPath)) {
            const dirFiles = fs.readdirSync(snapshotPath);
            const apiFileNames = new Set(
              filesResponse.data.map((f: any) => f.name)
            );

            // Check if all files in directory are in API response
            let missingFiles = [];
            for (const file of dirFiles) {
              const fileStat = fs.statSync(path.join(snapshotPath, file));
              if (fileStat.isFile() && !apiFileNames.has(file)) {
                missingFiles.push(file);
              }
            }

            if (missingFiles.length > 0) {
              logResult(
                `Snapshot files validation`,
                false,
                null,
                `API response missing files that exist in directory: ${missingFiles.join(
                  ", "
                )}`
              );
              updateResults(results, false);
            } else {
              logResult(`Snapshot files validation`, true, {
                status: "All files found",
              });
              updateResults(results, true);
            }
          }
        } catch (error) {
          logResult(
            `Snapshot files directory validation`,
            false,
            null,
            `Error checking snapshot directory: ${getErrorMessage(error)}`
          );
          updateResults(results, false);
        }
      }

      // 3. Test getting a specific JSON file
      if (filesResponse.data.length > 0) {
        // Find a JSON file to test with
        const jsonFile = filesResponse.data.find((file: any) =>
          file.name.endsWith(".json")
        );

        if (jsonFile) {
          logProgress(`Getting specific file: ${jsonFile.name}...`);
          try {
            const fileResponse = await api.get(
              `${API_BASE_URL()}/system/snapshots/${testSnapshotId}/files/${
                jsonFile.name
              }`
            );
            logResult(
              `GET /system/snapshots/${testSnapshotId}/files/${jsonFile.name}`,
              true,
              fileResponse.data
            );
            updateResults(results, true);

            // Validate file content if snapshot directory is provided
            if (settings.snapshotDir) {
              await validateSnapshotFileResponse(
                testSnapshotId,
                jsonFile.name,
                fileResponse.data,
                settings.snapshotDir,
                results
              );
            }
          } catch (error) {
            logResult(
              `GET /system/snapshots/${testSnapshotId}/files/${jsonFile.name}`,
              false,
              null,
              getErrorMessage(error)
            );
            updateResults(results, false);
          }
        }

        // 4. Test getting a text file (summary.txt if available)
        const textFile = filesResponse.data.find(
          (file: any) => file.name === "summary.txt"
        );

        if (textFile) {
          logProgress(`Getting text file: ${textFile.name}...`);
          try {
            const fileResponse = await api.get(
              `${API_BASE_URL()}/system/snapshots/${testSnapshotId}/files/${
                textFile.name
              }`
            );
            logResult(
              `GET /system/snapshots/${testSnapshotId}/files/${textFile.name}`,
              true,
              fileResponse.data
            );
            updateResults(results, true);

            // Validate text file content if snapshot directory is provided
            if (settings.snapshotDir) {
              await validateSnapshotFileResponse(
                testSnapshotId,
                textFile.name,
                fileResponse.data,
                settings.snapshotDir,
                results
              );
            }
          } catch (error) {
            logResult(
              `GET /system/snapshots/${testSnapshotId}/files/${textFile.name}`,
              false,
              null,
              getErrorMessage(error)
            );
            updateResults(results, false);
          }
        }

        // 5. Test with non-existent file
        logProgress("Testing with non-existent file...");
        try {
          await api.get(
            `${API_BASE_URL()}/system/snapshots/${testSnapshotId}/files/does-not-exist.json`
          );
          logResult(
            `GET /system/snapshots/${testSnapshotId}/files/does-not-exist.json`,
            false,
            null,
            "Expected 404 but got success response"
          );
          updateResults(results, false);
        } catch (error) {
          if (
            error instanceof Error &&
            "response" in error &&
            error.response &&
            (error.response as any).status === 404
          ) {
            logResult(
              `GET /system/snapshots/${testSnapshotId}/files/does-not-exist.json`,
              true,
              { message: "Got expected 404 error for non-existent file" }
            );
            updateResults(results, true);
          } else {
            logResult(
              `GET /system/snapshots/${testSnapshotId}/files/does-not-exist.json`,
              false,
              null,
              getErrorMessage(error)
            );
            updateResults(results, false);
          }
        }
      }
    } catch (error) {
      logResult(
        `GET /system/snapshots/${testSnapshotId}/files`,
        false,
        null,
        getErrorMessage(error)
      );
      updateResults(results, false);
    }
  } catch (error) {
    logResult("GET /system/snapshots", false, null, getErrorMessage(error));
    updateResults(results, false);
  }
}
