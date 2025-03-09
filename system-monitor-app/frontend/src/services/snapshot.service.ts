// frontend/src/services/snapshot.service.ts
import { get, post, USE_SAMPLE_DATA } from "./api";

// Define types for the snapshot service
export interface Snapshot {
  id: string;
  timestamp: string;
  description: string;
  path: string;
}

export interface SnapshotDetail extends Snapshot {
  data: Record<string, any>;
}

export interface CollectionParams {
  outputPath?: string;
  description?: string;
  compareWithLatest?: boolean;
}

export interface ComparisonParams {
  baselineId: string;
  currentId: string;
  sections?: string[];
}

export interface CollectionResult {
  success: boolean;
  message: string;
  snapshotId?: string;
  output?: string;
}

export interface ComparisonResult {
  success: boolean;
  message: string;
  comparison: any;
}

// Sample snapshot data for development without backend
const sampleSnapshots: Snapshot[] = [
  {
    id: "SystemState_2025-03-09_00-46-14_API_Test_Snapshot",
    timestamp: "2025-03-09T00:46:14Z",
    description: "API Test Snapshot",
    path: "/snapshots/SystemState_2025-03-09_00-46-14_API_Test_Snapshot",
  },
  {
    id: "SystemState_2025-03-08_14-22-05_Weekly_Scan",
    timestamp: "2025-03-08T14:22:05Z",
    description: "Weekly Scan",
    path: "/snapshots/SystemState_2025-03-08_14-22-05_Weekly_Scan",
  },
  {
    id: "SystemState_2025-03-01_09-15-33_Pre_Update",
    timestamp: "2025-03-01T09:15:33Z",
    description: "Pre Update",
    path: "/snapshots/SystemState_2025-03-01_09-15-33_Pre_Update",
  },
];

// Generate sample snapshot details
const generateSnapshotDetail = (id: string): SnapshotDetail => {
  const snapshot = sampleSnapshots.find((s) => s.id === id) || {
    id,
    timestamp: new Date().toISOString(),
    description: "Sample Snapshot",
    path: `/snapshots/${id}`,
  };

  return {
    ...snapshot,
    data: {
      System: {
        computerName: "DESKTOP-SAMPLE",
        osVersion: "Windows 10 Pro",
        processorName: "Intel(R) Core(TM) i7-10700K CPU @ 3.80GHz",
        installedMemory: "32 GB",
        systemDrive: "C:",
        systemTime: new Date().toISOString(),
      },
      Network: {
        adapters: [
          {
            name: "Ethernet",
            ipAddress: "192.168.1.100",
            macAddress: "00-11-22-33-44-55",
            status: "Up",
          },
          {
            name: "Wi-Fi",
            ipAddress: "",
            macAddress: "AA-BB-CC-DD-EE-FF",
            status: "Down",
          },
        ],
        connections: [
          {
            localAddress: "192.168.1.100:54321",
            remoteAddress: "172.217.20.14:443",
            state: "ESTABLISHED",
            processId: 1234,
            processName: "chrome.exe",
          },
        ],
      },
      InstalledPrograms: {
        count: 52,
        programs: [
          {
            name: "Google Chrome",
            version: "123.0.6312.87",
            publisher: "Google LLC",
            installDate: "2024-01-15",
          },
          {
            name: "Mozilla Firefox",
            version: "124.0",
            publisher: "Mozilla",
            installDate: "2024-02-20",
          },
          {
            name: "Microsoft Visual Studio Code",
            version: "1.87.0",
            publisher: "Microsoft Corporation",
            installDate: "2024-03-05",
          },
        ],
      },
      DiskSpace: {
        drives: [
          {
            name: "C:",
            label: "System",
            totalSpace: 512000000000,
            freeSpace: 125000000000,
            percentUsed: 75.6,
          },
          {
            name: "D:",
            label: "Data",
            totalSpace: 1024000000000,
            freeSpace: 650000000000,
            percentUsed: 36.5,
          },
        ],
      },
      Browsers: {
        installed: [
          {
            name: "Google Chrome",
            version: "123.0.6312.87",
            defaultBrowser: true,
            installPath:
              "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
          },
          {
            name: "Mozilla Firefox",
            version: "124.0",
            defaultBrowser: false,
            installPath: "C:\\Program Files\\Mozilla Firefox\\firefox.exe",
          },
        ],
        extensions: [
          {
            browser: "Chrome",
            name: "uBlock Origin",
            version: "1.54.0",
            enabled: true,
          },
        ],
      },
    },
  };
};

// Create the snapshot service
const snapshotService = {
  // Get all snapshots
  async getAllSnapshots(): Promise<Snapshot[]> {
    try {
      // Try to make the real API call
      return await get<Snapshot[]>("/system/snapshots");
    } catch (error) {
      // If using sample data, return the sample snapshots
      if (USE_SAMPLE_DATA) {
        console.log("Using sample snapshots instead of API call");
        return sampleSnapshots;
      }
      // Otherwise, rethrow the error
      throw error;
    }
  },

  // Get a snapshot by ID
  async getSnapshotById(id: string): Promise<SnapshotDetail> {
    try {
      // Try to make the real API call
      return await get<SnapshotDetail>(`/system/snapshots/${id}`);
    } catch (error) {
      // If using sample data, return the sample snapshot detail
      if (USE_SAMPLE_DATA) {
        console.log(
          `Using sample snapshot detail for ID: ${id} instead of API call`
        );
        return generateSnapshotDetail(id);
      }
      // Otherwise, rethrow the error
      throw error;
    }
  },

  // Run a new system snapshot collection
  async runCollection(params: CollectionParams): Promise<CollectionResult> {
    try {
      // Try to make the real API call
      return await post<CollectionResult>("/system/collect", params);
    } catch (error) {
      // If using sample data, simulate snapshot collection
      if (USE_SAMPLE_DATA) {
        console.log("Simulating snapshot collection with params:", params);

        // Generate a new timestamp-based ID
        const now = new Date();
        const dateStr = now.toISOString().split("T")[0];
        const timeStr = now.toTimeString().slice(0, 8).replace(/:/g, "-");
        const description = params.description
          ? encodeURIComponent(params.description.replace(/\s+/g, "_"))
          : "";
        const newId = `SystemState_${dateStr}_${timeStr}${
          description ? "_" + description : ""
        }`;

        // Add new snapshot to sample data
        sampleSnapshots.unshift({
          id: newId,
          timestamp: now.toISOString(),
          description: params.description || "",
          path: `/snapshots/${newId}`,
        });

        return {
          success: true,
          message: "System snapshot collected successfully (simulated)",
          snapshotId: newId,
          output: `Created snapshot ${newId}`,
        };
      }
      // Otherwise, rethrow the error
      throw error;
    }
  },

  // Compare two snapshots
  async compareSnapshots(params: ComparisonParams): Promise<ComparisonResult> {
    try {
      // Try to make the real API call
      return await post<ComparisonResult>("/system/compare", params);
    } catch (error) {
      // If using sample data, simulate comparison
      if (USE_SAMPLE_DATA) {
        console.log("Simulating snapshots comparison with params:", params);
        return {
          success: true,
          message: "Comparison completed successfully (simulated)",
          comparison: {
            baselineId: params.baselineId,
            currentId: params.currentId,
            comparisonDate: new Date().toISOString(),
            sections: {
              DiskSpace: {
                changes: [
                  {
                    type: "changed",
                    drive: "C:",
                    property: "freeSpace",
                    old: 125000000000,
                    new: 100000000000,
                    percentChange: -20,
                  },
                ],
                summary: "C: drive space decreased by 20%",
                changeCount: 1,
              },
              InstalledPrograms: {
                changes: [
                  {
                    type: "added",
                    item: {
                      name: "New Application",
                      version: "1.0.0",
                      publisher: "Example Publisher",
                      installDate: new Date().toISOString().split("T")[0],
                    },
                  },
                ],
                summary: "Found 1 new installed program",
                changeCount: 1,
              },
            },
          },
        };
      }
      // Otherwise, rethrow the error
      throw error;
    }
  },
};

export default snapshotService;
