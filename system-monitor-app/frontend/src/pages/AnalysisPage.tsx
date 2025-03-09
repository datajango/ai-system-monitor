// frontend/src/pages/AnalysisPage.tsx
import { useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  BarChart2,
  Loader2,
  ChevronDown,
  ChevronRight,
  AlertTriangle,
  CheckCircle,
  Info,
} from "lucide-react";
import { toast } from "sonner";
import snapshotService from "../services/snapshot.service";
import analysisService from "../services/analysis.service";
import configService from "../services/config.service";

const AnalysisPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [expandedSections, setExpandedSections] = useState<string[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>("");
  const [selectedSections, setSelectedSections] = useState<string[]>([]);

  // Fetch the snapshot data
  const { data: snapshot, isLoading: isLoadingSnapshot } = useQuery({
    queryKey: ["snapshot", id],
    queryFn: () => snapshotService.getSnapshotById(id!),
    enabled: !!id,
    onError: () => {
      toast.error("Error loading snapshot data");
      navigate("/snapshots");
    },
  });

  // Fetch available LLM models - Using the modified configService
  const { data: models, isLoading: isLoadingModels } = useQuery({
    queryKey: ["models"],
    queryFn: () => configService.getAvailableModels(),
  });

  // Fetch analysis data if available
  const {
    data: analysis,
    isLoading: isLoadingAnalysis,
    isError: isAnalysisError,
    refetch: refetchAnalysis,
  } = useQuery({
    queryKey: ["analysis", id],
    queryFn: () => analysisService.getAnalysisById(id!),
    enabled: !!id,
    retry: false,
    onError: () => {
      // Analysis might not exist yet, this is not necessarily an error
    },
  });

  // Mutation for running analysis
  const runAnalysisMutation = useMutation({
    mutationFn: () =>
      analysisService.runAnalysis(id!, {
        model: selectedModel || undefined,
        focus: selectedSections.length > 0 ? selectedSections : undefined,
      }),
    onSuccess: () => {
      toast.success("Analysis completed successfully");
      queryClient.invalidateQueries({ queryKey: ["analysis", id] });
      refetchAnalysis();
    },
    onError: (error: Error) => {
      toast.error(`Analysis failed: ${error.message}`);
    },
  });

  const toggleSection = (section: string) => {
    setExpandedSections((prev) =>
      prev.includes(section)
        ? prev.filter((s) => s !== section)
        : [...prev, section]
    );
  };

  const toggleSectionSelection = (section: string) => {
    setSelectedSections((prev) =>
      prev.includes(section)
        ? prev.filter((s) => s !== section)
        : [...prev, section]
    );
  };

  // Get available sections from the snapshot
  const availableSections = snapshot ? Object.keys(snapshot.data).sort() : [];

  // Severity level colors
  const getSeverityColor = (severity: string) => {
    switch (severity?.toLowerCase()) {
      case "high":
        return "text-red-600";
      case "medium":
        return "text-orange-500";
      case "low":
        return "text-yellow-500";
      case "info":
        return "text-blue-500";
      default:
        return "text-gray-600";
    }
  };

  // Severity icon
  const getSeverityIcon = (severity: string) => {
    switch (severity?.toLowerCase()) {
      case "high":
        return <AlertTriangle className="h-5 w-5 text-red-600" />;
      case "medium":
        return <AlertTriangle className="h-5 w-5 text-orange-500" />;
      case "low":
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case "info":
        return <Info className="h-5 w-5 text-blue-500" />;
      case "good":
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      default:
        return <Info className="h-5 w-5 text-gray-500" />;
    }
  };

  const handleRunAnalysis = () => {
    runAnalysisMutation.mutate();
  };

  const isLoading =
    isLoadingSnapshot ||
    isLoadingAnalysis ||
    isLoadingModels ||
    runAnalysisMutation.isPending;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Link
            to="/snapshots"
            className="btn btn-outline btn-sm flex items-center gap-1"
          >
            <ArrowLeft size={16} />
            Back to Snapshots
          </Link>
          <h1 className="text-2xl font-bold">System Analysis</h1>
        </div>

        {snapshot && (
          <Link
            to={`/snapshots/${id}`}
            className="btn btn-outline flex items-center gap-2"
          >
            View Snapshot Details
          </Link>
        )}
      </div>

      {isLoadingSnapshot ? (
        <div className="flex justify-center p-8">
          <Loader2 className="h-8 w-8 text-primary-500 animate-spin" />
          <span className="ml-2">Loading snapshot data...</span>
        </div>
      ) : !snapshot ? (
        <div className="bg-red-50 border border-red-200 text-red-700 p-6 rounded-md">
          <h2 className="text-lg font-medium mb-2">Error Loading Snapshot</h2>
          <p>
            Unable to load the snapshot data. It may have been deleted or moved.
          </p>
        </div>
      ) : (
        <>
          {/* Snapshot info */}
          <div className="bg-white rounded-lg shadow p-4">
            <h2 className="text-lg font-semibold mb-2">
              {snapshot.description ||
                `Snapshot ${snapshot.id.split("_").slice(1).join("_")}`}
            </h2>
            <p className="text-gray-600">
              Taken on {new Date(snapshot.timestamp).toLocaleString()}
            </p>
          </div>

          {/* Analysis configuration */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">
              Analysis Configuration
            </h2>

            <div className="space-y-4">
              {/* Model selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Select LLM Model
                </label>
                <select
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value)}
                  className="input w-full"
                  disabled={isLoading}
                >
                  <option value="">Default Model</option>
                  {models?.map((model) => (
                    <option key={model.id} value={model.id}>
                      {model.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Section selection */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-sm font-medium text-gray-700">
                    Focus on Specific Sections (Optional)
                  </label>
                  <div className="text-sm">
                    <button
                      type="button"
                      className="text-primary-600 hover:text-primary-800"
                      onClick={() => setSelectedSections(availableSections)}
                      disabled={isLoading}
                    >
                      Select All
                    </button>
                    {" | "}
                    <button
                      type="button"
                      className="text-primary-600 hover:text-primary-800"
                      onClick={() => setSelectedSections([])}
                      disabled={isLoading}
                    >
                      Clear
                    </button>
                  </div>
                </div>

                <div className="max-h-40 overflow-y-auto bg-gray-50 rounded border border-gray-200 p-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                    {availableSections.map((section) => (
                      <div key={section} className="flex items-center">
                        <input
                          type="checkbox"
                          id={`section-${section}`}
                          checked={selectedSections.includes(section)}
                          onChange={() => toggleSectionSelection(section)}
                          className="h-4 w-4 text-primary-600 rounded"
                          disabled={isLoading}
                        />
                        <label
                          htmlFor={`section-${section}`}
                          className="ml-2 text-sm text-gray-700"
                        >
                          {section}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Run analysis button */}
              <div className="flex justify-end">
                <button
                  onClick={handleRunAnalysis}
                  disabled={isLoading}
                  className="btn btn-primary flex items-center gap-2"
                >
                  {runAnalysisMutation.isPending ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Running Analysis...
                    </>
                  ) : (
                    <>
                      <BarChart2 size={18} />
                      {analysis ? "Re-run Analysis" : "Run Analysis"}
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Analysis results */}
          {isLoadingAnalysis ? (
            <div className="flex justify-center p-8">
              <Loader2 className="h-8 w-8 text-primary-500 animate-spin" />
              <span className="ml-2">Loading analysis results...</span>
            </div>
          ) : isAnalysisError || !analysis ? (
            <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 p-6 rounded-md">
              <h2 className="text-lg font-medium mb-2">
                No Analysis Available
              </h2>
              <p>
                This snapshot hasn't been analyzed yet. Run an analysis to get
                insights about your system.
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4">Analysis Results</h2>

              {/* Summary */}
              {analysis.data.summary && (
                <div className="mb-6">
                  <h3 className="text-lg font-medium mb-2">Summary</h3>
                  <div className="bg-gray-50 p-4 rounded">
                    <p>{analysis.data.summary.overview}</p>

                    {analysis.data.summary.issues &&
                      analysis.data.summary.issues.length > 0 && (
                        <div className="mt-4">
                          <h4 className="font-medium mb-2">Key Issues</h4>
                          <ul className="list-disc pl-5 space-y-1">
                            {analysis.data.summary.issues.map(
                              (issue: string, index: number) => (
                                <li key={index}>{issue}</li>
                              )
                            )}
                          </ul>
                        </div>
                      )}

                    {analysis.data.summary.recommendations &&
                      analysis.data.summary.recommendations.length > 0 && (
                        <div className="mt-4">
                          <h4 className="font-medium mb-2">Recommendations</h4>
                          <ul className="list-disc pl-5 space-y-1">
                            {analysis.data.summary.recommendations.map(
                              (rec: string, index: number) => (
                                <li key={index}>{rec}</li>
                              )
                            )}
                          </ul>
                        </div>
                      )}
                  </div>
                </div>
              )}

              {/* Section-specific analysis */}
              <div className="space-y-2">
                {Object.keys(analysis.data)
                  .filter((key) => key !== "summary")
                  .sort()
                  .map((section) => {
                    const isExpanded = expandedSections.includes(section);
                    const sectionData = analysis.data[section];

                    return (
                      <div
                        key={section}
                        className="border border-gray-200 rounded-lg overflow-hidden"
                      >
                        <button
                          className="w-full flex items-center justify-between p-4 text-left bg-gray-50 hover:bg-gray-100"
                          onClick={() => toggleSection(section)}
                        >
                          <div className="flex items-center">
                            <span className="font-medium">{section}</span>
                            {sectionData.severity && (
                              <span
                                className={`ml-3 text-sm ${getSeverityColor(
                                  sectionData.severity
                                )}`}
                              >
                                {sectionData.severity.toUpperCase()}
                              </span>
                            )}
                          </div>
                          {isExpanded ? (
                            <ChevronDown size={20} className="text-gray-500" />
                          ) : (
                            <ChevronRight size={20} className="text-gray-500" />
                          )}
                        </button>

                        {isExpanded && (
                          <div className="p-4 overflow-auto max-h-96 bg-white space-y-4">
                            {/* Analysis overview */}
                            {sectionData.overview && (
                              <div>
                                <h4 className="font-medium">Overview</h4>
                                <p className="mt-1">{sectionData.overview}</p>
                              </div>
                            )}

                            {/* Findings */}
                            {sectionData.findings &&
                              sectionData.findings.length > 0 && (
                                <div>
                                  <h4 className="font-medium">Findings</h4>
                                  <ul className="mt-2 space-y-2">
                                    {sectionData.findings.map(
                                      (finding: any, index: number) => (
                                        <li
                                          key={index}
                                          className="bg-gray-50 p-3 rounded"
                                        >
                                          <div className="flex items-start">
                                            <div className="mt-0.5 mr-2">
                                              {getSeverityIcon(
                                                finding.severity || "info"
                                              )}
                                            </div>
                                            <div>
                                              <p className="font-medium">
                                                {finding.title}
                                              </p>
                                              <p className="text-sm text-gray-600 mt-1">
                                                {finding.description}
                                              </p>

                                              {finding.recommendation && (
                                                <div className="mt-2 text-sm">
                                                  <span className="font-medium">
                                                    Recommendation:{" "}
                                                  </span>
                                                  {finding.recommendation}
                                                </div>
                                              )}
                                            </div>
                                          </div>
                                        </li>
                                      )
                                    )}
                                  </ul>
                                </div>
                              )}

                            {/* Recommendations */}
                            {sectionData.recommendations &&
                              sectionData.recommendations.length > 0 && (
                                <div>
                                  <h4 className="font-medium">
                                    Recommendations
                                  </h4>
                                  <ul className="mt-2 list-disc pl-5 space-y-1">
                                    {sectionData.recommendations.map(
                                      (rec: string, index: number) => (
                                        <li key={index}>{rec}</li>
                                      )
                                    )}
                                  </ul>
                                </div>
                              )}

                            {/* Technical details */}
                            {sectionData.details && (
                              <div>
                                <h4 className="font-medium">
                                  Technical Details
                                </h4>
                                <pre className="mt-2 p-3 bg-gray-50 rounded text-sm overflow-x-auto">
                                  {typeof sectionData.details === "string"
                                    ? sectionData.details
                                    : JSON.stringify(
                                        sectionData.details,
                                        null,
                                        2
                                      )}
                                </pre>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default AnalysisPage;
