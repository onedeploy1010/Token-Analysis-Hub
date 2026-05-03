import { getAddress } from "viem";
import { ExternalLink } from "lucide-react";
import { useMemberDetail } from "./context";
import { CopyButton } from "./copy-button";
import { adminChainId } from "@/lib/supabase";

const EXPLORER = adminChainId === 56 ? "https://bscscan.com" : "https://testnet.bscscan.com";

/**
 * Single wallet-address renderer for the entire admin panel. Clicking the
 * address opens the global `<MemberDetailModal>`. The full checksummed
 * address is always shown (not truncated) — followed by a copy button and
 * an explorer link, both stop-propagation so they don't trigger the
 * detail modal when clicked.
 */
interface Props {
  addr: string;
  className?: string;
  /** Leading icon / chip / V-level pill rendered before the address. */
  leading?: React.ReactNode;
  /** Hide the explorer-link icon — useful in dense tables. */
  hideExplorer?: boolean;
}

function checksum(addr: string): string {
  try { return getAddress(addr); } catch { return addr; }
}

export function AddressButton({ addr, className, leading, hideExplorer }: Props) {
  const { open } = useMemberDetail();
  const display = checksum(addr);
  return (
    <span className={`inline-flex items-center gap-1 max-w-full ${className ?? ""}`}>
      {leading}
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); open(addr); }}
        className="font-mono text-[11px] text-foreground/85 hover:text-primary transition-colors break-all text-left"
        title="点击查看会员详情"
        data-testid="address-button"
      >
        {display}
      </button>
      <CopyButton value={display} title="复制地址" />
      {!hideExplorer && (
        <a
          href={`${EXPLORER}/address/${display}`}
          target="_blank" rel="noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="p-1 rounded hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-colors shrink-0"
          title="区块浏览器"
        >
          <ExternalLink className="h-3 w-3" />
        </a>
      )}
    </span>
  );
}

/**
 * Full-tx-hash renderer with the same copy + explorer treatment. Use
 * everywhere a `tx_hash` shows up so admins can verify on-chain.
 */
export function TxHashLink({ hash, className }: { hash: string; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1 max-w-full ${className ?? ""}`}>
      <a
        href={`${EXPLORER}/tx/${hash}`}
        target="_blank" rel="noreferrer"
        onClick={(e) => e.stopPropagation()}
        className="font-mono text-[11px] text-primary/90 hover:text-primary hover:underline break-all"
        title="区块浏览器查看 tx"
      >
        {hash}
      </a>
      <CopyButton value={hash} title="复制 tx hash" />
      <a
        href={`${EXPLORER}/tx/${hash}`}
        target="_blank" rel="noreferrer"
        onClick={(e) => e.stopPropagation()}
        className="p-1 rounded hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-colors shrink-0"
        title="区块浏览器"
      >
        <ExternalLink className="h-3 w-3" />
      </a>
    </span>
  );
}
