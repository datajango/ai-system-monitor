// frontend/src/services/analysis.service.ts
import { get, post, USE_SAMPLE_DATA } from "./api";

// Define types for the analysis service
export interface Analysis {
  id: string;
  timestamp: string;
  data: Record<string, any>;
}

export interface AnalysisParams {
  model?: string;
  focus?: string[];
}

export interface AnalysisResult {
  success: boolean;
  message: string;
  output?: string;
}

// Sample analysis data for development without backend
const sampleAnalysisData = (id: string): Analysis => ({
  id,
  timestamp: new Date().toISOString(),
  data: {
    summary: {
      overview:
        "System appears to be in good health. Some optimization opportunities were identified.",
      issues: [
        "Multiple browser installations may be consuming extra disk space",
        "Several network connections from Chrome browser found",
        "Disk space on C: drive is running low (24.4% free)",
        "Some startup programs might be unnecessary",
      ],
      recommendations: [
        "Consider uninstalling unused browsers to free up disk space",
        "Review Chrome extensions to ensure they are all necessary and trusted",
        "Clean up temporary files to free disk space on C: drive",
        "Disable non-essential startup programs to improve boot time",
      ],
      systemHealth: {
        overall: "Good",
        performance: "Good",
        security: "Good",
        storage: "Attention needed",
        network: "Good",
      },
    },
    DiskSpace: {
      section: "DiskSpace",
      severity: "medium",
      overview: "The system has limited free space on the C: drive.",
      findings: [
        {
          severity: "medium",
          title: "Low disk space on C: drive",
          description:
            "The C: drive has only 24.4% free space remaining (125 GB out of 512 GB). This could lead to performance issues if the space continues to decrease.",
        },
        {
          severity: "good",
          title: "Sufficient space on D: drive",
          description:
            "The D: drive has 63.5% free space (650 GB out of 1024 GB), which is healthy.",
        },
      ],
      recommendations: [
        "Run Disk Cleanup to remove temporary files",
        "Consider moving large files to the D: drive",
        "Uninstall unnecessary applications",
      ],
    },
    Network: {
      section: "Network",
      severity: "low",
      overview:
        "Network configuration appears standard with some active connections to monitor.",
      findings: [
        {
          severity: "info",
          title: "Multiple network adapters",
          description:
            "System has both Ethernet and Wi-Fi adapters, with Ethernet currently active.",
        },
        {
          severity: "low",
          title: "Active outbound connections",
          description:
            "Several outbound connections from Chrome browser were detected. This is normal but should be monitored.",
        },
      ],
      recommendations: [
        "Ensure Wi-Fi is disabled when not in use",
        "Review browser extensions that make network connections",
      ],
    },
    InstalledPrograms: {
      section: "InstalledPrograms",
      severity: "low",
      overview:
        "Multiple applications installed with some potential redundancy.",
      findings: [
        {
          severity: "low",
          title: "Multiple browsers installed",
          description:
            "Both Chrome and Firefox are installed, which may be consuming unnecessary disk space if one is rarely used.",
        },
        {
          severity: "info",
          title: "Development tools detected",
          description:
            "Several development tools are installed including Visual Studio Code",
        },
      ],
      recommendations: [
        "Consider uninstalling unused browsers",
        "Review installed applications for ones that haven't been used recently",
      ],
    },
  },
});

// Create the analysis service
const analysisService = {
  // Get analysis for a snapshot
  async getAnalysisById(id: string): Promise<Analysis> {
    try {
      // Try to make the real API call
      return await get<Analysis>(`/system/analysis/${id}`);
    } catch (error) {
      // If using sample data, return sample analysis
      if (USE_SAMPLE_DATA) {
        console.log(
          `Using sample analysis data for ID: ${id} instead of API call`
        );
        return sampleAnalysisData(id);
      }
      // Otherwise, rethrow the error
      throw error;
    }
  },

  // Run analysis on a snapshot
  async runAnalysis(
    id: string,
    params: AnalysisParams
  ): Promise<AnalysisResult> {
    try {
      // Try to make the real API call
      return await post<AnalysisResult>(`/system/analyze/${id}`, params);
    } catch (error) {
      // If using sample data, simulate analysis run
      if (USE_SAMPLE_DATA) {
        console.log(
          `Simulating analysis request for ID: ${id} with params:`,
          params
        );
        return {
          success: true,
          message: "Analysis completed successfully (simulated)",
          output: `Generated analysis for snapshot ${id}`,
        };
      }
      // Otherwise, rethrow the error
      throw error;
    }
  },
};

export default analysisService;
