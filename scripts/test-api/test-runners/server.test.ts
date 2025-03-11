// test-runners/server.test.ts
import {
  TestResults,
  api,
  ROOT_URL,
  getErrorMessage,
  updateResults,
} from "../config";
import { logResult, printSection } from "../logger";

// Server status tests
export async function testServerStatus(results: TestResults): Promise<void> {
  printSection("SERVER STATUS");

  try {
    // Fix: Call ROOT_URL() since it's now a function
    const rootResponse = await api.get(ROOT_URL());
    logResult("GET /", true, rootResponse.data);
    updateResults(results, true, "server");
  } catch (error) {
    logResult("GET /", false, null, getErrorMessage(error));
    updateResults(results, false, "server");
  }
}
