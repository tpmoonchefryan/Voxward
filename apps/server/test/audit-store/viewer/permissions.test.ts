import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { seedChannelAndSubject } from "../../db/helpers.js";
import { CHANNEL_ID, openFixture, type Fixture } from "../helpers.js";
import {
  ACTOR,
  NO_QUERY,
  accessEverywhere,
  accessWith,
  first,
  readAllChain,
  technicalEntry,
  unwrap,
  viewerOver,
} from "./viewer-helpers.js";

/*
 * VW-SUB031-AC001 (refusals and field permissions). Each negative case shows that no entry comes back, and that a
 * refused result has no `value` at all.
 */

const OTHER_CHANNEL = "channel-2";
const FORBIDDEN = { ok: false, code: "FORBIDDEN" };
const NOT_FOUND = { ok: false, code: "NOT_FOUND" };

let fixture: Fixture;
let channelOneLogId: string;
let channelTwoLogId: string;

beforeEach(() => {
  fixture = openFixture("viewer-permissions-");
  seedChannelAndSubject(fixture.database, "2");
  // Both channels use the same correlation id, so a leak would show up as the other channel's text.
  channelOneLogId = fixture.service.recordTechnical(
    technicalEntry(
      "corr-shared",
      "INGEST",
      [
        { kind: "MESSAGE_TEXT", payload: "message text of channel one" },
        { kind: "VALIDATED_JSON", payload: JSON.stringify({ itemId: "item-one" }) },
      ],
    ),
  ).logId;
  channelTwoLogId = fixture.service.recordTechnical(
    technicalEntry("corr-shared", "INGEST", [{ kind: "MESSAGE_TEXT", payload: "message text of channel two" }], {
      channelId: OTHER_CHANNEL,
      subjectRef: "subject-2",
    }),
  ).logId;
});

afterEach(() => {
  fixture.close();
});

describe("channel scope", () => {
  it("refuses every read to a reader without logs.view in the channel", () => {
    const { viewer } = viewerOver(fixture, accessWith(["queue.read", "message.original", "subject.evidence"]));

    expect(viewer.listChanges(ACTOR, CHANNEL_ID, NO_QUERY)).toEqual(FORBIDDEN);
    expect(viewer.listTechnical(ACTOR, CHANNEL_ID, NO_QUERY)).toEqual(FORBIDDEN);
    expect(viewer.readTechnical(ACTOR, CHANNEL_ID, channelOneLogId)).toEqual(FORBIDDEN);
    expect(viewer.readChain(ACTOR, CHANNEL_ID, "corr-shared", NO_QUERY)).toEqual(FORBIDDEN);
  });

  it("refuses a channel the reader does not hold logs.view in, even with a correct entry id", () => {
    const { viewer } = viewerOver(fixture, accessWith(["logs.view"], OTHER_CHANNEL));

    expect(viewer.readTechnical(ACTOR, CHANNEL_ID, channelOneLogId)).toEqual(FORBIDDEN);
    expect(viewer.readChain(ACTOR, CHANNEL_ID, "corr-shared", NO_QUERY)).toEqual(FORBIDDEN);
    expect(viewer.listTechnical(ACTOR, "channel-missing", NO_QUERY)).toEqual(FORBIDDEN);
  });

  it("answers a channel that does not exist exactly like one the reader cannot see", () => {
    const { viewer } = viewerOver(fixture, accessWith(["logs.view"]));

    expect(viewer.listTechnical(ACTOR, "channel-that-does-not-exist", NO_QUERY)).toEqual(FORBIDDEN);
    expect(viewer.listTechnical(ACTOR, OTHER_CHANNEL, NO_QUERY)).toEqual(FORBIDDEN);
  });

  it("does not return another channel's entry, even when the reader can see both channels", () => {
    const { viewer } = viewerOver(fixture, accessEverywhere(["logs.view", "message.original"]));

    // The channel-two id asked under channel one is not an entry of channel one.
    expect(viewer.readTechnical(ACTOR, CHANNEL_ID, channelTwoLogId)).toEqual(NOT_FOUND);
    expect(viewer.readTechnical(ACTOR, OTHER_CHANNEL, channelOneLogId)).toEqual(NOT_FOUND);
  });

  it("returns only the chain of the requested channel when two channels share a correlation id", () => {
    const { viewer } = viewerOver(fixture, accessEverywhere(["logs.view", "message.original"]));

    const chainOne = readAllChain(viewer, "corr-shared", 10, CHANNEL_ID);
    const chainTwo = readAllChain(viewer, "corr-shared", 10, OTHER_CHANNEL);

    expect(chainOne.map((item) => item.id)).toEqual([channelOneLogId]);
    expect(chainTwo.map((item) => item.id)).toEqual([channelTwoLogId]);
    expect(JSON.stringify(chainOne)).not.toContain("channel-2");
    expect(JSON.stringify(chainTwo)).not.toContain("channel one");
  });
});

describe("field permissions", () => {
  it("omits a content kind the reader lacks the permission for, instead of sending it empty", () => {
    const metadataOnly = viewerOver(fixture, accessWith(["logs.view"])).viewer;
    const withMessage = viewerOver(fixture, accessWith(["logs.view", "message.original"])).viewer;
    const withJson = viewerOver(fixture, accessWith(["logs.view", "subject.evidence"])).viewer;

    const bare = unwrap(metadataOnly.readTechnical(ACTOR, CHANNEL_ID, channelOneLogId));
    expect(bare.evidence).toEqual([]);
    expect(bare.stage).toBe("INGEST");
    expect(bare.modelRef).toBe("model-synthetic");

    expect(unwrap(withMessage.readTechnical(ACTOR, CHANNEL_ID, channelOneLogId)).evidence).toEqual([
      { kind: "MESSAGE_TEXT", state: "AVAILABLE", payload: "message text of channel one" },
    ]);
    expect(unwrap(withJson.readTechnical(ACTOR, CHANNEL_ID, channelOneLogId)).evidence).toEqual([
      { kind: "VALIDATED_JSON", state: "AVAILABLE", payload: JSON.stringify({ itemId: "item-one" }) },
    ]);
  });

  it("never puts content into a list item, whatever the reader's permissions", () => {
    const everything = viewerOver(fixture, accessWith(["logs.view", "message.original", "subject.evidence"])).viewer;

    const page = unwrap(everything.listTechnical(ACTOR, CHANNEL_ID, NO_QUERY));
    const item = first(page.items);

    expect(Object.keys(item)).not.toContain("evidence");
    expect(Object.keys(item)).not.toContain("data");
    expect(JSON.stringify(page)).not.toContain("message text of channel one");
  });

  it("gives a reader of a chain the same field filter as a reader of a single entry", () => {
    const metadataOnly = viewerOver(fixture, accessWith(["logs.view"])).viewer;

    const chain = readAllChain(metadataOnly, "corr-shared", 10);

    expect(JSON.stringify(chain)).not.toContain("message text");
    expect(JSON.stringify(chain)).not.toContain("item-one");
  });
});
