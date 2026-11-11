// Stands in for the server process in the crash drill. It starts one batch against the fake CLI and then waits, until the
// drill kills it with SIGKILL. It calls no model and uses no account.
import { CONTRACT_VERSION } from "@voxward/contracts";
import { createKiroCliInferenceProvider } from "../../../../src/adapters/kiro-cli/provider.js";
import { FAKE_CLI, fakeEnvironment, moderationValidator } from "../../kiro-cli/helpers.js";

const [runtimeRoot, logPath] = process.argv.slice(2);
if (runtimeRoot === undefined || logPath === undefined) {
  throw new Error("usage: crash-child.ts <runtimeRoot> <logPath>");
}

const provider = createKiroCliInferenceProvider({
  command: FAKE_CLI,
  env: fakeEnvironment(logPath, "hang"),
  runtimeRoot,
  maxItems: 10,
  validateOutput: moderationValidator,
});

provider
  .infer({
    contractVersion: CONTRACT_VERSION,
    batchId: "crash-drill",
    items: [{ correlationId: "corr-drill-1", text: "drill message" }],
  })
  .catch(() => undefined);
