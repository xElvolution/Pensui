import { NextRequest, NextResponse } from "next/server";
import { writeToWalrus } from "@/lib/walrus";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const buffer = await file.arrayBuffer();
    const bytes = new Uint8Array(buffer);

    const { blobId } = await writeToWalrus(bytes, 5);

    const aggregatorUrl = process.env.NEXT_PUBLIC_WALRUS_AGGREGATOR || "https://aggregator.walrus-testnet.walrus.space";
    const url = `${aggregatorUrl}/v1/blobs/${blobId}`;

    return NextResponse.json({ blobId, url });
  } catch (error) {
    console.error("Image upload error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Upload failed" },
      { status: 500 }
    );
  }
}
