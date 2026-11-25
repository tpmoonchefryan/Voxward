import {
  NATIVE_OUTPUT_PROTOCOL,
  NATIVE_OUTPUT_VERSION,
  type ApprovedContent,
  type DeliverFrame,
  type HelloFrame,
  type NativeFrame,
  type SendableDelivery,
  type WardBlockedFrame,
} from "@voxward/contracts";

/** The opening frame. It is sent once the credential has been accepted. */
export function helloFrame(heartbeatMs: number): HelloFrame {
  return { type: "HELLO", version: NATIVE_OUTPUT_VERSION, protocol: NATIVE_OUTPUT_PROTOCOL, heartbeatMs };
}

/**
 * The frame for one sendable delivery. A BLOCK verdict never reads content, so it carries no text. An ALLOW verdict needs
 * approved content. Without it the delivery cannot be shown, and the result is undefined so the caller marks the row FAILED.
 */
export function frameFor(delivery: SendableDelivery, content: ApprovedContent | undefined): NativeFrame | undefined {
  if (delivery.verdict === "BLOCK") return blockedFrame(delivery);
  if (content === undefined) return undefined;
  return deliverFrame(delivery, content);
}

/** The ALLOW frame. */
export function deliverFrame(delivery: SendableDelivery, content: ApprovedContent): DeliverFrame {
  return {
    type: "DELIVER",
    version: NATIVE_OUTPUT_VERSION,
    deliveryId: delivery.deliveryId,
    deliverySequence: delivery.deliverySequence,
    platformOrder: delivery.platformOrder,
    validUntil: delivery.validUntil,
    display: {
      label: null,
      text: content.text,
      translation: content.translation,
      ...(content.payment === undefined ? {} : { payment: content.payment }),
      ...(content.amountDisplay === undefined ? {} : { amountDisplay: content.amountDisplay }),
    },
  };
}

/** The BLOCK frame. It has no text, no translation and no identity. The field list is `NATIVE_FRAME_FIELDS.WARD_BLOCKED`. */
export function blockedFrame(delivery: SendableDelivery): WardBlockedFrame {
  return {
    type: "WARD_BLOCKED",
    version: NATIVE_OUTPUT_VERSION,
    deliveryId: delivery.deliveryId,
    deliverySequence: delivery.deliverySequence,
    platformOrder: delivery.platformOrder,
    validUntil: delivery.validUntil,
  };
}
