import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { queryClient } from "@/lib/queryClient";
import { getAdminMessages, createAdminMessage, updateAdminMessage, deleteAdminMessage, adminAddLog } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Edit, Send } from "lucide-react";

export default function AdminMessages() {
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({ title: "", content: "", type: "system", targetAddress: "", isPublished: false });
  const { toast } = useToast();

  const { data: messageList = [], isLoading } = useQuery({ queryKey: ["/api/admin/messages"], queryFn: getAdminMessages });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      await createAdminMessage(data);
      await adminAddLog("创建消息", "message", data.title);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/messages"] });
      setCreating(false);
      setForm({ title: "", content: "", type: "system", targetAddress: "", isPublished: false });
      toast({ title: "消息已创建" });
    },
    onError: (err: any) => toast({ title: "创建失败", description: err.message, variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...data }: any) => {
      await updateAdminMessage(id, data);
      await adminAddLog("更新消息", "message", id.toString(), data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/messages"] });
      setEditing(null);
      toast({ title: "消息已更新" });
    },
    onError: (err: any) => toast({ title: "更新失败", description: err.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await deleteAdminMessage(id);
      await adminAddLog("删除消息", "message", id.toString());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/messages"] });
      toast({ title: "消息已删除" });
    },
    onError: (err: any) => toast({ title: "删除失败", description: err.message, variant: "destructive" }),
  });

  const openEdit = (msg: any) => {
    setEditing(msg);
    setForm({ title: msg.title, content: msg.content, type: msg.type, targetAddress: msg.targetAddress || "", isPublished: msg.isPublished });
  };

  const handleSave = () => {
    if (editing) {
      updateMutation.mutate({ id: editing.id, ...form, targetAddress: form.targetAddress || null });
    } else {
      createMutation.mutate({ ...form, targetAddress: form.targetAddress || null });
    }
  };

  const dialogOpen = creating || !!editing;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-1 h-5 rounded-full" style={{ background: "linear-gradient(180deg, #C9A227, #9A7A1A)" }} />
          <h2 className="font-bold text-lg text-foreground">消息管理</h2>
        </div>
        <Button
          data-testid="button-create-message"
          className="text-sm"
          style={{ background: "linear-gradient(135deg, #C9A227, #9A7A1A)", color: "#0c0a08", minHeight: "40px" }}
          onClick={() => { setForm({ title: "", content: "", type: "system", targetAddress: "", isPublished: false }); setCreating(true); }}
        >
          <Plus size={14} className="mr-1" /> 新建消息
        </Button>
      </div>

      {isLoading ? (
        <div className="text-center text-muted-foreground py-10">加载中...</div>
      ) : (messageList as any[]).length === 0 ? (
        <div className="text-center text-muted-foreground py-20">暂无消息</div>
      ) : (
        <div className="space-y-2">
          {(messageList as any[]).map((msg: any) => (
            <div key={msg.id} className="rounded-xl p-4" style={{ background: "linear-gradient(145deg, #1a1510, #110e0a)", border: "1px solid rgba(201,162,39,0.15)" }}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-sm text-foreground">{msg.title}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded" style={{
                      background: msg.type === "system" ? "rgba(59,130,246,0.1)" : msg.type === "reward" ? "rgba(34,197,94,0.1)" : "rgba(234,179,8,0.1)",
                      color: msg.type === "system" ? "#3b82f6" : msg.type === "reward" ? "#22c55e" : "#eab308",
                    }}>
                      {msg.type === "system" ? "系统" : msg.type === "reward" ? "奖励" : "通知"}
                    </span>
                    {msg.isPublished ? (
                      <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: "rgba(34,197,94,0.1)", color: "#22c55e" }}>已发布</span>
                    ) : (
                      <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: "rgba(255,255,255,0.05)", color: "#888" }}>草稿</span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2">{msg.content}</p>
                  <div className="flex items-center gap-3 mt-2">
                    <span className="text-[10px] text-muted-foreground">{new Date(msg.createdAt).toLocaleString()}</span>
                    {msg.targetAddress && <span className="text-[10px] text-muted-foreground font-mono">目标: {msg.targetAddress.slice(0, 10)}...</span>}
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button data-testid={`button-edit-msg-${msg.id}`} onClick={() => openEdit(msg)} className="p-2 rounded-lg flex items-center justify-center" style={{ background: "rgba(201,162,39,0.1)", color: "#C9A227", minWidth: "36px", minHeight: "36px" }}>
                    <Edit size={16} />
                  </button>
                  {!msg.isPublished && (
                    <button
                      data-testid={`button-publish-msg-${msg.id}`}
                      onClick={() => updateMutation.mutate({ id: msg.id, isPublished: true })}
                      className="p-2 rounded-lg flex items-center justify-center" style={{ background: "rgba(34,197,94,0.1)", color: "#22c55e", minWidth: "36px", minHeight: "36px" }}
                    >
                      <Send size={16} />
                    </button>
                  )}
                  <button
                    data-testid={`button-delete-msg-${msg.id}`}
                    onClick={() => { if (confirm("确定删除此消息？")) deleteMutation.mutate(msg.id); }}
                    className="p-2 rounded-lg flex items-center justify-center" style={{ background: "rgba(239,68,68,0.1)", color: "#ef4444", minWidth: "36px", minHeight: "36px" }}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={() => { setCreating(false); setEditing(null); }}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto mx-2" style={{ background: "linear-gradient(145deg, #1a1510, #110e0a)", border: "1px solid rgba(201,162,39,0.3)" }}>
          <DialogHeader>
            <DialogTitle style={{ color: "#C9A227" }}>{editing ? "编辑消息" : "新建消息"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">标题</Label>
              <Input data-testid="input-msg-title" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(201,162,39,0.2)" }} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">内容</Label>
              <Textarea data-testid="input-msg-content" value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))} rows={4}
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(201,162,39,0.2)" }} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">类型</Label>
                <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v }))}>
                  <SelectTrigger style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(201,162,39,0.2)" }}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="system">系统公告</SelectItem>
                    <SelectItem value="reward">奖励通知</SelectItem>
                    <SelectItem value="notice">一般通知</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">目标地址(可选)</Label>
                <Input data-testid="input-msg-target" value={form.targetAddress} onChange={e => setForm(f => ({ ...f, targetAddress: e.target.value }))}
                  placeholder="留空=全体"
                  style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(201,162,39,0.2)" }} />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-xs text-muted-foreground">立即发布</Label>
              <Switch checked={form.isPublished} onCheckedChange={v => setForm(f => ({ ...f, isPublished: v }))} />
            </div>
            <Button
              data-testid="button-save-message"
              className="w-full font-bold"
              style={{ background: "linear-gradient(135deg, #C9A227, #9A7A1A)", color: "#0c0a08" }}
              disabled={!form.title || !form.content}
              onClick={handleSave}
            >
              {editing ? "保存修改" : "创建消息"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
