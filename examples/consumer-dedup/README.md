# Consumer deduplication sample

A small consumer for the native output protocol, version 1 (`docs/protocol/output-native-v1.md`). It shows each delivery
once, using the `deliveryId` of each frame.

- `dedupe.mjs` holds the deduplication rule. Its tests are in `apps/server/test/output-adapter/delivery/consumer-dedup.test.ts`.
- `consumer.mjs` connects to a local endpoint and prints each delivery once.

## Run it on this machine

The endpoint listens on `127.0.0.1`, and this sample connects only to `127.0.0.1`.

```sh
VOXWARD_OUTPUT_CREDENTIAL=vwo_<credential issued from the channel's output-grant route> \
  node examples/consumer-dedup/consumer.mjs
```

Optional: `VOXWARD_OUTPUT_URL=ws://127.0.0.1:3000/output/v1/room`.

The credential is read from the environment only. It is not printed and not put in the URL.

## What the sample does not do

- It does not promise that a person saw the text. It shows that a frame arrived and was not a repeat.
- It does not replay anything. A frame whose `validUntil` has passed is skipped.
- It does not send anything to the server. The protocol is read-only.
