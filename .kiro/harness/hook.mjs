#!/usr/bin/env node
// SPDX-License-Identifier: Apache-2.0
// Project entry; the imported launcher preserves its existing registry/input checks.
import { launch } from './launcher.mjs';

process.env.EINZBERN_HOST = 'kiro';
try {
  const output = await launch(process.argv.slice(2), process.env);
  if (output !== null) process.stdout.write(output);
} catch (error) {
  process.stderr.write(JSON.stringify({
    ok: false,
    reasonCode: error.reasonCode || 'HOOK_LAUNCH_FAILED',
    error: error.message,
  }) + '\n');
  process.exitCode = 0;
}
