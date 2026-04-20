import { useEffect, useState } from "react";
import { Link } from "wouter";
import { useAdminAuth } from "@/contexts/admin-auth";
import { apiFetch } from "@/lib/api";
import { FileText, Globe, Eye, EyeOff, Plus, ArrowRight } from "lucide-react";

type Resource = {
  id: number; language: string; category: string; title: string;
  visible: boolean; fileType: string; createdAt: string;
};

const LANG_LABELS: Record<string, string> = {
  zh: "简体中文", "zh-TW": "繁體中文", en: "English",
  ja: "日本語", ko: "한국어", th: "ภาษาไทย", vi: "Tiếng Việt",
};
const LANG_COLORS: Record<string, string> = {
  zh: "bg-blue-500/20 text-blue-300",
  "zh-TW": "bg-cyan-500/20 text-cyan-300",
  en: "bg-green-500/20 text-green-300",
  ja: "bg-pink-500/20 text-pink-300",
  ko: "bg-purple-500/20 text-purple-300",
  th: "bg-orange-500/20 text-orange-300",
  vi: "bg-yellow-500/20 text-yellow-300",
};

export default function Dashboard() {
  const { user } = useAdminAuth();
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    apiFetch("/admin/resources", user.token)
      .then(r => r.json())
      .then(data => setResources(Array.isArray(data) ? data : []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [user]);

  const total = resources.length;
  const visible = resources.filter(r => r.visible).length;
  const hidden = total - visible;

  const byLang = resources.reduce<Record<string, number>>((acc, r) => {
    acc[r.language] = (acc[r.language] ?? 0) + 1;
    return acc;
  }, {});
  const byCat = resources.reduce<Record<string, number>>((acc, r) => {
    acc[r.category] = (acc[r.category] ?? 0) + 1;
    return acc;
  }, {});

  const recent = [...resources].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 5);

  return (
    <div className="p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">仪表盘 · Dashboard</h1>
          <p className="text-muted-foreground text-sm mt-1">资料库管理概览 · Resource library overview</p>
        </div>
        <Link href="/resources/new"
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:bg-primary/90 transition-colors"
        >
          <Plus className="h-4 w-4" /> 新增资料
        </Link>
      </div>

      {loading ? (
        <div className="grid grid-cols-3 gap-4 mb-8">
          {[1,2,3].map(i => <div key={i} className="h-28 bg-card rounded-xl animate-pulse" />)}
        </div>
      ) : (
        <>
          {/* Stat cards */}
          <div className="grid grid-cols-3 gap-4 mb-8">
            <StatCard icon={FileText} label="总资料数" sub="Total Resources" value={total} color="text-primary" />
            <StatCard icon={Eye} label="已显示" sub="Visible" value={visible} color="text-green-400" />
            <StatCard icon={EyeOff} label="已隐藏" sub="Hidden" value={hidden} color="text-muted-foreground" />
          </div>

          <div className="grid grid-cols-2 gap-6 mb-8">
            {/* By language */}
            <div className="bg-card border border-card-border rounded-xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <Globe className="h-4 w-4 text-primary" />
                <h2 className="font-semibold text-foreground text-sm">按语言分布 · By Language</h2>
              </div>
              <div className="space-y-2.5">
                {Object.entries(byLang).sort((a, b) => b[1] - a[1]).map(([lang, count]) => (
                  <div key={lang} className="flex items-center gap-3">
                    <span className={`text-xs px-2 py-0.5 rounded font-medium ${LANG_COLORS[lang] ?? "bg-muted text-muted-foreground"}`}>
                      {LANG_LABELS[lang] ?? lang}
                    </span>
                    <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-primary rounded-full" style={{ width: `${Math.round((count / total) * 100)}%` }} />
                    </div>
                    <span className="text-sm font-semibold text-foreground w-6 text-right">{count}</span>
                  </div>
                ))}
                {Object.keys(byLang).length === 0 && <p className="text-muted-foreground text-sm">暂无数据</p>}
              </div>
            </div>

            {/* By category */}
            <div className="bg-card border border-card-border rounded-xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <FileText className="h-4 w-4 text-primary" />
                <h2 className="font-semibold text-foreground text-sm">按分类分布 · By Category</h2>
              </div>
              <div className="space-y-2.5">
                {Object.entries(byCat).sort((a, b) => b[1] - a[1]).map(([cat, count]) => (
                  <div key={cat} className="flex items-center gap-3">
                    <span className="text-xs px-2 py-0.5 rounded bg-muted text-muted-foreground font-medium capitalize">{cat}</span>
                    <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-accent rounded-full" style={{ width: `${Math.round((count / total) * 100)}%` }} />
                    </div>
                    <span className="text-sm font-semibold text-foreground w-6 text-right">{count}</span>
                  </div>
                ))}
                {Object.keys(byCat).length === 0 && <p className="text-muted-foreground text-sm">暂无数据</p>}
              </div>
            </div>
          </div>

          {/* Recent */}
          <div className="bg-card border border-card-border rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-foreground text-sm">最新资料 · Recent Resources</h2>
              <Link href="/resources" className="text-primary text-xs hover:underline flex items-center gap-1">
                查看全部 <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
            <div className="space-y-2">
              {recent.map(r => (
                <div key={r.id} className="flex items-center gap-3 py-2 border-b border-border/40 last:border-0">
                  <span className={`text-xs px-2 py-0.5 rounded font-medium shrink-0 ${LANG_COLORS[r.language] ?? "bg-muted text-muted-foreground"}`}>
                    {LANG_LABELS[r.language] ?? r.language}
                  </span>
                  <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded capitalize shrink-0">{r.category}</span>
                  <span className="flex-1 text-sm text-foreground truncate">{r.title}</span>
                  <span className={`text-xs ${r.visible ? "text-green-400" : "text-muted-foreground"}`}>
                    {r.visible ? "显示" : "隐藏"}
                  </span>
                  <Link href={`/resources/${r.id}/edit`} className="text-primary text-xs hover:underline shrink-0">编辑</Link>
                </div>
              ))}
              {recent.length === 0 && <p className="text-muted-foreground text-sm">暂无资料，点击上方新增</p>}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function StatCard({ icon: Icon, label, sub, value, color }: { icon: React.ElementType; label: string; sub: string; value: number; color: string }) {
  return (
    <div className="bg-card border border-card-border rounded-xl p-6">
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="text-sm font-medium text-foreground">{label}</p>
          <p className="text-[11px] text-muted-foreground">{sub}</p>
        </div>
        <div className={`p-2.5 rounded-lg bg-primary/10`}>
          <Icon className={`h-5 w-5 ${color}`} />
        </div>
      </div>
      <p className={`text-3xl font-bold ${color}`}>{value}</p>
    </div>
  );
}
