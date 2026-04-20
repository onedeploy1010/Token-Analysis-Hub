import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearch } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Upload, Download, Trash2, FolderOpen, Loader2, FileText, Globe, RefreshCw,
} from "lucide-react";
import { supabase, MATERIALS_BUCKET } from "@/lib/supabase";
import type { FileObject } from "@supabase/storage-js";
import { useToast } from "@/hooks/use-toast";

/**
 * Catalogue of locales that get their own material folder. The `code` maps
 * 1:1 to the storage path prefix, and `flag` / `native` / `country` are
 * just cosmetic for the tab UI.
 */
const LOCALES = [
  { code: "zh",    native: "简体中文",    country: "China",       flag: "🇨🇳" },
  { code: "zh-TW", native: "繁體中文",    country: "Hong Kong",   flag: "🇭🇰" },
  { code: "en",    native: "English",     country: "Global",      flag: "🌐" },
  { code: "ko",    native: "한국어",       country: "Korea",       flag: "🇰🇷" },
  { code: "ja",    native: "日本語",       country: "Japan",       flag: "🇯🇵" },
  { code: "th",    native: "ไทย",         country: "Thailand",    flag: "🇹🇭" },
  { code: "vi",    native: "Tiếng Việt",  country: "Vietnam",     flag: "🇻🇳" },
] as const;

type LocaleCode = typeof LOCALES[number]["code"];

function fmtBytes(n: number) {
  if (n >= 1e9) return `${(n / 1e9).toFixed(2)} GB`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(2)} MB`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)} KB`;
  return `${n} B`;
}

export default function AdminMaterials() {
  const search = useSearch();
  const initialLang = useMemo<LocaleCode>(() => {
    const q = new URLSearchParams(search).get("lang");
    return (LOCALES.find(l => l.code === q)?.code as LocaleCode) ?? "zh";
  }, [search]);

  const [activeLang, setActiveLang] = useState<LocaleCode>(initialLang);
  const [files, setFiles] = useState<FileObject[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deletingName, setDeletingName] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const refresh = useCallback(async () => {
    if (!supabase) return;
    setLoading(true);
    const { data, error } = await supabase.storage
      .from(MATERIALS_BUCKET)
      .list(activeLang, { limit: 1000, sortBy: { column: "updated_at", order: "desc" } });
    setLoading(false);
    if (error) {
      toast({ title: "Failed to list files", description: error.message, variant: "destructive" });
      setFiles([]);
      return;
    }
    setFiles((data ?? []).filter(f => f.name && !f.name.endsWith("/")));
  }, [activeLang, toast]);

  useEffect(() => { refresh(); }, [refresh]);

  const upload = useCallback(async (fileList: FileList | File[]) => {
    if (!supabase) return;
    const arr = Array.from(fileList);
    if (!arr.length) return;
    setUploading(true);
    const results = await Promise.all(arr.map(async (file) => {
      const safe = file.name.replace(/[^\w.\-() \u4e00-\u9fff\uac00-\ud7af\u3040-\u30ff\u0e00-\u0e7f\u00c0-\u1ef9]+/g, "_");
      const path = `${activeLang}/${Date.now()}-${safe}`;
      const { error } = await supabase!.storage
        .from(MATERIALS_BUCKET)
        .upload(path, file, { cacheControl: "3600", upsert: false, contentType: file.type || undefined });
      return { name: file.name, error: error?.message };
    }));
    setUploading(false);
    const failed = results.filter(r => r.error);
    if (failed.length === 0) {
      toast({ title: "Upload complete", description: `${arr.length} file${arr.length > 1 ? "s" : ""} uploaded to ${activeLang}/` });
    } else {
      toast({
        title: `Uploaded ${arr.length - failed.length}/${arr.length}`,
        description: failed.map(f => `${f.name}: ${f.error}`).join("\n"),
        variant: "destructive",
      });
    }
    await refresh();
  }, [activeLang, refresh, toast]);

  const remove = useCallback(async (name: string) => {
    if (!supabase) return;
    if (!confirm(`Delete ${name}?`)) return;
    setDeletingName(name);
    const { error } = await supabase.storage.from(MATERIALS_BUCKET).remove([`${activeLang}/${name}`]);
    setDeletingName(null);
    if (error) {
      toast({ title: "Delete failed", description: error.message, variant: "destructive" });
      return;
    }
    await refresh();
  }, [activeLang, refresh, toast]);

  const download = useCallback(async (name: string) => {
    if (!supabase) return;
    const { data, error } = await supabase.storage.from(MATERIALS_BUCKET)
      .createSignedUrl(`${activeLang}/${name}`, 60);
    if (error || !data?.signedUrl) {
      toast({ title: "Download failed", description: error?.message ?? "Could not sign URL", variant: "destructive" });
      return;
    }
    window.open(data.signedUrl, "_blank");
  }, [activeLang, toast]);

  const activeMeta = LOCALES.find(l => l.code === activeLang)!;
  const totalBytes = (files ?? []).reduce((s, f) => s + ((f.metadata as any)?.size ?? 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between border-b border-border/40 pb-5">
        <div>
          <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-primary/60 block mb-1">Library</span>
          <h1 className="text-2xl font-bold tracking-tight">Materials</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Upload localized material packages per country.</p>
        </div>
        <Button size="sm" variant="outline" className="gap-2" onClick={refresh} disabled={loading}>
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh
        </Button>
      </div>

      {/* Language tabs */}
      <div className="flex gap-1.5 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-thin">
        {LOCALES.map(l => {
          const active = l.code === activeLang;
          return (
            <button
              key={l.code}
              onClick={() => setActiveLang(l.code)}
              className={`shrink-0 px-3 py-2 rounded-lg text-sm transition-all border ${
                active
                  ? "bg-primary/10 border-primary/40 text-foreground shadow-[0_0_16px_-4px_hsl(var(--primary)/0.35)]"
                  : "bg-card/40 border-border/40 text-muted-foreground hover:text-foreground hover:border-border"
              }`}
            >
              <span className="mr-1.5">{l.flag}</span>
              <span className="font-medium">{l.native}</span>
              <span className="ml-1.5 text-[10px] opacity-60">{l.country}</span>
            </button>
          );
        })}
      </div>

      {/* Uploader */}
      <Card
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          if (e.dataTransfer?.files?.length) upload(e.dataTransfer.files);
        }}
        className={`bg-card/40 border-dashed transition-colors ${dragOver ? "border-primary bg-primary/5" : "border-border/50"}`}
      >
        <CardContent className="p-6 flex flex-col items-center justify-center text-center gap-3">
          <div className="w-12 h-12 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center">
            {uploading ? <Loader2 className="h-5 w-5 text-primary animate-spin" /> : <Upload className="h-5 w-5 text-primary" />}
          </div>
          <div>
            <p className="text-sm font-medium">
              Drop files here or <button type="button" onClick={() => inputRef.current?.click()} className="text-primary underline-offset-2 hover:underline">browse</button>
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Uploads to <code className="font-mono text-foreground">{MATERIALS_BUCKET}/{activeLang}/</code> ·
              {" "}<span className="text-foreground">{activeMeta.flag} {activeMeta.native}</span>
            </p>
          </div>
          <input
            ref={inputRef}
            type="file"
            multiple
            className="hidden"
            onChange={(e) => {
              if (e.target.files?.length) upload(e.target.files);
              e.target.value = "";
            }}
          />
        </CardContent>
      </Card>

      {/* File list */}
      <Card className="bg-card/70 backdrop-blur border-border">
        <CardHeader className="pb-3 border-b border-border/40 flex-row items-center justify-between">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <FolderOpen className="h-4 w-4 text-primary" />
            {activeMeta.flag} {activeMeta.native}
            <span className="text-[10px] uppercase tracking-widest text-muted-foreground ml-2">
              {files ? `${files.length} file${files.length === 1 ? "" : "s"} · ${fmtBytes(totalBytes)}` : "…"}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading && files === null ? (
            <div className="py-16 flex items-center justify-center text-sm text-muted-foreground gap-2">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading files…
            </div>
          ) : !files || files.length === 0 ? (
            <div className="py-16 text-center text-sm text-muted-foreground">
              <Globe className="h-8 w-8 mx-auto mb-3 opacity-30" />
              No materials yet for <span className="text-foreground">{activeMeta.native}</span>.
              <br />
              <span className="text-xs opacity-70">Drop files above to upload your first package.</span>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/40 bg-muted/10 text-[10px] uppercase tracking-wider text-muted-foreground">
                  <th className="text-left py-2.5 px-5">File</th>
                  <th className="text-right py-2.5 px-5">Size</th>
                  <th className="text-left py-2.5 px-5">Uploaded</th>
                  <th className="py-2.5 px-5 w-40"></th>
                </tr>
              </thead>
              <tbody>
                {files.map(f => {
                  const size = (f.metadata as any)?.size ?? 0;
                  const isDeleting = deletingName === f.name;
                  return (
                    <tr key={f.id ?? f.name} className="border-b border-border/30 last:border-0 hover:bg-muted/10 transition-colors">
                      <td className="py-3 px-5">
                        <div className="flex items-center gap-2">
                          <FileText className="h-3.5 w-3.5 text-muted-foreground/60 shrink-0" />
                          <span className="font-medium truncate max-w-[24rem]" title={f.name}>{f.name}</span>
                        </div>
                      </td>
                      <td className="py-3 px-5 text-right num text-muted-foreground">{fmtBytes(size)}</td>
                      <td className="py-3 px-5 text-muted-foreground text-xs">
                        {f.updated_at ? new Date(f.updated_at).toLocaleString() : "—"}
                      </td>
                      <td className="py-3 px-5 text-right">
                        <div className="inline-flex items-center gap-1">
                          <Button size="sm" variant="ghost" className="h-7 px-2 gap-1 text-xs" onClick={() => download(f.name)}>
                            <Download className="h-3 w-3" /> Download
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2 gap-1 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => remove(f.name)}
                            disabled={isDeleting}
                          >
                            {isDeleting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                            Delete
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
