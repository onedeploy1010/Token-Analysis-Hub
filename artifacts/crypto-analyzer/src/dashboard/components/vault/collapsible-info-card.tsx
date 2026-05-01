import { useState, type ReactNode } from "react";
import { ChevronDown, Info } from "lucide-react";
import { cn } from "@dashboard/lib/utils";

/**
 * Tiny collapsible info card. Used to fold the benefits / formula blurbs on
 * the vault lock + burn sections so the page lands on the action surface
 * (period selector, amount input) instead of three screens of preamble.
 */
export function CollapsibleInfoCard({
  title,
  defaultOpen = false,
  accent = "primary",
  icon: IconComp = Info,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  /** Accent semantic token — primary (amber) for lock, red for burn. */
  accent?: "primary" | "red";
  icon?: React.ComponentType<{ className?: string }>;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const palette =
    accent === "red"
      ? {
          ring: "ring-red-500/25",
          bg: "bg-red-500/[0.05]",
          iconWrap: "bg-red-500/15 ring-red-500/30",
          iconColor: "text-red-300",
        }
      : {
          ring: "ring-primary/25",
          bg: "bg-primary/[0.04]",
          iconWrap: "bg-primary/15 ring-primary/30",
          iconColor: "text-primary",
        };

  return (
    <div className={cn("rounded-xl ring-1 transition-colors", palette.ring, palette.bg)}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-3 py-2.5 text-left"
        aria-expanded={open}
      >
        <div className="flex items-center gap-2">
          <div className={cn("h-6 w-6 rounded-md flex items-center justify-center ring-1", palette.iconWrap)}>
            <IconComp className={cn("h-3 w-3", palette.iconColor)} />
          </div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{title}</span>
        </div>
        <ChevronDown
          className={cn("h-3.5 w-3.5 text-muted-foreground transition-transform", open ? "rotate-180" : "rotate-0")}
        />
      </button>
      {open && <div className="px-3 pb-3 pt-1 space-y-2">{children}</div>}
    </div>
  );
}
