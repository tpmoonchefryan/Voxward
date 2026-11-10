// Child-process fixture for concurrency.test.ts. Run with `node --import tsx`; prints one JSON summary line.
import { openDatabase } from "../../../src/db/client.js";
import { ChannelEventStore } from "../../../src/db/repository.js";
import { runShortTransaction } from "../../../src/db/transaction.js";

const [filePath, workerId, countText, channelId, subjectId] = process.argv.slice(2);
if (filePath === undefined || workerId === undefined || countText === undefined || channelId === undefined || subjectId === undefined) {
  throw new Error("usage: record-events.ts <file> <worker> <count> <channelId> <subjectId>");
}

const RECEIVED_AT = "2026-11-10T10:02:00.000Z";
const database = openDatabase({ filePath });
const summary = { created: 0, duplicate: 0, failed: 0 };

for (let index = 0; index < Number(countText); index += 1) {
  try {
    const result = runShortTransaction(database, (tx) =>
      ChannelEventStore.recordIfNew(tx, {
        id: `${workerId}-${index}`,
        channelId,
        subjectId,
        platformMessageRef: `message-${index}`,
        platformOrder: index,
        receivedAt: RECEIVED_AT,
        correlationId: `corr-${workerId}-${index}`,
        exceptionMarked: false,
        createdAt: RECEIVED_AT,
      }),
    );
    summary[result.status] += 1;
  } catch {
    summary.failed += 1;
  }
}

database.close();
process.stdout.write(JSON.stringify(summary));
