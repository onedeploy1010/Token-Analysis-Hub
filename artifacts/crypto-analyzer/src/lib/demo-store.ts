import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { NodeId } from "@/lib/thirdweb/contracts";

interface DemoState {
  isDemoMode: boolean;
  demoAddress: string | null;
  demoNodeId: NodeId | null;
  enterDemo: (address: string, nodeId: NodeId) => void;
  exitDemo: () => void;
}

export const useDemoStore = create<DemoState>()(
  persist(
    (set) => ({
      isDemoMode: false,
      demoAddress: null,
      demoNodeId: null,
      enterDemo: (address, nodeId) =>
        set({ isDemoMode: true, demoAddress: address.toLowerCase(), demoNodeId: nodeId }),
      exitDemo: () =>
        set({ isDemoMode: false, demoAddress: null, demoNodeId: null }),
    }),
    { name: "rune-demo-mode" },
  ),
);
