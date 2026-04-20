import type { Dict, Language } from "./types";
import en from "./en";
import zh from "./zh";
import zhTW from "./zh-TW";
import ko from "./ko";
import ja from "./ja";
import th from "./th";
import vi from "./vi";

export type { Dict, Language };

export const dictionaries: Record<Language, Dict> = {
  en,
  zh,
  "zh-TW": zhTW,
  ko,
  ja,
  th,
  vi,
};

export { en, zh, zhTW, ko, ja, th, vi };
