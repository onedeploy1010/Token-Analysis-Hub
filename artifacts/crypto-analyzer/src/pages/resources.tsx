import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Download, FileText, Presentation, BookOpen, Image, Globe } from "lucide-react";
import { useLanguage } from "@/contexts/language-context";
import { cn } from "@/lib/utils";

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

type Language = "zh" | "zh-TW" | "en" | "ja" | "ko" | "th" | "vi";

interface Resource {
  id: number;
  language: string;
  category: string;
  title: string;
  description: string;
  fileUrl: string;
  fileType: string;
  fileSize: string;
  sortOrder: number;
}

const LANG_OPTIONS: { code: Language; label: string; native: string }[] = [
  { code: "zh",    label: "简体中文",  native: "ZH" },
  { code: "zh-TW", label: "繁體中文",  native: "ZH-TW" },
  { code: "en",    label: "English",   native: "EN" },
  { code: "ja",    label: "日本語",    native: "JA" },
  { code: "ko",    label: "한국어",    native: "KO" },
  { code: "th",    label: "ภาษาไทย",  native: "TH" },
  { code: "vi",    label: "Tiếng Việt",native: "VI" },
];

const CATEGORY_META: Record<string, { icon: typeof FileText; colorClass: string }> = {
  whitepaper:  { icon: FileText,     colorClass: "text-amber-400" },
  ppt:         { icon: Presentation, colorClass: "text-blue-400" },
  system:      { icon: BookOpen,     colorClass: "text-emerald-400" },
  infographic: { icon: Image,        colorClass: "text-purple-400" },
};

const CAT_KEYS: Record<string, string> = {
  whitepaper:  "mr.library.cat.whitepaper",
  ppt:         "mr.library.cat.ppt",
  system:      "mr.library.cat.system",
  infographic: "mr.library.cat.infographic",
};

function FileTypeBadge({ type }: { type: string }) {
  return (
    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider bg-white/5 text-muted-foreground border border-border/30">
      {type}
    </span>
  );
}

function ResourceCard({ resource, downloadLabel }: { resource: Resource; downloadLabel: string }) {
  const meta = CATEGORY_META[resource.category] ?? CATEGORY_META.whitepaper;
  const Icon = meta.icon;

  return (
    <div className="relative border border-border/40 bg-card/40 rounded-lg p-4 flex flex-col gap-3 hover:border-primary/40 hover:bg-card/60 transition-all group">
      <div className="corner-brackets" />
      <div className="flex items-start gap-3">
        <div className={cn("shrink-0 mt-0.5", meta.colorClass)}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground leading-snug line-clamp-2">
            {resource.title}
          </p>
          {resource.description && (
            <p className="text-[11px] text-muted-foreground/70 mt-1 line-clamp-2">
              {resource.description}
            </p>
          )}
        </div>
      </div>
      <div className="flex items-center justify-between gap-2 pt-1 border-t border-border/20">
        <div className="flex items-center gap-1.5">
          <FileTypeBadge type={resource.fileType} />
          {resource.fileSize && (
            <span className="text-[11px] text-muted-foreground/50">{resource.fileSize}</span>
          )}
        </div>
        <a
          href={resource.fileUrl}
          target="_blank"
          rel="noopener noreferrer"
          download
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-semibold bg-primary/10 text-primary border border-primary/25 hover:bg-primary/20 hover:border-primary/50 transition-all"
        >
          <Download className="h-3 w-3" />
          {downloadLabel}
        </a>
      </div>
    </div>
  );
}

export default function Resources() {
  const { language, t } = useLanguage();
  const [selectedLang, setSelectedLang] = useState<Language>(language as Language);

  const { data: resources = [], isLoading } = useQuery<Resource[]>({
    queryKey: ["resources", selectedLang],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/api/resources?language=${selectedLang}`);
      if (!res.ok) throw new Error("Failed to fetch resources");
      return res.json();
    },
  });

  const grouped = resources.reduce<Record<string, Resource[]>>((acc, r) => {
    (acc[r.category] ??= []).push(r);
    return acc;
  }, {});

  const hasAny = resources.length > 0;
  const isEn = language === "en";
  const downloadLabel = t("mr.library.download");

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-10 max-w-5xl">

        {/* ── Hero ── */}
        <div className="mb-8">
          <div className="text-[11px] uppercase tracking-[0.22em] text-primary/60 font-medium mb-2">
            {isEn ? "RESOURCE LIBRARY · 资料库" : "资料库 · RESOURCE LIBRARY"}
          </div>
          <h1 className="text-3xl font-bold tracking-tight mb-1">{t("mr.library.title")}</h1>
          <p className="text-muted-foreground text-sm">{t("mr.library.sub")}</p>
        </div>

        {/* ── Language selector ── */}
        <div className="mb-8 flex flex-wrap gap-2">
          {LANG_OPTIONS.map((opt) => (
            <button
              key={opt.code}
              onClick={() => setSelectedLang(opt.code)}
              className={cn(
                "flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-all",
                selectedLang === opt.code
                  ? "border-primary/60 bg-primary/10 text-primary"
                  : "border-border/40 bg-card/30 text-muted-foreground hover:border-border/70 hover:text-foreground"
              )}
            >
              <Globe className="h-3.5 w-3.5 shrink-0" />
              <span>{opt.label}</span>
              <span className={cn(
                "text-[11px] font-bold tracking-wider px-1 py-0.5 rounded",
                selectedLang === opt.code ? "bg-primary/20 text-primary" : "bg-white/5 text-muted-foreground/50"
              )}>{opt.native}</span>
            </button>
          ))}
        </div>

        {/* ── Content ── */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-28 rounded-lg border border-border/30 bg-card/20 animate-pulse" />
            ))}
          </div>
        ) : !hasAny ? (
          <div className="flex flex-col items-center justify-center py-24 text-center gap-4">
            <div className="w-14 h-14 rounded-2xl border border-border/30 bg-card/30 flex items-center justify-center">
              <BookOpen className="h-6 w-6 text-muted-foreground/40" />
            </div>
            <p className="text-muted-foreground/60 text-sm max-w-xs">{t("mr.library.empty")}</p>
          </div>
        ) : (
          <div className="space-y-8">
            {Object.entries(grouped).map(([cat, items]) => {
              const meta = CATEGORY_META[cat] ?? CATEGORY_META.whitepaper;
              const Icon = meta.icon;
              const catLabel = t(CAT_KEYS[cat] ?? cat);
              return (
                <section key={cat}>
                  <div className="flex items-center gap-2 mb-3">
                    <Icon className={cn("h-4 w-4", meta.colorClass)} />
                    <h2 className="text-sm font-semibold uppercase tracking-wider text-foreground/80">
                      {catLabel}
                    </h2>
                    <div className="flex-1 h-px bg-border/30 ml-2" />
                    <span className="text-[11px] text-muted-foreground/40 font-mono">{items.length}</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {items.map(r => (
                      <ResourceCard key={r.id} resource={r} downloadLabel={downloadLabel} />
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
