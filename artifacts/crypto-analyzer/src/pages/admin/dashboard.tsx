import { useEffect, useState } from "react";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FolderOpen, FileText, Globe, HardDrive, Clock, ExternalLink } from "lucide-react";
import { supabase, MATERIALS_BUCKET } from "@/lib/supabase";
import type { FileObject } from "@supabase/storage-js";

/** Pretty-print a byte count as KB / MB / GB. */
function fmtBytes(n: number) {
  if (n >= 1e9) return `${(n / 1e9).toFixed(2)} GB`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(2)} MB`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)} KB`;
  return `${n} B`;
}

const LANG_FOLDERS = ["zh", "zh-TW", "en", "ko", "ja", "th", "vi"] as const;

interface LangStat {
  lang: string;
  files: number;
  bytes: number;
  latest: FileObject | null;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<LangStat[] | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      if (!supabase) return;
      try {
        const rows = await Promise.all(
          LANG_FOLDERS.map(async (lang): Promise<LangStat> => {
            const { data, error } = await supabase.storage
              .from(MATERIALS_BUCKET)
              .list(lang, { limit: 1000, sortBy: { column: "updated_at", order: "desc" } });
            if (error) throw error;
            const files = (data ?? []).filter(f => f.name && !f.name.endsWith("/"));
            const bytes = files.reduce((sum, f) => sum + ((f.metadata as any)?.size ?? 0), 0);
            return { lang, files: files.length, bytes, latest: files[0] ?? null };
          })
        );
        setStats(rows);
      } catch (e: any) {
        setErr(e?.message ?? String(e));
      }
    })();
  }, []);

  const totalFiles = stats?.reduce((s, r) => s + r.files, 0) ?? 0;
  const totalBytes = stats?.reduce((s, r) => s + r.bytes, 0) ?? 0;
  const latestOverall = stats
    ?.map(s => s.latest)
    .filter((f): f is FileObject => !!f)
    .sort((a, b) => (b.updated_at ?? "").localeCompare(a.updated_at ?? ""))[0] ?? null;

  return (
    <div className="space-y-8">
      <div className="flex items-end justify-between border-b border-border/40 pb-5">
        <div>
          <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-primary/60 block mb-1">Overview</span>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Materials across {LANG_FOLDERS.length} locales.</p>
        </div>
        <Link href="/admin/materials">
          <Button size="sm" className="gap-2">
            <FolderOpen className="h-4 w-4" /> Manage materials
          </Button>
        </Link>
      </div>

      {err && (
        <div className="border border-destructive/30 bg-destructive/5 rounded-lg p-4 text-sm text-destructive">
          {err}
        </div>
      )}

      {/* KPI row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Kpi icon={FileText}  label="Total files"    value={stats ? String(totalFiles) : "—"} />
        <Kpi icon={HardDrive} label="Total size"     value={stats ? fmtBytes(totalBytes) : "—"} />
        <Kpi icon={Globe}     label="Locales"        value={String(LANG_FOLDERS.length)} />
        <Kpi icon={Clock}     label="Latest upload"  value={latestOverall?.updated_at ? new Date(latestOverall.updated_at).toLocaleDateString() : "—"} />
      </div>

      {/* Per-language breakdown */}
      <Card className="bg-card/70 backdrop-blur border-border">
        <CardHeader className="pb-3 border-b border-border/40">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Globe className="h-4 w-4 text-primary" /> Per-language breakdown
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/40 bg-muted/10 text-[10px] uppercase tracking-wider text-muted-foreground">
                <th className="text-left py-2.5 px-5">Locale</th>
                <th className="text-right py-2.5 px-5">Files</th>
                <th className="text-right py-2.5 px-5">Size</th>
                <th className="text-left py-2.5 px-5">Latest upload</th>
                <th className="py-2.5 px-5"></th>
              </tr>
            </thead>
            <tbody>
              {(stats ?? LANG_FOLDERS.map(l => ({ lang: l, files: 0, bytes: 0, latest: null } as LangStat))).map(row => (
                <tr key={row.lang} className="border-b border-border/30 last:border-0 hover:bg-muted/10 transition-colors">
                  <td className="py-3 px-5 font-medium">{row.lang}</td>
                  <td className="py-3 px-5 text-right num">{row.files}</td>
                  <td className="py-3 px-5 text-right num text-muted-foreground">{fmtBytes(row.bytes)}</td>
                  <td className="py-3 px-5 text-muted-foreground text-xs">
                    {row.latest?.updated_at
                      ? `${row.latest.name} · ${new Date(row.latest.updated_at).toLocaleString()}`
                      : "—"}
                  </td>
                  <td className="py-3 px-5 text-right">
                    <Link href={`/admin/materials?lang=${row.lang}`}>
                      <a className="text-primary hover:underline inline-flex items-center gap-1 text-xs">
                        Open <ExternalLink className="h-3 w-3" />
                      </a>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}

function Kpi({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="border border-border/50 bg-card/60 rounded-xl p-4 corner-brackets">
      <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-muted-foreground/70 mb-2">
        <Icon className="h-3.5 w-3.5" /> {label}
      </div>
      <div className="text-2xl num num-gold">{value}</div>
    </div>
  );
}
