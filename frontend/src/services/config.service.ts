// frontend/src/services/config.service.ts
import { get, put, post } from "./api";

const defaultConfig: Config = {
  llmServerUrl: "http://localhost:1234/v1",
  llmModel: "gemma-2-9b-it",
  llmMaxTokens: 4096,
  llmTemperature: 0.7,
  outputDir: "analysis_output",
};

// Default models to use when API calls are commented out
const defaultModels: LlmModel[] = [
  {
    id: "gemma-2-9b-it",
    name: "Gemma 2 9B Instruct",
    description: "Google's Gemma 2 9B Instruct model",
  },
  {
    id: "llama-3-8b-instruct",
    name: "Llama 3 8B Instruct",
    description: "Meta's Llama 3 8B Instruct model",
  },
  {
    id: "mistral-7b-instruct-v0.2",
    name: "Mistral 7B Instruct",
    description: "Mistral AI's 7B Instruct model",
  },
];

// Define types for the config service
export interface LlmModel {
  id: string;
  name: string;
  description: string;
}

export interface Config {
  llmServerUrl: string;
  llmModel: string;
  llmMaxTokens: number;
  llmTemperature: number;
  outputDir: string;
}

export interface LlmTestResult {
  success: boolean;
  message: string;
  responseTime?: number;
  model?: string;
  serverUrl?: string;
}

// Create the config service
// const configService = {
//     // Get current configuration
//     async getConfig(): Promise<Config> {
//         return get < Config > ('/config')
//     },

//     // Update configuration
//     async updateConfig(config: Partial<Config>): Promise<{ success: boolean; message: string; config: Config }> {
//         return put < { success: boolean; message: string; config: Config } > ('/config', config)
//     },

//     // Get available LLM models
//     async getAvailableModels(): Promise<LlmModel[]> {
//         return get < LlmModel[] > ('/config/models')
//     },

//     // Test LLM connection
//     async testLlmConnection(serverUrl?: string, model?: string): Promise<LlmTestResult> {
//         return post < LlmTestResult > ('/config/test-llm-connection', { serverUrl, model })
//     }
// }
const configService = {
  // Get current configuration
  async getConfig(): Promise<Config> {
    // return get<Config>('/config')
    console.log("Using default config instead of API call");
    return Promise.resolve(defaultConfig);
  },

  // Update configuration
  async updateConfig(
    config: Partial<Config>
  ): Promise<{ success: boolean; message: string; config: Config }> {
    // return put<{ success: boolean; message: string; config: Config }>('/config', config)
    console.log("Skipping config update API call");
    const updatedConfig = { ...defaultConfig, ...config };
    return Promise.resolve({
      success: true,
      message: "Configuration updated (simulated)",
      config: updatedConfig,
    });
  },

  // Get available LLM models
  async getAvailableModels(): Promise<LlmModel[]> {
    // return get<LlmModel[]>('/config/models')
    console.log("Using default models instead of API call");
    return Promise.resolve(defaultModels);
  },

  // Test LLM connection
  async testLlmConnection(
    serverUrl?: string,
    model?: string
  ): Promise<LlmTestResult> {
    // return post<LlmTestResult>('/config/test-llm-connection', { serverUrl, model })
    console.log("Simulating LLM connection test");
    return Promise.resolve({
      success: true,
      message: "Connection test simulated successfully",
      responseTime: 150,
      model: model || defaultConfig.llmModel,
      serverUrl: serverUrl || defaultConfig.llmServerUrl,
    });
  },
};
export default configService;
