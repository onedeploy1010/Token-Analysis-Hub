import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useLanguage, type Language } from "@/contexts/language-context";
import { Globe, Check } from "lucide-react";

type LanguageOption = {
  code: Language;
  label: string;
  short: string;
  flag: string;
};

const languages: LanguageOption[] = [
  { code: "zh", label: "简体中文", short: "简", flag: "🇨🇳" },
  { code: "zh-TW", label: "繁體中文", short: "繁", flag: "🇭🇰" },
  { code: "en", label: "English", short: "EN", flag: "🇺🇸" },
  { code: "ko", label: "한국어", short: "한", flag: "🇰🇷" },
  { code: "ja", label: "日本語", short: "日", flag: "🇯🇵" },
  { code: "th", label: "ไทย", short: "ไทย", flag: "🇹🇭" },
  { code: "vi", label: "Tiếng Việt", short: "VN", flag: "🇻🇳" },
];

export function LanguageToggle() {
  const { language, setLanguage } = useLanguage();
  const currentLang = languages.find((l) => l.code === language) ?? languages[0];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5"
          data-testid="button-language-toggle"
          aria-label="Select language"
        >
          <Globe className="h-4 w-4" />
          <span className="hidden sm:inline">{currentLang.label}</span>
          <span className="inline sm:hidden">{currentLang.short}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[10rem]">
        {languages.map((lang) => {
          const isActive = language === lang.code;
          return (
            <DropdownMenuItem
              key={lang.code}
              onClick={() => setLanguage(lang.code)}
              className={isActive ? "bg-accent" : ""}
              data-testid={`menu-language-${lang.code}`}
            >
              <span className="mr-2" aria-hidden>
                {lang.flag}
              </span>
              <span className="flex-1">{lang.label}</span>
              {isActive && <Check className="h-4 w-4 ml-2 opacity-70" />}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
