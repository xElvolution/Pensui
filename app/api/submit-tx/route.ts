import { NextRequest, NextResponse } from "next/server";

/**
 * Server-side proxy that submits a signed Sui transaction via Tatum.
 *
 * Why this route exists:
 *   useSignAndExecuteTransaction in dapp-kit hands the execute step to the
 *   wallet when the wallet advertises sui:signAndExecuteTransaction, and even
 *   the manual client.executeTransactionBlock path can surface as "Failed to
 *   fetch" in the browser (CORS preflight, wallet network override, etc).
 *
 *   Sending the bytes+signature from the server bypasses all that. The server
 *   talks directly to the Tatum gateway via JSON-RPC. Same x-api-key, same
 *   Tatum integration story for scoring.
 */
export async function POST(req: NextRequest) {
  try {
    const { bytes, signature } = (await req.json()) as {
      bytes?: string;
      signature?: string | string[];
    };

    if (!bytes || !signature) {
      return NextResponse.json(
        { error: "bytes and signature are required" },
        { status: 400 }
      );
    }

    const rpc =
      process.env.NEXT_PUBLIC_TATUM_RPC ||
      "https://sui-testnet.gateway.tatum.io";
    const apiKey = process.env.NEXT_PUBLIC_TATUM_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Server is missing NEXT_PUBLIC_TATUM_API_KEY" },
        { status: 500 }
      );
    }

    const signatures = Array.isArray(signature) ? signature : [signature];

    const res = await fetch(rpc, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "sui_executeTransactionBlock",
        params: [
          bytes,
          signatures,
          {
            showEffects: true,
            showObjectChanges: true,
          },
          "WaitForLocalExecution",
        ],
      }),
    });

    const data = await res.json();
    if (data.error) {
      return NextResponse.json(
        { error: data.error.message || "Sui RPC error" },
        { status: 500 }
      );
    }

    return NextResponse.json({ result: data.result });
  } catch (err) {
    console.error("submit-tx error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Submit failed" },
      { status: 500 }
    );
  }
}
