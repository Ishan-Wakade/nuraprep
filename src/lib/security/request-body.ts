import { Buffer } from "node:buffer";

export const MAX_STRIPE_WEBHOOK_BODY_BYTES = 1_048_576;

export class RequestBodyTooLargeError extends Error {
  constructor(maximumBytes: number) {
    super(`Request body exceeds the ${maximumBytes}-byte limit.`);
    this.name = "RequestBodyTooLargeError";
  }
}

export async function readBoundedRequestBody(
  request: Pick<Request, "body" | "headers">,
  maximumBytes: number,
): Promise<Buffer> {
  if (!Number.isInteger(maximumBytes) || maximumBytes < 1) {
    throw new Error("Request body limit must be a positive integer.");
  }

  const declaredLength = request.headers.get("content-length");
  if (declaredLength && /^\d+$/.test(declaredLength)) {
    const parsedLength = Number(declaredLength);
    if (!Number.isSafeInteger(parsedLength) || parsedLength > maximumBytes) {
      throw new RequestBodyTooLargeError(maximumBytes);
    }
  }

  if (!request.body) return Buffer.alloc(0);

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let receivedBytes = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      receivedBytes += value.byteLength;
      if (receivedBytes > maximumBytes) {
        await reader.cancel().catch(() => undefined);
        throw new RequestBodyTooLargeError(maximumBytes);
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  return Buffer.concat(chunks, receivedBytes);
}
