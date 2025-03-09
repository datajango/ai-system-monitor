// test-runners/config.test.ts
import {
  TestResults,
  api,
  API_BASE_URL,
  getErrorMessage,
  updateResults,
} from "../config";
import { logResult, printSection } from "../logger";

// Configuration endpoints tests
export async function testConfigEndpoints(results: TestResults): Promise<void> {
  printSection("CONFIGURATION ENDPOINTS");

  // 1. Get configuration
  try {
    const configResponse = await api.get(`${API_BASE_URL()}/config`);
    logResult("GET /config", true, configResponse.data);
    updateResults(results, true);
  } catch (error) {
    logResult("GET /config", false, null, getErrorMessage(error));
    updateResults(results, false);
  }

  // 2. Update configuration
  try {
    const updateConfigResponse = await api.put(`${API_BASE_URL()}/config`, {
      llmTemperature: 0.8,
    });
    logResult("PUT /config", true, updateConfigResponse.data);
    updateResults(results, true);
  } catch (error) {
    logResult("PUT /config", false, null, getErrorMessage(error));
    updateResults(results, false);
  }

  // 3. Get available LLM models
  try {
    const modelsResponse = await api.get(`${API_BASE_URL()}/config/models`);
    logResult("GET /config/models", true, modelsResponse.data);
    updateResults(results, true);
  } catch (error) {
    logResult("GET /config/models", false, null, getErrorMessage(error));
    updateResults(results, false);
  }

  // 4. Test LLM connection
  try {
    const testLlmResponse = await api.post(
      `${API_BASE_URL()}/config/test-llm-connection`,
      {
        serverUrl: "http://localhost:1234/v1",
        model: "gemma-2-9b-it",
      }
    );
    logResult("POST /config/test-llm-connection", true, testLlmResponse.data);
    updateResults(results, true);
  } catch (error) {
    logResult(
      "POST /config/test-llm-connection",
      false,
      null,
      getErrorMessage(error)
    );
    updateResults(results, false);
  }
}
