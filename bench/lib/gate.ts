import { cpus, totalmem, platform, release, arch } from "node:os";

/**
 * The real-model gate. Default off: without `--real-model` the bench runs only doubles. With `--real-model` it refuses, so
 * SUB-049 never reaches a real model. The real binding is for SUB-050 (Q60). The refusal exits with code 2.
 */
export function refuseRealModelRequest(argv: readonly string[], env: NodeJS.ProcessEnv): void {
  if (!argv.includes("--real-model")) return;
  const reason =
    env.VOXWARD_BENCH_REAL_MODEL === "1"
      ? "the real-model binding is not part of SUB-049; SUB-050 adds it with the Owner account (Q60)"
      : "--real-model also needs VOXWARD_BENCH_REAL_MODEL=1; by default the bench runs only doubles";
  process.stderr.write(`bench: refused: ${reason}\n`);
  process.exit(2);
}

export interface ParsedArgs {
  readonly out: string | undefined;
}

/** Accepts `--out <file>` and `--real-model` (which the gate refuses first). Any other argument exits with code 2. */
export function parseArgs(argv: readonly string[]): ParsedArgs {
  let out: string | undefined;
  for (let index = 0; index < argv.length; index++) {
    const arg = argv[index];
    if (arg === "--real-model") continue;
    if (arg === "--out" && index + 1 < argv.length) {
      out = argv[index + 1];
      index++;
      continue;
    }
    process.stderr.write(`bench: unknown argument ${String(arg)}; usage: [--out <file>]\n`);
    process.exit(2);
  }
  return { out };
}

export interface EnvironmentRecord {
  readonly generatedAt: string;
  readonly platform: string;
  readonly release: string;
  readonly arch: string;
  readonly cpuModel: string;
  readonly cpuCount: number;
  readonly memoryGiB: number;
  readonly node: string;
}

/** Hardware and runtime facts for a report. Time and environment are kept out of the reproducible quality summary. */
export function environmentRecord(): EnvironmentRecord {
  const cpu = cpus();
  return {
    generatedAt: new Date().toISOString(),
    platform: platform(),
    release: release(),
    arch: arch(),
    cpuModel: cpu[0]?.model ?? "unknown",
    cpuCount: cpu.length,
    memoryGiB: Math.round((totalmem() / 1024 ** 3) * 10) / 10,
    node: process.version,
  };
}
