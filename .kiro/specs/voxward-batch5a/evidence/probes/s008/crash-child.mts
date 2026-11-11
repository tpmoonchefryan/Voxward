// Plays the server in the crash drill: it starts one batch against the acceptance fake CLI and waits to be killed.
const [C, fake, runtimeRoot, logPath, mode] = process.argv.slice(2);
const { CONTRACT_VERSION } = await import(`${C}/packages/contracts/src/index.ts`);
const { createKiroCliInferenceProvider } = await import(`${C}/apps/server/src/adapters/kiro-cli/provider.ts`);
const { validateModerationBatch } = await import(`${C}/apps/server/src/modules/inference-provider/index.ts`);

const provider = createKiroCliInferenceProvider({
  command: fake,
  env: { PATH: process.env.PATH ?? "/usr/bin:/bin", FAKE_LOG: logPath, FAKE_MODE: mode },
  runtimeRoot,
  maxItems: 10,
  validateOutput: (output: unknown, input: unknown) => validateModerationBatch(output, input, { maxItems: 10 }),
});
provider
  .infer({ contractVersion: CONTRACT_VERSION, batchId: `crash-${mode}`, items: [{ correlationId: "corr-crash-1", text: "drill message" }] })
  .catch(() => undefined);
setInterval(() => undefined, 60_000);
