import {
  SuiJsonRpcClient,
  JsonRpcHTTPTransport,
  getJsonRpcFullnodeUrl,
} from "@mysten/sui/jsonRpc";
import { TATUM_RPC, TATUM_API_KEY, SUI_NETWORK } from "./constants";

/**
 * Custom fetch that strips Sui SDK diagnostic headers before sending.
 *
 * The Sui TypeScript SDK auto-attaches several `client-*` diagnostic headers
 * (`client-sdk-version`, `client-request-method`, `client-target-api-version`,
 * ...) to every JSON-RPC request. Tatum's gateway CORS policy doesn't list
 * these under Access-Control-Allow-Headers, so the browser-side preflight is
 * rejected and the actual request never fires.
 *
 * These headers are diagnostic only — Tatum doesn't require them — so we strip
 * any `client-*` header before sending. Server-side fetches in Node skip CORS
 * so this is a no-op there.
 */
function tatumSafeFetch(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  if (!init?.headers) return fetch(input, init);
  const headers = new Headers(init.headers);
  const toDelete: string[] = [];
  headers.forEach((_value, name) => {
    if (name.toLowerCase().startsWith("client-")) {
      toDelete.push(name);
    }
  });
  toDelete.forEach((name) => headers.delete(name));
  return fetch(input, { ...init, headers });
}

export function makeSuiTransport(url: string) {
  return new JsonRpcHTTPTransport({
    url,
    fetch: tatumSafeFetch,
    rpc: TATUM_API_KEY
      ? { headers: { "x-api-key": TATUM_API_KEY } }
      : undefined,
  });
}

function createSuiClient() {
  const url = TATUM_RPC || getJsonRpcFullnodeUrl(SUI_NETWORK);
  return new SuiJsonRpcClient({
    transport: makeSuiTransport(url),
    network: SUI_NETWORK,
  });
}

export const suiClient = createSuiClient();
