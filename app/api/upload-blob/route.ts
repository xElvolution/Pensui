import { NextRequest, NextResponse } from "next/server";
import { writeToWalrus } from "@/lib/walrus";

/**
 * Generic blob upload endpoint. Takes raw JSON in the body and pushes it to
 * Walrus via the testnet publisher, returning the blob id. Used for small
 * metadata blobs (e.g. profile bio + socials) where the wallet-signed SDK
 * flow is overkill and prone to WAL / CORS / WASM failures in the browser.
 *
 * Article content goes through the wallet-signed flow in lib/walrus-upload.ts.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.text();
    if (!body || body.length === 0) {
      return NextResponse.json(
        { error: "Empty body" },
        { status: 400 }
      );
    }
    if (body.length > 64 * 1024) {
      return NextResponse.json(
        { error: "Payload too large for this endpoint (64KB max)" },
        { status: 413 }
      );
    }
    const { blobId } = await writeToWalrus(body, 5);
    return NextResponse.json({ blobId });
  } catch (error) {
    console.error("upload-blob error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Upload failed" },
      { status: 500 }
    );
  }
}
