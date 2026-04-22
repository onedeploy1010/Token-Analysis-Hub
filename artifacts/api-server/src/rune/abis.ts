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
