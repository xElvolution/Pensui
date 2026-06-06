"use client";

import { WalrusFile } from "@mysten/walrus";
import type { SuiJsonRpcClient } from "@mysten/sui/jsonRpc";
import { getWalrusClient } from "./walrus-client";

export type WalrusUploadStep =
  | "idle"
  | "encoding"
  | "registering"
  | "uploading"
  | "certifying"
  | "done";

export interface SignAndExecute {
  (input: { transaction: unknown }): Promise<{ digest: string }>;
}

interface UploadBlobArgs {
  suiClient: SuiJsonRpcClient;
  signAndExecute: SignAndExecute;
  bytes: Uint8Array;
  owner: string;
  epochs?: number;
  onStep?: (step: WalrusUploadStep, blobId?: string) => void;
}

/**
 * Wallet-signed single-blob upload to Walrus using the official SDK.
 *
 * Browser-friendly flow (per Walrus docs):
 *   1. encode   — RS-encode bytes, derive blobId        (no signing)
 *   2. register — on-chain tx that reserves storage    (wallet popup #1)
 *   3. upload   — push slivers to storage nodes        (no signing)
 *   4. certify  — on-chain tx that finalises the blob  (wallet popup #2)
 *
 * Pays Sui gas + WAL on the user's wallet. No central publisher involved.
 * The returned blobId is fetchable directly from any Walrus aggregator.
 */
export async function uploadBlobToWalrus({
  suiClient,
  signAndExecute,
  bytes,
  owner,
  epochs = 5,
  onStep,
}: UploadBlobArgs): Promise<{ blobId: string; blobObjectId: string }> {
  const client = getWalrusClient(suiClient);

  const flow = client.writeBlobFlow({ blob: bytes });

  onStep?.("encoding");
  const encoded = await flow.encode();
  onStep?.("encoding", encoded.blobId);

  onStep?.("registering", encoded.blobId);
  const registerTx = flow.register({
    epochs,
    owner,
    deletable: false,
  });
  const registerResult = await signAndExecute({ transaction: registerTx });

  onStep?.("uploading", encoded.blobId);
  await flow.upload({ digest: registerResult.digest });

  onStep?.("certifying", encoded.blobId);
  const certifyTx = flow.certify();
  await signAndExecute({ transaction: certifyTx });

  const blob = await flow.getBlob();
  onStep?.("done", encoded.blobId);

  return {
    blobId: encoded.blobId,
    blobObjectId: blob.blobId,
  };
}

interface UploadFilesArgs {
  suiClient: SuiJsonRpcClient;
  signAndExecute: SignAndExecute;
  files: { contents: Uint8Array; identifier: string; tags?: Record<string, string> }[];
  owner: string;
  epochs?: number;
  onStep?: (step: WalrusUploadStep, blobId?: string) => void;
}

/**
 * Wallet-signed multi-file Quilt upload.
 *
 * Bundles N files into a single Walrus blob using the Quilt encoding so each
 * file is addressable by its own patch id. Use this for article + cover image
 * + inline media as one storage atom. Reads require getFiles(patchId) via the
 * Walrus SDK, not the bare aggregator URL.
 */
export async function uploadQuiltToWalrus({
  suiClient,
  signAndExecute,
  files,
  owner,
  epochs = 5,
  onStep,
}: UploadFilesArgs): Promise<{
  blobId: string;
  files: { id: string; identifier: string }[];
}> {
  const client = getWalrusClient(suiClient);

  const walrusFiles = files.map((f) =>
    WalrusFile.from({
      contents: f.contents,
      identifier: f.identifier,
      tags: f.tags,
    })
  );

  const flow = client.writeFilesFlow({ files: walrusFiles });

  onStep?.("encoding");
  const encoded = await flow.encode();
  onStep?.("encoding", encoded.blobId);

  onStep?.("registering", encoded.blobId);
  const registerTx = flow.register({
    epochs,
    owner,
    deletable: false,
  });
  const registerResult = await signAndExecute({ transaction: registerTx });

  onStep?.("uploading", encoded.blobId);
  await flow.upload({ digest: registerResult.digest });

  onStep?.("certifying", encoded.blobId);
  const certifyTx = flow.certify();
  await signAndExecute({ transaction: certifyTx });

  const listed = await flow.listFiles();
  onStep?.("done", encoded.blobId);

  return {
    blobId: encoded.blobId,
    files: listed.map((f, i) => ({
      id: f.id,
      identifier: files[i]?.identifier ?? "",
    })),
  };
}
