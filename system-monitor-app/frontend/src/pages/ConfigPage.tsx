// frontend/src/pages/ConfigPage.tsx
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Save, RefreshCw, Loader2 } from "lucide-react";
import { toast } from "sonner";
import configService, { Config } from "../services/config.service";

const ConfigPage = () => {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState<Config>({
    llmServerUrl: "",
    llmModel: "",
    llmMaxTokens: 4096,
    llmTemperature: 0.7,
    outputDir: "",
  });

  const [isTestingConnection, setIsTestingConnection] = useState(false);

  // Fetch current config
  const { data: config, isLoading: isLoadingConfig } = useQuery({
    queryKey: ["config"],
    queryFn: () => configService.getConfig(),
    onSuccess: (data) => {
      setFormData(data);
    },
  });

  // Fetch available models
  const { data: models, isLoading: isLoadingModels } = useQuery({
    queryKey: ["models"],
    queryFn: () => configService.getAvailableModels(),
  });

  // Mutation for updating config
  const updateConfigMutation = useMutation({
    mutationFn: (newConfig: Partial<Config>) =>
      configService.updateConfig(newConfig),
    onSuccess: (data) => {
      toast.success("Configuration updated successfully");
      queryClient.invalidateQueries({ queryKey: ["config"] });
    },
    onError: (error: Error) => {
      toast.error(`Failed to update configuration: ${error.message}`);
    },
  });

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target as HTMLInputElement;

    setFormData((prev) => ({
      ...prev,
      [name]: type === "number" ? Number(value) : value,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateConfigMutation.mutate(formData);
  };

  const handleTestConnection = async () => {
    try {
      setIsTestingConnection(true);
      const result = await configService.testLlmConnection(
        formData.llmServerUrl,
        formData.llmModel
      );
      if (result.success) {
        toast.success(
          `Connection successful! Response time: ${result.responseTime}ms`
        );
      } else {
        toast.error(`Connection failed: ${result.message}`);
      }
    } catch (error) {
      toast.error(
        `Connection test failed: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    } finally {
      setIsTestingConnection(false);
    }
  };

  const isLoading =
    isLoadingConfig || isLoadingModels || updateConfigMutation.isPending;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Configuration</h1>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-6">LLM Analysis Settings</h2>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* LLM Server URL */}
          <div>
            <label
              htmlFor="llmServerUrl"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              LLM Server URL
            </label>
            <input
              type="text"
              id="llmServerUrl"
              name="llmServerUrl"
              value={formData.llmServerUrl}
              onChange={handleInputChange}
              placeholder="http://localhost:1234/v1"
              className="input w-full"
              disabled={isLoading}
            />
            <p className="mt-1 text-sm text-gray-500">
              URL for the LM Studio API or compatible LLM server
            </p>
          </div>

          {/* LLM Model */}
          <div>
            <label
              htmlFor="llmModel"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Default LLM Model
            </label>
            <select
              id="llmModel"
              name="llmModel"
              value={formData.llmModel}
              onChange={handleInputChange}
              className="input w-full"
              disabled={isLoading}
            >
              <option value="">Select a model</option>
              {models?.map((model) => (
                <option key={model.id} value={model.id}>
                  {model.name}
                </option>
              ))}
            </select>
            <p className="mt-1 text-sm text-gray-500">
              Default model to use for system analysis
            </p>
          </div>

          {/* Max Tokens */}
          <div>
            <label
              htmlFor="llmMaxTokens"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Max Tokens
            </label>
            <input
              type="number"
              id="llmMaxTokens"
              name="llmMaxTokens"
              value={formData.llmMaxTokens}
              onChange={handleInputChange}
              min={1}
              max={32000}
              className="input w-full"
              disabled={isLoading}
            />
            <p className="mt-1 text-sm text-gray-500">
              Maximum tokens for LLM responses
            </p>
          </div>

          {/* Temperature */}
          <div>
            <label
              htmlFor="llmTemperature"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Temperature
            </label>
            <input
              type="number"
              id="llmTemperature"
              name="llmTemperature"
              value={formData.llmTemperature}
              onChange={handleInputChange}
              min={0}
              max={2}
              step={0.1}
              className="input w-full"
              disabled={isLoading}
            />
            <p className="mt-1 text-sm text-gray-500">
              Controls randomness (0-2). Lower values are more deterministic,
              higher values more creative.
            </p>
          </div>

          {/* Output Directory */}
          <div>
            <label
              htmlFor="outputDir"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Analysis Output Directory
            </label>
            <input
              type="text"
              id="outputDir"
              name="outputDir"
              value={formData.outputDir}
              onChange={handleInputChange}
              placeholder="analysis_output"
              className="input w-full"
              disabled={isLoading}
            />
            <p className="mt-1 text-sm text-gray-500">
              Directory where analysis results will be saved
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex justify-between pt-4">
            <button
              type="button"
              onClick={handleTestConnection}
              disabled={isLoading || isTestingConnection}
              className="btn btn-outline flex items-center gap-2"
            >
              {isTestingConnection ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Testing Connection...
                </>
              ) : (
                <>
                  <RefreshCw size={18} />
                  Test LLM Connection
                </>
              )}
            </button>

            <button
              type="submit"
              disabled={isLoading}
              className="btn btn-primary flex items-center gap-2"
            >
              {updateConfigMutation.isPending ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save size={18} />
                  Save Configuration
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-6">Application Information</h2>

        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-medium">
              System State Monitor and Analyzer
            </h3>
            <p className="mt-1 text-gray-600">
              A comprehensive tool suite for monitoring, tracking, and analyzing
              Windows system state over time.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-medium">System State Monitor</h4>
              <p className="text-sm text-gray-600 mt-1">
                PowerShell-based collection tool that captures detailed Windows
                system information into structured snapshots.
              </p>
            </div>

            <div>
              <h4 className="font-medium">System State Analyzer</h4>
              <p className="text-sm text-gray-600 mt-1">
                Python-based analysis tool that leverages large language models
                to provide insights and recommendations based on the collected
                data.
              </p>
            </div>
          </div>

          <div className="pt-2">
            <p className="text-sm text-gray-500">Version 0.1.0</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConfigPage;
