import { WALRUS_AGGREGATOR } from "./constants";

export interface WalrusUploadResult {
  blobId: string;
  objectId?: string;
}

export async function writeToWalrus(
  data: string | Uint8Array,
  epochs = 5
): Promise<WalrusUploadResult> {
  const publisherUrl = process.env.WALRUS_PUBLISHER || "https://publisher.walrus-testnet.walrus.space";
  const raw = typeof data === "string" ? new TextEncoder().encode(data) : data;
  const body = Buffer.from(raw);

  const response = await fetch(`${publisherUrl}/v1/blobs?epochs=${epochs}`, {
    method: "PUT",
    body,
    headers: { "Content-Type": "application/octet-stream" },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Walrus upload failed: ${response.status} — ${text}`);
  }

  const result = await response.json();

  if (result.newlyCreated) {
    return {
      blobId: result.newlyCreated.blobObject.blobId,
      objectId: result.newlyCreated.blobObject.id,
    };
  }

  if (result.alreadyCertified) {
    return {
      blobId: result.alreadyCertified.blobId,
    };
  }

  throw new Error("Unexpected Walrus response format");
}

export async function readFromWalrus(blobId: string): Promise<string> {
  const url = `${WALRUS_AGGREGATOR}/v1/blobs/${blobId}`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Walrus read failed: ${response.status}`);
  }

  return response.text();
}

export async function readBlobAsBytes(blobId: string): Promise<Uint8Array> {
  const url = `${WALRUS_AGGREGATOR}/v1/blobs/${blobId}`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Walrus read failed: ${response.status}`);
  }

  const buffer = await response.arrayBuffer();
  return new Uint8Array(buffer);
}
