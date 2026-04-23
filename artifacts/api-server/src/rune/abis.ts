import { parseAbiItem } from "viem";

/**
 * Only the bits the backend needs.
 * Full ABIs live on the frontend for contract reads/writes; we keep this
 * file narrow so the indexer bundle stays small and the event schema is
 * legible in one place.
 */

// Community
export const eventAddReferrer = parseAbiItem(
  "event EventAddReferrer(address indexed user, address referrer)",
);

// NodePresell
export const eventNodePresell = parseAbiItem(
  "event EventNodePresell(address indexed user, address payToken, uint256 amount, uint256 time, uint256 num, uint256 nodeId)",
);

/** Read-only view used by node-rates.ts to keep the directRate cache
 *  in sync with whatever the proxy is currently serving. */
export const fnGetNodeConfigs = parseAbiItem(
  "function getNodeConfigs(uint256[] nodeIds_) view returns ((uint256 nodeId, address payToken, uint256 payAmount, uint256 maxLimit, uint256 curNum, uint256 directRate)[])",
);
