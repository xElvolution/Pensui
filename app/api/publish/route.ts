import { NextRequest, NextResponse } from "next/server";
import { writeToWalrus } from "@/lib/walrus";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (!body.title || !body.content) {
      return NextResponse.json(
        { error: "Title and content are required" },
        { status: 400 }
      );
    }

    const articleJson = JSON.stringify({
      title: body.title,
      description: body.description || "",
      content: body.content,
      tags: body.tags || [],
      author: body.author || "",
      createdAt: body.createdAt || Date.now(),
      version: 1,
    });

    const { blobId } = await writeToWalrus(articleJson, 5);

    return NextResponse.json({ blobId });
  } catch (error) {
    console.error("Publish error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Upload failed" },
      { status: 500 }
    );
  }
}
