import { readScPayment, type ScPayment } from "@voxward/contracts";
import { and, desc, eq, gt, inArray } from "drizzle-orm";
import type { VoxwardDatabase } from "./client.js";
import { technicalLogs } from "./schema/index.js";

interface PaidEventMetadata {
  readonly payment: ScPayment | null;
  readonly amountDisplay?: string;
}

export function readPaidEvents(database: VoxwardDatabase, channelId: string, correlationIds: readonly string[], nowIso: string) {
  const result = new Map<string, PaidEventMetadata>();
  if (correlationIds.length === 0) return result;
  const rows = database.orm
    .select({ correlationId: technicalLogs.correlationId, data: technicalLogs.dataJson })
    .from(technicalLogs)
    .where(and(eq(technicalLogs.channelId, channelId), eq(technicalLogs.stage, "BASE_RULE"),
      inArray(technicalLogs.correlationId, [...correlationIds]), gt(technicalLogs.expiresAt, nowIso)))
    .orderBy(desc(technicalLogs.sequence))
    .all();
  for (const row of rows) {
    if (row.data === null || result.has(row.correlationId)) continue;
    const data = JSON.parse(row.data) as {
      isPaid?: unknown; scAmountMicros?: unknown; scCurrency?: unknown; scTier?: unknown; amountDisplay?: unknown;
    } | null;
    const payment = readScPayment({ amountMicros: data?.scAmountMicros, currency: data?.scCurrency, tier: data?.scTier });
    if (payment === null && data?.isPaid !== true) continue;
    const amountDisplay = typeof data?.amountDisplay === "string" ? data.amountDisplay.trim() : "";
    result.set(row.correlationId, { payment, ...(amountDisplay === "" ? {} : { amountDisplay }) });
  }
  return result;
}
