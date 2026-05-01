import { useState, useEffect, FormEvent, useRef } from "react";
import { useLocation, useParams } from "wouter";
import { useAdminAuth } from "@/contexts/admin-auth";
import { supabase } from "@/lib/supabase";
import { Upload, X, FileText, Image } from "lucide-react";

/** Upload to Supabase Storage `resources` bucket; returns the public URL.
 *  Bucket must be created upfront with public read enabled. */
async function uploadToStorage(file: File): Promise<string> {
  const path = `${Date.now()}-${file.name.replace(/\s+/g, "_")}`;
  const { error } = await supabase.storage
    .from("resources")
    .upload(path, file, { cacheControl: "3600", upsert: false });
  if (error) throw new Error(error.message);
  const { data } = supabase.storage.from("resources").getPublicUrl(path);
  return data.publicUrl;
}

const LANGUAGES = [
  { value: "zh", label: "简体中文" },
  { value: "zh-TW", label: "繁體中文" },
  { value: "en", label: "English" },
  { value: "ja", label: "日本語" },
  { value: "ko", label: "한국어" },
  { value: "th", label: "ภาษาไทย" },
  { value: "vi", label: "Tiếng Việt" },
];
const CATEGORIES = ["whitepaper", "ppt", "system", "infographic", "other"];

export default function ResourceForm() {
  const { user } = useAdminAuth();
  const params = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const isEdit = !!params.id;

  const [form, setForm] = useState({
    language: "zh", category: "whitepaper", title: "", description: "",
    fileUrl: "", fileType: "pdf", fileSize: "", sortOrder: 0,
    visible: true, previewImageUrl: "",
  });
  const [docFile, setDocFile] = useState<File | null>(null);
  const [imgFile, setImgFile] = useState<File | null>(null);
  const [docPreview, setDocPreview] = useState("");
  const [imgPreview, setImgPreview] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(isEdit);
  const docRef = useRef<HTMLInputElement>(null);
  const imgRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isEdit || !user) return;
    void (async () => {
      const { data, error } = await supabase
        .from("resources")
        .select("*")
        .eq("id", Number(params.id))
        .maybeSingle();
      if (error) { console.error(error); setLoading(false); return; }
      if (data) {
        const r: any = data;
        setForm({
          language: r.language, category: r.category, title: r.title,
          description: r.description || "", fileUrl: r.file_url, fileType: r.file_type,
          fileSize: r.file_size || "", sortOrder: r.sort_order, visible: r.visible,
          previewImageUrl: r.preview_image_url || "",
        });
        if (r.preview_image_url) setImgPreview(r.preview_image_url);
      }
      setLoading(false);
    })();
  }, [isEdit, params.id, user]);

  function handleDocChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setDocFile(f);
    setDocPreview(f.name);
    const ext = f.name.split(".").pop()?.toLowerCase() ?? "pdf";
    setForm(p => ({ ...p, fileType: ext, fileSize: `${(f.size / 1024 / 1024).toFixed(1)} MB` }));
  }

  function handleImgChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setImgFile(f);
    setImgPreview(URL.createObjectURL(f));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!user) return;
    setSubmitting(true);
    setError("");
    try {
      let fileUrl = form.fileUrl;
      let previewImageUrl = form.previewImageUrl;

      if (docFile)  fileUrl         = await uploadToStorage(docFile);
      if (imgFile)  previewImageUrl = await uploadToStorage(imgFile);

      // Map form (camelCase) → DB (snake_case) on the way out.
      const row = {
        language: form.language,
        category: form.category,
        title: form.title,
        description: form.description,
        file_url: fileUrl,
        file_type: form.fileType,
        file_size: form.fileSize,
        sort_order: form.sortOrder,
        visible: form.visible,
        preview_image_url: previewImageUrl,
      };

      const { error: dbErr } = isEdit
        ? await supabase.from("resources").update(row).eq("id", Number(params.id))
        : await supabase.from("resources").insert(row);
      if (dbErr) throw new Error(dbErr.message);
      navigate("/resources");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "保存失败");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return (
    <div className="p-8 flex items-center justify-center h-64">
      <div className="text-muted-foreground">加载中...</div>
    </div>
  );

  return (
    <div className="p-8 max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">
          {isEdit ? "编辑资料 · Edit Resource" : "新增资料 · Add Resource"}
        </h1>
        <p className="text-muted-foreground text-sm mt-1">填写资料信息并上传文件</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Language + Category */}
        <div className="grid grid-cols-2 gap-4">
          <Field label="语言 · Language" required>
            <select value={form.language} onChange={e => setForm(p => ({ ...p, language: e.target.value }))}
              className="w-full px-3 py-2.5 bg-input border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring">
              {LANGUAGES.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
            </select>
          </Field>
          <Field label="分类 · Category" required>
            <select value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))}
              className="w-full px-3 py-2.5 bg-input border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring">
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </Field>
        </div>

        {/* Title */}
        <Field label="标题 · Title" required>
          <input type="text" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
            required placeholder="资料标题"
            className="w-full px-3 py-2.5 bg-input border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </Field>

        {/* Description */}
        <Field label="描述 · Description">
          <textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
            rows={3} placeholder="可选描述..."
            className="w-full px-3 py-2.5 bg-input border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
          />
        </Field>

        {/* File upload */}
        <Field label="文件 · Document File" required={!isEdit}>
          <div
            onClick={() => docRef.current?.click()}
            className="flex items-center gap-3 px-4 py-3 bg-input border border-dashed border-border rounded-lg cursor-pointer hover:border-primary/50 transition-colors"
          >
            <FileText className="h-5 w-5 text-muted-foreground shrink-0" />
            <div className="flex-1 min-w-0">
              {docPreview || form.fileUrl ? (
                <p className="text-sm text-foreground truncate">{docPreview || form.fileUrl}</p>
              ) : (
                <p className="text-sm text-muted-foreground">点击上传 PDF / PPT / 其他文件</p>
              )}
            </div>
            <Upload className="h-4 w-4 text-muted-foreground shrink-0" />
          </div>
          <input ref={docRef} type="file" onChange={handleDocChange} className="hidden"
            accept=".pdf,.ppt,.pptx,.doc,.docx,.xls,.xlsx,.zip" />
        </Field>

        {/* Preview image */}
        <Field label="预览图 · Preview Image (optional)">
          <div className="flex gap-3 items-start">
            <div
              onClick={() => imgRef.current?.click()}
              className="flex-1 flex items-center gap-3 px-4 py-3 bg-input border border-dashed border-border rounded-lg cursor-pointer hover:border-primary/50 transition-colors"
            >
              <Image className="h-5 w-5 text-muted-foreground shrink-0" />
              <p className="text-sm text-muted-foreground flex-1">{imgFile ? imgFile.name : "点击上传缩略图"}</p>
              <Upload className="h-4 w-4 text-muted-foreground shrink-0" />
            </div>
            {imgPreview && (
              <div className="relative">
                <img src={imgPreview} alt="" className="w-16 h-16 rounded-lg object-cover border border-border" />
                <button type="button"
                  onClick={() => { setImgFile(null); setImgPreview(""); setForm(p => ({ ...p, previewImageUrl: "" })); }}
                  className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-destructive flex items-center justify-center"
                >
                  <X className="h-3 w-3 text-white" />
                </button>
              </div>
            )}
          </div>
          <input ref={imgRef} type="file" onChange={handleImgChange} className="hidden" accept="image/*" />
        </Field>

        {/* Sort + Visible */}
        <div className="grid grid-cols-2 gap-4">
          <Field label="排序 · Sort Order">
            <input type="number" value={form.sortOrder} onChange={e => setForm(p => ({ ...p, sortOrder: Number(e.target.value) }))}
              className="w-full px-3 py-2.5 bg-input border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </Field>
          <Field label="显示状态 · Visibility">
            <div className="flex items-center gap-3 py-2.5">
              <button type="button"
                onClick={() => setForm(p => ({ ...p, visible: !p.visible }))}
                className={`relative w-11 h-6 rounded-full transition-colors ${form.visible ? "bg-primary" : "bg-muted"}`}
              >
                <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${form.visible ? "translate-x-5" : "translate-x-0.5"}`} />
              </button>
              <span className="text-sm text-foreground">{form.visible ? "显示" : "隐藏"}</span>
            </div>
          </Field>
        </div>

        {error && (
          <div className="text-destructive text-sm bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2">
            {error}
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <button type="submit" disabled={submitting}
            className="flex-1 py-2.5 bg-primary text-primary-foreground rounded-lg font-semibold text-sm hover:bg-primary/90 transition-colors disabled:opacity-60"
          >
            {submitting ? "保存中..." : (isEdit ? "保存修改 · Save" : "创建资料 · Create")}
          </button>
          <button type="button" onClick={() => navigate("/resources")}
            className="px-5 py-2.5 border border-border text-foreground rounded-lg text-sm hover:bg-muted/40 transition-colors"
          >
            取消
          </button>
        </div>
      </form>
    </div>
  );
}

function Field({ label, children, required }: { label: string; children: React.ReactNode; required?: boolean }) {
  return (
    <div>
      <label className="block text-sm font-medium text-foreground mb-1.5">
        {label}{required && <span className="text-destructive ml-1">*</span>}
      </label>
      {children}
    </div>
  );
}
