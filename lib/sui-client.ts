import { SuiJsonRpcClient, getJsonRpcFullnodeUrl } from "@mysten/sui/jsonRpc";
import { TATUM_RPC, SUI_NETWORK } from "./constants";

function createSuiClient() {
  const url = TATUM_RPC || getJsonRpcFullnodeUrl(SUI_NETWORK);
  return new SuiJsonRpcClient({ url, network: SUI_NETWORK });
}

export const suiClient = createSuiClient();
