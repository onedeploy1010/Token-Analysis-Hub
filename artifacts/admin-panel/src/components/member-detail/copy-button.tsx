import { useState } from "react";
import { Copy, Check } from "lucide-react";

/**
 * One-click copy button. Sits inline next to wallet addresses + tx hashes
 * everywhere in the admin panel. Stops propagation so it works inside
 * `<button>` rows that already have a click handler.
 */
export function CopyButton({ value, title = "复制", className = "" }: {
  value: string;
  title?: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        e.preventDefault();
        void navigator.clipboard.writeText(value).then(() => {
          setCopied(true);
          window.setTimeout(() => setCopied(false), 1200);
        });
      }}
      className={`p-1 rounded hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-colors shrink-0 ${className}`}
      title={title}
      aria-label={title}
    >
      {copied ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
    </button>
  );
}
