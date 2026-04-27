import { create } from "zustand";

/**
 * Lightweight store that lets the tutorial page signal the global layout
 * to spotlight the header's Connect Wallet button.
 */
interface TutorialState {
  connectSpotlight: boolean;
  setConnectSpotlight: (on: boolean) => void;
}

export const useTutorialStore = create<TutorialState>((set) => ({
  connectSpotlight: false,
  setConnectSpotlight: (on) => set({ connectSpotlight: on }),
}));
