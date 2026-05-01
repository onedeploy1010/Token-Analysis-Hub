import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { getAdminLogs } from "@/lib/api";
import { ChevronLeft, ChevronRight, ScrollText, UserCog } from "lucide-react";

const ROLE_LABELS: Record<string, string> = {
  superadmin: "超管",
  tech: "技术调试",
  finance: "财务",
  customer_service: "客服",
  custom: "自定义",
};

const ROLE_COLORS: Record<string, { bg: string; color: string }> = {
  superadmin: { bg: "rgba(239,68,68,0.1)", color: "#ef4444" },
  tech: { bg: "rgba(168,85,247,0.1)", color: "#a855f7" },
  finance: { bg: "rgba(59,130,246,0.1)", color: "#3b82f6" },
  customer_service: { bg: "rgba(34,197,94,0.1)", color: "#22c55e" },
  custom: { bg: "rgba(201,162,39,0.1)", color: "#C9A227" },
};

export default function AdminLogs() {
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ["/api/admin/logs", page],
    queryFn: () => getAdminLogs(page, 30),
  });

  const d = data as any;
  const logs = d?.logs || [];
  const totalPages = d ? Math.ceil(d.total / d.limit) : 1;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="w-1 h-5 rounded-full" style={{ background: "linear-gradient(180deg, #C9A227, #9A7A1A)" }} />
        <h2 className="font-bold text-lg text-foreground">操作日志</h2>
        <span className="text-xs text-muted-foreground ml-2">共 {d?.total || 0} 条</span>
      </div>

      {isLoading ? (
        <div className="text-center text-muted-foreground py-10">加载中...</div>
      ) : logs.length === 0 ? (
        <div className="text-center text-muted-foreground py-20">
          <ScrollText size={32} className="mx-auto mb-2 opacity-30" />
          <div className="text-sm">暂无操作日志</div>
        </div>
      ) : (
        <div className="space-y-2">
          {logs.map((log: any) => {
            const rc = ROLE_COLORS[log.adminRole] || ROLE_COLORS.customer_service;
            return (
              <div key={log.id} className="rounded-xl p-3 space-y-1.5" style={{ background: "linear-gradient(145deg, #1a1510, #110e0a)", border: "1px solid rgba(201,162,39,0.12)" }}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <UserCog size={14} style={{ color: rc.color }} />
                    <span className="text-xs font-semibold">{log.adminUsername}</span>
                    <span className="text-[10px] px-1 py-0.5 rounded" style={{ background: rc.bg, color: rc.color }}>
                      {ROLE_LABELS[log.adminRole] || log.adminRole}
                    </span>
                  </div>
                  <span className="text-[10px] text-muted-foreground">{new Date(log.createdAt).toLocaleString()}</span>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-medium" style={{ color: "#C9A227" }}>{log.action}</span>
                  {log.targetType && (
                    <span className="text-[10px] text-muted-foreground">
                      [{log.targetType}] {log.targetId || ""}
                    </span>
                  )}
                </div>
                {log.detail && (
                  <div className="text-[10px] text-muted-foreground font-mono p-1.5 rounded break-all" style={{ background: "rgba(201,162,39,0.04)" }}>
                    {typeof log.detail === "string" ? log.detail : JSON.stringify(log.detail)}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">第 {page}/{totalPages} 页</span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="text-xs" style={{ minHeight: "36px" }}>
              <ChevronLeft size={14} /> 上一页
            </Button>
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} className="text-xs" style={{ minHeight: "36px" }}>
              下一页 <ChevronRight size={14} />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
