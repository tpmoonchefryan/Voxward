// Child-process fixture for concurrency.test.ts. It commits one channel, then is killed inside a second
// transaction before that transaction commits. Run with `node --import tsx`.
import { openDatabase } from "../../../src/db/client.js";
import { runShortTransaction } from "../../../src/db/transaction.js";
import { channels } from "../../../src/db/schema/index.js";

const [filePath] = process.argv.slice(2);
if (filePath === undefined) throw new Error("usage: write-then-die.ts <file>");

const STAMP = "2026-11-10T10:03:00.000Z";
const channelRow = (id: string) => ({
  id,
  platform: "youtube",
  platformChannelRef: `UC-${id}`,
  displayName: id,
  createdAt: STAMP,
  updatedAt: STAMP,
});

const database = openDatabase({ filePath });

runShortTransaction(database, (tx) => {
  tx.insert(channels).values(channelRow("committed-channel")).run();
});

runShortTransaction(database, (tx) => {
  tx.insert(channels).values(channelRow("doomed-channel")).run();
  // Dies before the COMMIT. The write above must not survive.
  process.kill(process.pid, "SIGKILL");
});
