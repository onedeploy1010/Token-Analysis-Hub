import { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { queryClient } from "@/lib/queryClient";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { adminAddLog } from "@/lib/api";
import { Plus, Trash2, ArrowUp, ArrowDown, Image, Video, Youtube, Save, Loader2, Edit2, Upload, Link } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

async function getMedia() {
  const { data } = await supabase.from("media").select("*").order("sort_order", { ascending: true });
  return data || [];
}

async function getCompanyIntro() {
  const { data } = await supabase.from("system_settings").select("value").eq("key", "company_intro").single();
  return data?.value || "";
}

async function uploadToStorage(file: File, folder: string): Promise<string> {
  const ext = file.name.split(".").pop() || "mp4";
  const fileName = `${folder}/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;

  const { data, error } = await supabase.storage
    .from("media")
    .upload(fileName, file, {
      cacheControl: "3600",
      upsert: false,
    });
  if (error) throw new Error(`上传失败: ${error.message}`);

  const { data: urlData } = supabase.storage.from("media").getPublicUrl(data.path);
  return urlData.publicUrl;
}

const LANG_OPTIONS = [
  { value: "all", label: "全部语言" },
  { value: "zh", label: "中文" },
  { value: "zh-TW", label: "繁體" },
  { value: "en", label: "English" },
  { value: "ko", label: "한국어" },
  { value: "ja", label: "日本語" },
  { value: "vi", label: "Tiếng Việt" },
  { value: "th", label: "ไทย" },
  { value: "id", label: "Indonesia" },
  { value: "ms", label: "Melayu" },
  { value: "fr", label: "Français" },
  { value: "ar", label: "العربية" },
];

const langLabel = (lang: string) => LANG_OPTIONS.find(l => l.value === lang)?.label || lang;

export default function AdminMedia() {
  const [addOpen, setAddOpen] = useState(false);
  const [editIntro, setEditIntro] = useState(false);
  const [introText, setIntroText] = useState("");
  const [form, setForm] = useState({ type: "image", url: "", title: "", description: "", lang: "all" });
  const [uploadMode, setUploadMode] = useState<"file" | "url">("file");
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const { data: media = [], isLoading } = useQuery({
    queryKey: ["/api/admin/media"],
    queryFn: getMedia,
  });

  const { data: companyIntro = "" } = useQuery({
    queryKey: ["/api/admin/company-intro"],
    queryFn: getCompanyIntro,
  });

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const isVideo = file.type.startsWith("video/");
    const isImage = file.type.startsWith("image/");
    if (form.type === "video" && !isVideo) {
      toast({ title: "请选择视频文件", variant: "destructive" });
      return;
    }
    if (form.type === "image" && !isImage) {
      toast({ title: "请选择图片文件", variant: "destructive" });
      return;
    }

    // 100MB limit for videos, 10MB for images
    const maxSize = isVideo ? 100 * 1024 * 1024 : 10 * 1024 * 1024;
    if (file.size > maxSize) {
      toast({ title: `文件过大，最大 ${isVideo ? "100MB" : "10MB"}`, variant: "destructive" });
      return;
    }

    setUploading(true);
    setUploadProgress(`上传中... ${(file.size / 1024 / 1024).toFixed(1)}MB`);

    try {
      const folder = isVideo ? "videos" : "images";
      const publicUrl = await uploadToStorage(file, folder);
      setForm({ ...form, url: publicUrl });
      setUploadProgress("上传完成");
      toast({ title: "文件上传成功" });
    } catch (err: any) {
      toast({ title: "上传失败", description: err.message, variant: "destructive" });
      setUploadProgress("");
    } finally {
      setUploading(false);
    }
  };

  const addMutation = useMutation({
    mutationFn: async () => {
      if (!form.url) throw new Error("请提供媒体文件或URL");
      const maxSort = media.length > 0 ? Math.max(...media.map((m: any) => m.sort_order)) + 1 : 0;
      const { error } = await supabase.from("media").insert({
        type: form.type,
        url: form.url,
        title: form.title || null,
        description: form.description || null,
        lang: form.lang || "all",
        sort_order: maxSort,
      });
      if (error) throw new Error(error.message);
      await adminAddLog("添加媒体", "media", form.type);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/media"] });
      toast({ title: "添加成功" });
      setAddOpen(false);
      resetForm();
    },
    onError: (err: any) => toast({ title: "添加失败", description: err.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      // Try to delete from storage if it's a supabase storage URL
      const item = (media as any[]).find((m: any) => m.id === id);
      if (item?.url?.includes("/storage/v1/object/public/media/")) {
        const path = item.url.split("/storage/v1/object/public/media/")[1];
        if (path) {
          await supabase.storage.from("media").remove([path]);
        }
      }
      const { error } = await supabase.from("media").delete().eq("id", id);
      if (error) throw new Error(error.message);
      await adminAddLog("删除媒体", "media", id.toString());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/media"] });
      toast({ title: "已删除" });
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, active }: { id: number; active: boolean }) => {
      const { error } = await supabase.from("media").update({ is_active: active }).eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/admin/media"] }),
  });

  const langMutation = useMutation({
    mutationFn: async ({ id, lang }: { id: number; lang: string }) => {
      const { error } = await supabase.from("media").update({ lang }).eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/admin/media"] }),
  });

  const moveMutation = useMutation({
    mutationFn: async ({ id, direction }: { id: number; direction: "up" | "down" }) => {
      const sorted = [...media].sort((a: any, b: any) => a.sort_order - b.sort_order);
      const idx = sorted.findIndex((m: any) => m.id === id);
      if (idx < 0) return;
      const swapIdx = direction === "up" ? idx - 1 : idx + 1;
      if (swapIdx < 0 || swapIdx >= sorted.length) return;
      const a = sorted[idx], b = sorted[swapIdx];
      await supabase.from("media").update({ sort_order: b.sort_order }).eq("id", a.id);
      await supabase.from("media").update({ sort_order: a.sort_order }).eq("id", b.id);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/admin/media"] }),
  });

  const saveIntroMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("system_settings").update({ value: introText }).eq("key", "company_intro");
      if (error) throw new Error(error.message);
      await adminAddLog("更新公司介绍", "settings", "company_intro");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/company-intro"] });
      toast({ title: "保存成功" });
      setEditIntro(false);
    },
    onError: (err: any) => toast({ title: "保存失败", description: err.message, variant: "destructive" }),
  });

  const resetForm = () => {
    setForm({ type: "image", url: "", title: "", description: "", lang: "all" });
    setUploadMode("file");
    setUploadProgress("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const typeIcon = (type: string) => {
    if (type === "image") return <Image size={14} />;
    if (type === "video") return <Video size={14} />;
    return <Youtube size={14} />;
  };

  const typeLabel = (type: string) => {
    if (type === "image") return "图片";
    if (type === "video") return "视频";
    return "YouTube";
  };

  const fileAccept = form.type === "video" ? "video/mp4,video/webm,video/mov,video/quicktime" : "image/jpeg,image/png,image/webp,image/gif";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-1 h-5 rounded-full" style={{ background: "linear-gradient(180deg, #C9A227, #9A7A1A)" }} />
          <h2 className="font-bold text-lg text-foreground">Landing Page 管理</h2>
        </div>
        <Button size="sm" style={{ background: "linear-gradient(135deg, #C9A227, #9A7A1A)", color: "#0c0a08" }} onClick={() => { resetForm(); setAddOpen(true); }}>
          <Plus size={14} className="mr-1" /> 添加媒体
        </Button>
      </div>

      {/* Company Intro */}
      <div className="rounded-xl p-4 space-y-2" style={{ background: "linear-gradient(145deg, #1a1510, #110e0a)", border: "1px solid rgba(201,162,39,0.12)" }}>
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-foreground">公司介绍</span>
          <Button size="sm" variant="outline" style={{ border: "1px solid rgba(201,162,39,0.25)", color: "#C9A227" }}
            onClick={() => { setIntroText(companyIntro); setEditIntro(true); }}>
            <Edit2 size={12} className="mr-1" /> 编辑
          </Button>
        </div>
        <p className="text-xs text-muted-foreground whitespace-pre-line">{companyIntro || "未设置"}</p>
      </div>

      {/* Media List */}
      {isLoading ? (
        <div className="text-center text-muted-foreground py-10">加载中...</div>
      ) : media.length === 0 ? (
        <div className="text-center text-muted-foreground py-10">
          <Image size={32} className="mx-auto mb-2 opacity-20" />
          <p className="text-sm">暂无媒体，点击"添加媒体"开始</p>
        </div>
      ) : (
        <div className="space-y-2">
          {(media as any[]).map((m: any, idx: number) => (
            <div key={m.id} className="rounded-xl p-3 flex items-center gap-3"
              style={{
                background: "linear-gradient(145deg, #1a1510, #110e0a)",
                border: `1px solid ${m.is_active ? "rgba(201,162,39,0.15)" : "rgba(255,255,255,0.06)"}`,
                opacity: m.is_active ? 1 : 0.5,
              }}>
              {/* Preview */}
              <div className="w-16 h-12 rounded-lg overflow-hidden shrink-0" style={{ background: "#000" }}>
                {m.type === "image" ? (
                  <img src={m.url} alt="" className="w-full h-full object-cover" />
                ) : m.type === "video" ? (
                  <video src={m.url} className="w-full h-full object-cover" muted preload="metadata" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    {typeIcon(m.type)}
                  </div>
                )}
              </div>
              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: "rgba(201,162,39,0.1)", color: "#C9A227" }}>
                    {typeLabel(m.type)}
                  </span>
                  <span className="text-[10px] px-1 py-0.5 rounded" style={{ background: m.lang === "all" ? "rgba(34,197,94,0.1)" : "rgba(59,130,246,0.1)", color: m.lang === "all" ? "#22c55e" : "#3b82f6" }}>
                    {langLabel(m.lang || "all")}
                  </span>
                  <span className="text-xs text-foreground font-semibold truncate">{m.title || "无标题"}</span>
                </div>
                <div className="text-[10px] text-muted-foreground truncate mt-0.5">{m.url}</div>
              </div>
              {/* Language select */}
              <select
                className="text-[10px] rounded px-1 py-0.5 shrink-0"
                style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(201,162,39,0.15)", color: "#C9A227" }}
                value={m.lang || "all"}
                onChange={(e) => langMutation.mutate({ id: m.id, lang: e.target.value })}
              >
                {LANG_OPTIONS.map(l => (
                  <option key={l.value} value={l.value}>{l.label}</option>
                ))}
              </select>
              {/* Actions */}
              <div className="flex items-center gap-1 shrink-0">
                <button className="p-1.5 rounded" style={{ background: "rgba(201,162,39,0.1)" }}
                  onClick={() => moveMutation.mutate({ id: m.id, direction: "up" })} disabled={idx === 0}>
                  <ArrowUp size={12} style={{ color: idx === 0 ? "rgba(255,255,255,0.2)" : "#C9A227" }} />
                </button>
                <button className="p-1.5 rounded" style={{ background: "rgba(201,162,39,0.1)" }}
                  onClick={() => moveMutation.mutate({ id: m.id, direction: "down" })} disabled={idx === media.length - 1}>
                  <ArrowDown size={12} style={{ color: idx === media.length - 1 ? "rgba(255,255,255,0.2)" : "#C9A227" }} />
                </button>
                <button className="p-1.5 rounded" style={{ background: m.is_active ? "rgba(34,197,94,0.1)" : "rgba(255,255,255,0.05)" }}
                  onClick={() => toggleMutation.mutate({ id: m.id, active: !m.is_active })}>
                  <div className="w-3 h-3 rounded-full" style={{ background: m.is_active ? "#22c55e" : "rgba(255,255,255,0.3)" }} />
                </button>
                <button className="p-1.5 rounded" style={{ background: "rgba(239,68,68,0.1)" }}
                  onClick={() => { if (confirm("确定删除?")) deleteMutation.mutate(m.id); }}>
                  <Trash2 size={12} style={{ color: "#ef4444" }} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Media Dialog */}
      <Dialog open={addOpen} onOpenChange={(open) => { if (!open) resetForm(); setAddOpen(open); }}>
        <DialogContent className="max-w-sm mx-auto" style={{ background: "linear-gradient(145deg, #1a1510, #110e0a)", border: "1px solid rgba(201,162,39,0.3)" }}>
          <DialogHeader>
            <DialogTitle className="text-center" style={{ color: "#C9A227" }}>添加媒体</DialogTitle>
            <DialogDescription className="text-center text-xs text-muted-foreground">上传文件或输入URL</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            {/* Type selector */}
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">类型</label>
              <div className="flex gap-2">
                {[
                  { value: "image", label: "图片", icon: Image },
                  { value: "video", label: "视频", icon: Video },
                  { value: "youtube", label: "YouTube", icon: Youtube },
                ].map((tp) => (
                  <button key={tp.value}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-all"
                    style={{
                      background: form.type === tp.value ? "rgba(201,162,39,0.15)" : "rgba(255,255,255,0.03)",
                      border: form.type === tp.value ? "1px solid rgba(201,162,39,0.3)" : "1px solid rgba(255,255,255,0.06)",
                      color: form.type === tp.value ? "#C9A227" : "rgba(255,255,255,0.5)",
                    }}
                    onClick={() => { setForm({ ...form, type: tp.value, url: "" }); setUploadProgress(""); if (fileInputRef.current) fileInputRef.current.value = ""; }}
                  >
                    <tp.icon size={12} /> {tp.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Upload mode toggle (for image & video only) */}
            {form.type !== "youtube" && (
              <div>
                <div className="flex gap-2 mb-2">
                  <button
                    className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium"
                    style={{
                      background: uploadMode === "file" ? "rgba(201,162,39,0.12)" : "rgba(255,255,255,0.03)",
                      border: uploadMode === "file" ? "1px solid rgba(201,162,39,0.25)" : "1px solid rgba(255,255,255,0.06)",
                      color: uploadMode === "file" ? "#C9A227" : "rgba(255,255,255,0.4)",
                    }}
                    onClick={() => setUploadMode("file")}
                  >
                    <Upload size={11} /> 上传文件
                  </button>
                  <button
                    className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium"
                    style={{
                      background: uploadMode === "url" ? "rgba(201,162,39,0.12)" : "rgba(255,255,255,0.03)",
                      border: uploadMode === "url" ? "1px solid rgba(201,162,39,0.25)" : "1px solid rgba(255,255,255,0.06)",
                      color: uploadMode === "url" ? "#C9A227" : "rgba(255,255,255,0.4)",
                    }}
                    onClick={() => setUploadMode("url")}
                  >
                    <Link size={11} /> 输入URL
                  </button>
                </div>

                {uploadMode === "file" ? (
                  <div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept={fileAccept}
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                    <button
                      className="w-full rounded-lg py-4 flex flex-col items-center gap-2 transition-all"
                      style={{
                        background: form.url ? "rgba(34,197,94,0.06)" : "rgba(201,162,39,0.04)",
                        border: form.url ? "2px dashed rgba(34,197,94,0.3)" : "2px dashed rgba(201,162,39,0.2)",
                      }}
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                    >
                      {uploading ? (
                        <>
                          <Loader2 size={20} className="animate-spin" style={{ color: "#C9A227" }} />
                          <span className="text-xs" style={{ color: "#C9A227" }}>{uploadProgress}</span>
                        </>
                      ) : form.url ? (
                        <>
                          <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: "rgba(34,197,94,0.1)" }}>
                            <Upload size={14} style={{ color: "#22c55e" }} />
                          </div>
                          <span className="text-xs" style={{ color: "#22c55e" }}>已上传，点击重新选择</span>
                        </>
                      ) : (
                        <>
                          <Upload size={20} style={{ color: "rgba(201,162,39,0.5)" }} />
                          <span className="text-xs text-muted-foreground">
                            点击选择{form.type === "video" ? "视频" : "图片"}文件
                          </span>
                          <span className="text-[10px] text-muted-foreground/50">
                            {form.type === "video" ? "MP4/WebM · 最大100MB" : "JPG/PNG/WebP · 最大10MB"}
                          </span>
                        </>
                      )}
                    </button>

                    {/* Video preview */}
                    {form.url && form.type === "video" && (
                      <div className="mt-2 rounded-lg overflow-hidden" style={{ border: "1px solid rgba(201,162,39,0.15)" }}>
                        <video src={form.url} controls className="w-full" style={{ maxHeight: "160px", background: "#000" }} />
                      </div>
                    )}
                    {form.url && form.type === "image" && (
                      <div className="mt-2 rounded-lg overflow-hidden" style={{ border: "1px solid rgba(201,162,39,0.15)" }}>
                        <img src={form.url} alt="preview" className="w-full object-contain" style={{ maxHeight: "160px", background: "#000" }} />
                      </div>
                    )}
                  </div>
                ) : (
                  <input
                    className="w-full rounded-lg px-3 py-2 text-sm"
                    style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(201,162,39,0.2)", color: "#fff" }}
                    placeholder={form.type === "video" ? "https://example.com/video.mp4" : "https://example.com/image.jpg"}
                    value={form.url}
                    onChange={(e) => setForm({ ...form, url: e.target.value })}
                  />
                )}
              </div>
            )}

            {/* YouTube URL input */}
            {form.type === "youtube" && (
              <div>
                <label className="text-xs text-muted-foreground mb-1.5 block">YouTube URL</label>
                <input
                  className="w-full rounded-lg px-3 py-2 text-sm"
                  style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(201,162,39,0.2)", color: "#fff" }}
                  placeholder="https://youtube.com/watch?v=..."
                  value={form.url}
                  onChange={(e) => setForm({ ...form, url: e.target.value })}
                />
              </div>
            )}

            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">标题 (可选)</label>
              <input
                className="w-full rounded-lg px-3 py-2 text-sm"
                style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(201,162,39,0.2)", color: "#fff" }}
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">描述 (可选)</label>
              <input
                className="w-full rounded-lg px-3 py-2 text-sm"
                style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(201,162,39,0.2)", color: "#fff" }}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">显示语言</label>
              <div className="flex flex-wrap gap-1.5">
                {LANG_OPTIONS.map(l => (
                  <button key={l.value}
                    className="px-2 py-1 rounded-lg text-[10px] font-medium transition-all"
                    style={{
                      background: form.lang === l.value ? "rgba(201,162,39,0.15)" : "rgba(255,255,255,0.03)",
                      border: form.lang === l.value ? "1px solid rgba(201,162,39,0.3)" : "1px solid rgba(255,255,255,0.06)",
                      color: form.lang === l.value ? "#C9A227" : "rgba(255,255,255,0.4)",
                    }}
                    onClick={() => setForm({ ...form, lang: l.value })}
                  >
                    {l.label}
                  </button>
                ))}
              </div>
              <div className="text-[10px] text-muted-foreground/50 mt-1">选"全部语言"则所有语言环境都显示</div>
            </div>
            <Button
              className="w-full font-bold text-sm"
              disabled={!form.url || addMutation.isPending || uploading}
              style={{ background: "linear-gradient(135deg, #C9A227, #9A7A1A)", color: "#0c0a08" }}
              onClick={() => addMutation.mutate()}
            >
              {addMutation.isPending ? <><Loader2 size={14} className="mr-1 animate-spin" />添加中...</> : "确认添加"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Company Intro Dialog */}
      <Dialog open={editIntro} onOpenChange={setEditIntro}>
        <DialogContent className="max-w-sm mx-auto" style={{ background: "linear-gradient(145deg, #1a1510, #110e0a)", border: "1px solid rgba(201,162,39,0.3)" }}>
          <DialogHeader>
            <DialogTitle className="text-center" style={{ color: "#C9A227" }}>编辑公司介绍</DialogTitle>
            <DialogDescription className="text-center text-xs text-muted-foreground">Landing Page 显示的公司简介</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <textarea
              className="w-full rounded-lg px-3 py-2 text-sm min-h-[120px] resize-none"
              style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(201,162,39,0.2)", color: "#fff" }}
              value={introText}
              onChange={(e) => setIntroText(e.target.value)}
            />
            <Button
              className="w-full font-bold text-sm"
              disabled={saveIntroMutation.isPending}
              style={{ background: "linear-gradient(135deg, #C9A227, #9A7A1A)", color: "#0c0a08" }}
              onClick={() => saveIntroMutation.mutate()}
            >
              {saveIntroMutation.isPending ? <><Loader2 size={14} className="mr-1 animate-spin" />保存中...</> : <><Save size={14} className="mr-1" />保存</>}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
