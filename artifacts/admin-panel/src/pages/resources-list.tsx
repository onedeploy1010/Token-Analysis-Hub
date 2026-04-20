import { useEffect, useState } from "react";
import { Link } from "wouter";
import { useAdminAuth } from "@/contexts/admin-auth";
import { apiFetch } from "@/lib/api";
import { Plus, Trash2, Pencil, Eye, EyeOff, FileText, Download } from "lucide-react";

type Resource = {
  id: number; language: string; category: string; title: string;
  description: string; fileUrl: string; fileType: string; fileSize: string;
  sortOrder: number; visible: boolean; previewImageUrl: string; createdAt: string;
};

const LANG_LABELS: Record<string, string> = {
  zh: "简中", "zh-TW": "繁中", en: "EN",
  ja: "JA", ko: "KO", th: "TH", vi: "VI",
};
const LANG_COLORS: Record<string, string> = {
  zh: "bg-blue-500/20 text-blue-300 border-blue-500/30",
  "zh-TW": "bg-cyan-500/20 text-cyan-300 border-cyan-500/30",
  en: "bg-green-500/20 text-green-300 border-green-500/30",
  ja: "bg-pink-500/20 text-pink-300 border-pink-500/30",
  ko: "bg-purple-500/20 text-purple-300 border-purple-500/30",
  th: "bg-orange-500/20 text-orange-300 border-orange-500/30",
  vi: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
};

export default function ResourcesList() {
  const { user } = useAdminAuth();
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterLang, setFilterLang] = useState("");
  const [filterCat, setFilterCat] = useState("");
  const [deleting, setDeleting] = useState<number | null>(null);

  const load = () => {
    if (!user) return;
    setLoading(true);
    apiFetch("/admin/resources", user.token)
      .then(r => r.json())
      .then(data => setResources(Array.isArray(data) ? data : []))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(load, [user]);

  const allCats = [...new Set(resources.map(r => r.category))].sort();
  const filtered = resources.filter(r =>
    (!filterLang || r.language === filterLang) &&
    (!filterCat || r.category === filterCat)
  );

  async function toggleVisible(r: Resource) {
    if (!user) return;
    await apiFetch(`/admin/resources/${r.id}`, user.token, {
      method: "PUT",
      body: JSON.stringify({ visible: !r.visible }),
    });
    load();
  }

  async function deleteResource(id: number) {
    if (!user || !confirm("确认删除？")) return;
    setDeleting(id);
    await apiFetch(`/admin/resources/${id}`, user.token, { method: "DELETE" });
    setDeleting(null);
    load();
  }

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">资料管理 · Resources</h1>
          <p className="text-muted-foreground text-sm mt-1">管理所有语言的可下载资料</p>
        </div>
        <Link href="/resources/new"
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:bg-primary/90 transition-colors"
        >
          <Plus className="h-4 w-4" /> 新增资料
        </Link>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-5">
        <select
          value={filterLang}
          onChange={e => setFilterLang(e.target.value)}
          className="px-3 py-2 bg-input border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="">全部语言</option>
          {["zh", "zh-TW", "en", "ja", "ko", "th", "vi"].map(l => (
            <option key={l} value={l}>{LANG_LABELS[l]} - {l}</option>
          ))}
        </select>
        <select
          value={filterCat}
          onChange={e => setFilterCat(e.target.value)}
          className="px-3 py-2 bg-input border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="">全部分类</option>
          {allCats.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <span className="ml-auto text-sm text-muted-foreground self-center">
          {filtered.length} / {resources.length} 条
        </span>
      </div>

      {/* Table */}
      <div className="bg-card border border-card-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left px-4 py-3 text-muted-foreground font-medium text-xs uppercase tracking-wide">预览</th>
                <th className="text-left px-4 py-3 text-muted-foreground font-medium text-xs uppercase tracking-wide">语言</th>
                <th className="text-left px-4 py-3 text-muted-foreground font-medium text-xs uppercase tracking-wide">分类</th>
                <th className="text-left px-4 py-3 text-muted-foreground font-medium text-xs uppercase tracking-wide">标题</th>
                <th className="text-left px-4 py-3 text-muted-foreground font-medium text-xs uppercase tracking-wide">类型</th>
                <th className="text-left px-4 py-3 text-muted-foreground font-medium text-xs uppercase tracking-wide">显示</th>
                <th className="text-right px-4 py-3 text-muted-foreground font-medium text-xs uppercase tracking-wide">操作</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-border/40">
                    {Array.from({ length: 7 }).map((_, j) => (
                      <td key={j} className="px-4 py-3"><div className="h-4 bg-muted/50 rounded animate-pulse" /></td>
                    ))}
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">
                    暂无资料 · No resources found
                  </td>
                </tr>
              ) : filtered.map(r => (
                <tr key={r.id} className="border-b border-border/40 hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3">
                    {r.previewImageUrl ? (
                      <img src={r.previewImageUrl} alt="" className="w-10 h-10 rounded object-cover border border-border" />
                    ) : (
                      <div className="w-10 h-10 rounded bg-muted flex items-center justify-center border border-border">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded border font-medium ${LANG_COLORS[r.language] ?? "bg-muted text-muted-foreground border-border"}`}>
                      {LANG_LABELS[r.language] ?? r.language}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded capitalize">{r.category}</span>
                  </td>
                  <td className="px-4 py-3 max-w-[200px]">
                    <p className="font-medium text-foreground truncate">{r.title}</p>
                    {r.description && <p className="text-xs text-muted-foreground truncate mt-0.5">{r.description}</p>}
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs text-muted-foreground uppercase">{r.fileType}</span>
                  </td>
                  <td className="px-4 py-3">
                    <button onClick={() => toggleVisible(r)} className="transition-colors">
                      {r.visible
                        ? <Eye className="h-4 w-4 text-green-400 hover:text-green-300" />
                        : <EyeOff className="h-4 w-4 text-muted-foreground hover:text-foreground" />}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2 justify-end">
                      {r.fileUrl && (
                        <a
                          href={r.fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          download
                          className="p-1.5 rounded-lg text-muted-foreground hover:text-amber-400 hover:bg-amber-400/10 transition-colors"
                          title="下载文件"
                        >
                          <Download className="h-3.5 w-3.5" />
                        </a>
                      )}
                      <Link href={`/resources/${r.id}/edit`}
                        className="p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Link>
                      <button
                        onClick={() => deleteResource(r.id)}
                        disabled={deleting === r.id}
                        className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-40"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
