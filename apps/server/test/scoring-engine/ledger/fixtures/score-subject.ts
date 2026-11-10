// Child-process fixture for concurrency.test.ts. Run with `node --import tsx`; prints one JSON summary line.
import { createVerdict } from "@voxward/contracts";
import { openDatabase } from "../../../../src/db/client.js";
import { createScoringLedgerPort } from "../../../../src/db/scoring-ledger.js";
import { createScoringEngine } from "../../../../src/modules/scoring-engine/index.js";
import { makeEvent } from "../../synthetic.js";

const [filePath = "", workerId = "", mode = "", countText = "", channelId = "", senderRef = ""] = process.argv.slice(2);
if (filePath === "" || workerId === "" || mode === "" || countText === "" || channelId === "" || senderRef === "") {
  throw new Error("usage: score-subject.ts <file> <worker> <same-event|penalties> <count> <channelId> <senderRef>");
}

// Synthetic values. Penalties of 5 from 0 down to -100 give exactly 20 effective changes.
const CONFIG = {
  enabled: true,
  minScore: -100,
  maxScore: 100,
  complianceReward: 2,
  violationPenalty: 5,
  rewardCooldownMs: 0,
};

async function main(): Promise<void> {
  const database = openDatabase({ filePath });
  const engine = createScoringEngine({ ledger: createScoringLedgerPort(database), config: CONFIG });
  const sameEvent = mode === "same-event";
  const summary = { failed: 0, deltas: [] as number[] };

  for (let index = 0; index < Number(countText); index += 1) {
    const event = makeEvent({
      channelId,
      senderRef,
      messageId: sameEvent ? "shared-1" : `${workerId}-${index}`,
    });
    try {
      const change = await engine.applyVerdict(event, createVerdict(sameEvent ? "ALLOW_MEANINGFUL" : "BLOCK"));
      summary.deltas.push(change.delta);
    } catch {
      summary.failed += 1;
    }
  }

  database.close();
  process.stdout.write(JSON.stringify(summary));
}

await main();
