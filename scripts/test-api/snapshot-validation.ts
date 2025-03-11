// snapshot-validation.ts
import * as fs from "fs";
import * as path from "path";
import { logProgress, logResult, colors } from "./logger";
import { TestResults, updateResults } from "./config";

// Recursively scan a directory for snapshots
export async function scanSnapshotDirectory(dir: string): Promise<string[]> {
  try {
    const entries = await fs.promises.readdir(dir, { withFileTypes: true });
    const snapshotDirs = entries
      .filter(
        (entry) => entry.isDirectory() && entry.name.startsWith("SystemState_")
      )
      .map((entry) => entry.name);

    return snapshotDirs;
  } catch (error) {
    console.error(
      `Error scanning snapshot directory: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
    return [];
  }
}

// Read snapshot files from directory
export async function readSnapshotFiles(
  snapshotDir: string,
  snapshotId: string
): Promise<{ [key: string]: any }> {
  const fullPath = path.join(snapshotDir, snapshotId);
  const result: { [key: string]: any } = {};

  try {
    const files = await fs.promises.readdir(fullPath);

    // Process each file
    for (const file of files) {
      const filePath = path.join(fullPath, file);
      const stat = await fs.promises.stat(filePath);

      if (stat.isFile()) {
        if (file.endsWith(".json")) {
          // Parse JSON files
          const content = await fs.promises.readFile(filePath, "utf-8");
          try {
            result[file] = JSON.parse(content);
          } catch (e) {
            result[file] = { error: "Invalid JSON", content };
          }
        } else if (file === "summary.txt") {
          // Read summary.txt as string
          result[file] = await fs.promises.readFile(filePath, "utf-8");
        }
      }
    }

    return result;
  } catch (error) {
    console.error(
      `Error reading snapshot files: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
    return {};
  }
}

// Compare API response with actual file data
export async function validateSnapshotResponse(
  snapshotId: string,
  apiData: any,
  snapshotDir: string,
  results: TestResults
): Promise<void> {
  logProgress(`Validating snapshot data for ${snapshotId}...`);

  const fileData = await readSnapshotFiles(snapshotDir, snapshotId);
  let isValid = true;
  const validationErrors: string[] = [];

  // Validate metadata
  if (apiData.id !== snapshotId) {
    isValid = false;
    validationErrors.push(
      `ID mismatch: API returned "${apiData.id}" but expected "${snapshotId}"`
    );
  }

  // Check if API data contains all sections from files
  for (const file of Object.keys(fileData)) {
    if (file === "metadata.json") {
      // Check metadata properties
      const metadata = fileData[file];
      if (metadata.timestamp !== apiData.timestamp) {
        isValid = false;
        validationErrors.push(`Timestamp mismatch for "${file}"`);
      }
      if (metadata.description !== apiData.description) {
        isValid = false;
        validationErrors.push(`Description mismatch for "${file}"`);
      }
    } else if (file === "summary.txt") {
      // Check if summary text matches
      if (fileData[file] !== apiData.data.summaryText) {
        isValid = false;
        validationErrors.push(`Summary text mismatch`);
      }
    } else if (file.endsWith(".json") && file !== "index.json") {
      // Check section data
      const section = path.basename(file, ".json");
      if (!apiData.data[section]) {
        isValid = false;
        validationErrors.push(`Missing section "${section}" in API response`);
      } else {
        // Deep equality check would be ideal here, but simplified for now
        const fileKeys = Object.keys(fileData[file]).sort();
        const apiKeys = Object.keys(apiData.data[section]).sort();

        if (JSON.stringify(fileKeys) !== JSON.stringify(apiKeys)) {
          isValid = false;
          validationErrors.push(`Structure mismatch for section "${section}"`);
        }
      }
    }
  }

  // Log validation result
  logResult(
    `Snapshot validation for ${snapshotId}`,
    isValid,
    isValid ? { status: "Valid" } : null,
    isValid ? undefined : `Validation failed: ${validationErrors.join(", ")}`
  );

  updateResults(results, isValid);
}

// Validate snapshot file response
export async function validateSnapshotFileResponse(
  snapshotId: string,
  fileName: string,
  apiData: any,
  snapshotDir: string,
  results: TestResults
): Promise<void> {
  logProgress(`Validating file data for ${snapshotId}/${fileName}...`);

  const filePath = path.join(snapshotDir, snapshotId, fileName);
  let isValid = true;
  const validationErrors: string[] = [];

  try {
    const fileContent = await fs.promises.readFile(filePath, "utf-8");

    if (fileName.endsWith(".json")) {
      // For JSON files, compare parsed objects
      try {
        const fileData = JSON.parse(fileContent);

        // Compare with API response
        if (apiData.type === "json") {
          // Deep equality check would be better
          if (
            JSON.stringify(Object.keys(fileData).sort()) !==
            JSON.stringify(Object.keys(apiData.content).sort())
          ) {
            isValid = false;
            validationErrors.push(`JSON structure mismatch`);
          }
        } else {
          isValid = false;
          validationErrors.push(`API returned non-JSON data for JSON file`);
        }
      } catch (e) {
        isValid = false;
        validationErrors.push(
          `Failed to parse file as JSON: ${
            e instanceof Error ? e.message : String(e)
          }`
        );
      }
    } else {
      // For text files, compare string content
      if (apiData.type === "text") {
        if (fileContent !== apiData.content) {
          isValid = false;
          validationErrors.push(`Text content mismatch`);
        }
      } else {
        isValid = false;
        validationErrors.push(`API returned JSON data for text file`);
      }
    }
  } catch (error) {
    isValid = false;
    validationErrors.push(
      `Failed to read file: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }

  // Log validation result
  logResult(
    `File validation for ${snapshotId}/${fileName}`,
    isValid,
    isValid ? { status: "Valid" } : null,
    isValid ? undefined : `Validation failed: ${validationErrors.join(", ")}`
  );

  updateResults(results, isValid);
}

// Helper function to deeply compare objects
export function deepCompare(obj1: any, obj2: any): boolean {
  // If the objects are strictly equal (same reference), they're identical
  if (obj1 === obj2) return true;

  // If either is null/undefined or not an object, they must be strictly equal to match
  if (!obj1 || !obj2 || typeof obj1 !== "object" || typeof obj2 !== "object") {
    return obj1 === obj2;
  }

  // Check if both are arrays
  if (Array.isArray(obj1) && Array.isArray(obj2)) {
    if (obj1.length !== obj2.length) return false;

    // Check each array element
    for (let i = 0; i < obj1.length; i++) {
      if (!deepCompare(obj1[i], obj2[i])) return false;
    }
    return true;
  }

  // Check if one is array but the other is not
  if (Array.isArray(obj1) !== Array.isArray(obj2)) return false;

  // Get keys of both objects
  const keys1 = Object.keys(obj1);
  const keys2 = Object.keys(obj2);

  // Check if key counts match
  if (keys1.length !== keys2.length) return false;

  // Check if all keys in obj1 exist in obj2 and have the same values
  for (const key of keys1) {
    if (!keys2.includes(key)) return false;
    if (!deepCompare(obj1[key], obj2[key])) return false;
  }

  return true;
}
