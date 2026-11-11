import { CONTRACT_VERSION, type InferenceRequest } from "../../packages/contracts/src/index.js";
import { fakeCliProvider } from "./doubles.js";

/**
 * Crash-scenario child. It starts one batch that never finishes (fake CLI in hang mode), then waits. The observer kills
 * this process with SIGKILL, so the batch is left behind the way a crashed host leaves it. Run it through tsx, from
 * cleanup-observe.ts only.
 */
const [runtimeRoot, logPath] = process.argv.slice(2);
if (runtimeRoot === undefined || logPath === undefined) {
  process.stderr.write("crash-child: needs <runtimeRoot> <logPath>\n");
  process.exit(2);
}

const provider = fakeCliProvider({ mode: "hang", logPath, runtimeRoot, maxItems: 10 });
const request: InferenceRequest = {
  contractVersion: CONTRACT_VERSION,
  batchId: "crash-1",
  items: [{ correlationId: "bench-corr-crash-1", text: "crash probe" }],
};
provider.infer(request).catch(() => undefined);

// Keep the event loop alive until the observer kills this process.
setInterval(() => undefined, 60_000);
