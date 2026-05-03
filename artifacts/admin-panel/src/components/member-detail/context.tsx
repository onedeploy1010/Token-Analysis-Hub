import { createContext, useCallback, useContext, useState, type ReactNode } from "react";

/**
 * State-only provider — does NOT render the modal itself, to avoid
 * circular imports between `context.tsx` and `modal.tsx`. App root
 * mounts `<MemberDetailProvider>` AND `<MemberDetailHost />` as siblings;
 * the host subscribes to the same context and renders the modal when
 * `addr` is set.
 */
interface Ctx {
  addr: string | null;
  open: (address: string) => void;
  close: () => void;
}

const MemberDetailCtx = createContext<Ctx | null>(null);

export function MemberDetailProvider({ children }: { children: ReactNode }) {
  const [addr, setAddr] = useState<string | null>(null);
  const open = useCallback((a: string) => setAddr((a ?? "").toLowerCase() || null), []);
  const close = useCallback(() => setAddr(null), []);
  return (
    <MemberDetailCtx.Provider value={{ addr, open, close }}>
      {children}
    </MemberDetailCtx.Provider>
  );
}

export function useMemberDetail(): Ctx {
  const v = useContext(MemberDetailCtx);
  if (!v) throw new Error("useMemberDetail must be used inside <MemberDetailProvider>");
  return v;
}
