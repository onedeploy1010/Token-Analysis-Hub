import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { getAdminMembers, getAdminMemberDetail, getAdminTeamTree, updateMemberLevel, updateMemberNote, updateMemberObservation, adminAddLog, hasPermission, adminCreateOrderForMember, adminCancelOrder, getProducts, DBProduct, exportMembersCSV } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { queryClient } from "@/lib/queryClient";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Search, ChevronLeft, ChevronRight, Crown, Eye, Users, ArrowLeft, ChevronDown, Save, Plus, X, Package, Download, Shield, CircleDot, MessageSquare, Check, DollarSign } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { CopyableAddress, shortAddr } from "@/components/CopyableAddress";

function TeamTree({ rootAddress }: { rootAddress: string }) {
  const [drillPath, setDrillPath] = useState<string[]>([]);
  const currentAddr = drillPath.length > 0 ? drillPath[drillPath.length - 1] : rootAddress;

  const { data: children = [], isLoading } = useQuery({
    queryKey: ["/api/admin/members", currentAddr, "team-tree"],
    queryFn: () => getAdminTeamTree(currentAddr),
  });

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 flex-wrap">
        {drillPath.length > 0 && (
          <button
            onClick={() => setDrillPath(prev => prev.slice(0, -1))}
            className="flex items-center gap-1 px-3 py-1.5 rounded text-xs font-semibold"
            style={{ background: "rgba(201,162,39,0.1)", color: "#C9A227", border: "1px solid rgba(201,162,39,0.2)" }}
          >
            <ArrowLeft size={12} /> 返回
          </button>
        )}
        <CopyableAddress address={currentAddr} className="text-muted-foreground" />
      </div>

      {isLoading ? (
        <div className="text-center text-muted-foreground text-xs py-4">加载中...</div>
      ) : (children as any[]).length === 0 ? (
        <div className="text-center text-muted-foreground text-xs py-4">暂无直推</div>
      ) : (
        <div className="space-y-1.5">
          {(children as any[]).map((m: any) => (
            <div key={m.walletAddress} className="flex items-center justify-between p-2.5 rounded-lg" style={{ background: "rgba(201,162,39,0.04)" }}>
              <div className="flex items-center gap-2">
                {m.isObserved && (
                  <div className="w-2 h-2 rounded-full shrink-0" style={{ background: "#22c55e", boxShadow: "0 0 6px rgba(34,197,94,0.5)" }} title="观察账户" />
                )}
                <Users size={14} style={{ color: "#C9A227" }} />
                <CopyableAddress address={m.walletAddress} />
                <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: "rgba(201,162,39,0.1)", color: "#C9A227" }}>
                  {m.level === 0 ? "普通" : `V${m.level}`}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground">{m.stakingAmount > 0 ? `${m.stakingAmount.toFixed(0)}U` : "0U"}</span>
                {m.hasChildren && (
                  <button
                    onClick={() => setDrillPath(prev => [...prev, m.walletAddress])}
                    className="flex items-center gap-1 text-xs px-2 py-1 rounded"
                    style={{ background: "rgba(201,162,39,0.1)", color: "#C9A227", minHeight: "28px" }}
                  >
                    <ChevronDown size={12} /> {m.childrenCount}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function MemberDetail({ data, onLevelChanged }: { data: any; onLevelChanged?: () => void }) {
  const [showTree, setShowTree] = useState(false);
  const [editLevel, setEditLevel] = useState<number | null>(null);
  const [showAddOrder, setShowAddOrder] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<number>(0);
  const [orderAmount, setOrderAmount] = useState("");
  const [editNote, setEditNote] = useState<string | null>(null);
  const { toast } = useToast();
  const m = data.member;
  const canWrite = hasPermission("members.write");

  const observationMutation = useMutation({
    mutationFn: async (options: { isObserved?: boolean; principalWithdrawalEnabled?: boolean; earningsWithdrawalEnabled?: boolean }) => {
      await updateMemberObservation(m.walletAddress, options);
      await adminAddLog("更新会员观察设置", "member", m.walletAddress, options);
    },
    onSuccess: () => {
      toast({ title: "设置已更新" });
      onLevelChanged?.();
    },
    onError: (err: any) => toast({ title: "更新失败", description: err.message, variant: "destructive" }),
  });

  const noteMutation = useMutation({
    mutationFn: async (note: string) => {
      await updateMemberNote(m.walletAddress, note);
      await adminAddLog("更新会员备注", "member", m.walletAddress, { note });
    },
    onSuccess: () => {
      toast({ title: "备注已更新" });
      setEditNote(null);
      onLevelChanged?.();
    },
    onError: (err: any) => toast({ title: "更新失败", description: err.message, variant: "destructive" }),
  });

  const { data: dbProducts = [] } = useQuery({
    queryKey: ["/api/products"],
    queryFn: getProducts,
  });

  useEffect(() => {
    if (dbProducts.length > 0 && selectedProduct === 0) {
      setSelectedProduct(dbProducts[0].id);
    }
  }, [dbProducts]);

  const currentProduct = dbProducts.find((p: DBProduct) => p.id === selectedProduct);

  const levelMutation = useMutation({
    mutationFn: async (newLevel: number) => {
      await updateMemberLevel(m.walletAddress, newLevel);
      await adminAddLog("调整会员等级", "member", m.walletAddress, { oldLevel: m.level, newLevel });
    },
    onSuccess: () => {
      toast({ title: "等级已更新" });
      setEditLevel(null);
      onLevelChanged?.();
    },
    onError: (err: any) => toast({ title: "更新失败", description: err.message, variant: "destructive" }),
  });

  const createOrderMutation = useMutation({
    mutationFn: async () => {
      const amount = parseFloat(orderAmount);
      if (!amount || amount <= 0) throw new Error("请输入有效金额");
      await adminCreateOrderForMember(m.walletAddress, selectedProduct, amount);
      await adminAddLog("为会员添加配套", "member", m.walletAddress, { productId: selectedProduct, amount });
    },
    onSuccess: () => {
      toast({ title: "配套添加成功" });
      setShowAddOrder(false);
      setOrderAmount("");
      onLevelChanged?.();
    },
    onError: (err: any) => toast({ title: "添加失败", description: err.message, variant: "destructive" }),
  });

  const cancelOrderMutation = useMutation({
    mutationFn: async (orderId: number) => {
      await adminCancelOrder(orderId);
      await adminAddLog("取消会员配套", "member", m.walletAddress, { orderId });
    },
    onSuccess: () => {
      toast({ title: "配套已取消" });
      onLevelChanged?.();
    },
    onError: (err: any) => toast({ title: "取消失败", description: err.message, variant: "destructive" }),
  });

  return (
    <div className="space-y-4 text-sm">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <div className="p-2 rounded" style={{ background: "rgba(201,162,39,0.04)" }}>
          <div className="text-[10px] text-muted-foreground">地址</div>
          <div className="font-mono text-xs break-all">{m.walletAddress}</div>
        </div>
        <div className="p-2 rounded" style={{ background: "rgba(201,162,39,0.04)" }}>
          <div className="text-[10px] text-muted-foreground">备注</div>
          {canWrite ? (
            editNote !== null ? (
              <div className="flex items-center gap-1">
                <input
                  value={editNote}
                  onChange={e => setEditNote(e.target.value)}
                  placeholder="添加备注..."
                  className="flex-1 text-xs rounded px-1.5 py-0.5"
                  style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(201,162,39,0.25)", color: "#C9A227" }}
                  autoFocus
                  onKeyDown={e => { if (e.key === "Enter") noteMutation.mutate(editNote); if (e.key === "Escape") setEditNote(null); }}
                />
                <button onClick={() => noteMutation.mutate(editNote)} className="p-1 rounded" style={{ background: "rgba(34,197,94,0.1)", color: "#22c55e" }}>
                  <Check size={12} />
                </button>
                <button onClick={() => setEditNote(null)} className="p-1 rounded" style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.4)" }}>
                  <X size={12} />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-1 cursor-pointer group" onClick={() => setEditNote(m.note || "")}>
                <span className="text-xs" style={{ color: m.note ? "#C9A227" : "rgba(255,255,255,0.3)" }}>
                  {m.note || "点击添加备注"}
                </span>
                <MessageSquare size={10} className="opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: "#C9A227" }} />
              </div>
            )
          ) : (
            <div className="text-xs" style={{ color: m.note ? "#C9A227" : "rgba(255,255,255,0.3)" }}>{m.note || "无"}</div>
          )}
        </div>
        <div className="p-2 rounded" style={{ background: "rgba(201,162,39,0.04)" }}>
          <div className="text-[10px] text-muted-foreground">等级</div>
          {canWrite ? (
            <div className="flex items-center gap-2">
              <select
                value={editLevel ?? m.level}
                onChange={e => setEditLevel(parseInt(e.target.value))}
                className="text-xs font-semibold rounded px-1.5 py-0.5 appearance-none cursor-pointer"
                style={{ background: "rgba(201,162,39,0.08)", border: "1px solid rgba(201,162,39,0.25)", color: "#C9A227" }}
              >
                <option value={0}>普通</option>
                {[1,2,3,4,5,6,7].map(v => <option key={v} value={v}>V{v}</option>)}
              </select>
              {editLevel !== null && editLevel !== m.level && (
                <button
                  onClick={() => levelMutation.mutate(editLevel)}
                  className="p-1 rounded flex items-center justify-center"
                  style={{ background: "rgba(34,197,94,0.1)", color: "#22c55e", minWidth: "28px", minHeight: "28px" }}
                >
                  <Save size={12} />
                </button>
              )}
            </div>
          ) : (
            <div className="text-xs font-semibold" style={{ color: "#C9A227" }}>{m.level === 0 ? "普通" : `V${m.level}`}</div>
          )}
        </div>
        <div className="p-2 rounded" style={{ background: "rgba(201,162,39,0.04)" }}>
          <div className="text-[10px] text-muted-foreground">推荐人</div>
          <div className="font-mono text-xs">{m.referrerAddress ? shortAddr(m.referrerAddress) : "无"}</div>
        </div>
        <div className="p-2 rounded" style={{ background: "rgba(201,162,39,0.04)" }}>
          <div className="text-[10px] text-muted-foreground">注册时间</div>
          <div className="text-xs">{new Date(m.createdAt).toLocaleString()}</div>
        </div>
        <div className="p-2 rounded" style={{ background: "rgba(201,162,39,0.04)" }}>
          <div className="text-[10px] text-muted-foreground">直推</div>
          <div className="text-xs">{data.directReferrals?.length || 0} 人</div>
        </div>
        <div className="p-2 rounded" style={{ background: "rgba(201,162,39,0.04)" }}>
          <div className="text-[10px] text-muted-foreground">终身保级</div>
          <div className="text-xs">{m.lifetimeLock ? "是" : "否"}</div>
        </div>
      </div>

      {/* Financial Summary */}
      {(() => {
        const orders = data.orders || [];
        const rewards = data.rewards || [];
        const withdrawals = data.withdrawals || [];
        const activeStaking = orders.filter((o: any) => o.status === "active").reduce((s: number, o: any) => s + parseFloat(o.amount || 0), 0);
        const dailyEarnings = rewards.filter((r: any) => r.type === "daily").reduce((s: number, r: any) => s + parseFloat(r.amount || 0), 0);
        const bonusRewards = rewards.filter((r: any) => r.type !== "daily").reduce((s: number, r: any) => s + parseFloat(r.amount || 0), 0);
        const totalRewards = dailyEarnings + bonusRewards;
        const completedWithdrawals = withdrawals.filter((w: any) => w.status === "completed");
        const totalWithdrawn = completedWithdrawals.reduce((s: number, w: any) => s + parseFloat(w.amount || 0), 0);
        const totalFees = completedWithdrawals.reduce((s: number, w: any) => s + parseFloat(w.fee || 0), 0);
        const available = totalRewards - totalWithdrawn;
        return (
          <div className="rounded-lg p-3 space-y-2" style={{ background: "rgba(201,162,39,0.04)", border: "1px solid rgba(201,162,39,0.15)" }}>
            <div className="flex items-center gap-1.5 text-xs font-semibold" style={{ color: "#C9A227" }}>
              <DollarSign size={14} /> 资金明细
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              <div className="p-2 rounded text-center" style={{ background: "rgba(255,255,255,0.03)" }}>
                <div className="text-[10px] text-muted-foreground">活跃质押</div>
                <div className="text-xs font-bold" style={{ color: "#C9A227" }}>{activeStaking.toFixed(2)} U</div>
              </div>
              <div className="p-2 rounded text-center" style={{ background: "rgba(255,255,255,0.03)" }}>
                <div className="text-[10px] text-muted-foreground">累计利息</div>
                <div className="text-xs font-bold" style={{ color: "#22c55e" }}>{dailyEarnings.toFixed(2)} U</div>
              </div>
              <div className="p-2 rounded text-center" style={{ background: "rgba(255,255,255,0.03)" }}>
                <div className="text-[10px] text-muted-foreground">累计奖励</div>
                <div className="text-xs font-bold" style={{ color: "#a855f7" }}>{bonusRewards.toFixed(2)} U</div>
                <div className="text-[9px] text-muted-foreground">直推+间推+团队+同级</div>
              </div>
              <div className="p-2 rounded text-center" style={{ background: "rgba(255,255,255,0.03)" }}>
                <div className="text-[10px] text-muted-foreground">总累计金额</div>
                <div className="text-xs font-bold" style={{ color: "#C9A227" }}>{totalRewards.toFixed(2)} U</div>
              </div>
              <div className="p-2 rounded text-center" style={{ background: "rgba(255,255,255,0.03)" }}>
                <div className="text-[10px] text-muted-foreground">已提现</div>
                <div className="text-xs font-bold" style={{ color: "#ef4444" }}>{totalWithdrawn.toFixed(2)} U</div>
                <div className="text-[9px] text-muted-foreground">{completedWithdrawals.length} 笔 | 手续费 {totalFees.toFixed(2)}</div>
              </div>
              <div className="p-2 rounded text-center" style={{ background: "rgba(255,255,255,0.03)" }}>
                <div className="text-[10px] text-muted-foreground">未提现</div>
                <div className="text-xs font-bold" style={{ color: available >= 0 ? "#22c55e" : "#ef4444" }}>{available.toFixed(2)} U</div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Observation Controls */}
      {canWrite && (
        <div className="rounded-lg p-3 space-y-2.5" style={{ background: "rgba(201,162,39,0.04)", border: "1px solid rgba(201,162,39,0.15)" }}>
          <div className="flex items-center gap-1.5 text-xs font-semibold" style={{ color: "#C9A227" }}>
            <Shield size={14} /> 账户控制
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">观察账户</span>
              <button
                onClick={() => observationMutation.mutate({ isObserved: !m.isObserved })}
                className="text-xs px-2.5 py-1 rounded-full font-semibold transition-all"
                style={{
                  background: m.isObserved ? "rgba(34,197,94,0.15)" : "rgba(255,255,255,0.06)",
                  color: m.isObserved ? "#22c55e" : "rgba(255,255,255,0.4)",
                  border: m.isObserved ? "1px solid rgba(34,197,94,0.3)" : "1px solid rgba(255,255,255,0.1)",
                }}
              >
                {m.isObserved ? "已标记" : "未标记"}
              </button>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">本金提现</span>
              <button
                onClick={() => observationMutation.mutate({ principalWithdrawalEnabled: !m.principalWithdrawalEnabled })}
                className="text-xs px-2.5 py-1 rounded-full font-semibold transition-all"
                style={{
                  background: m.principalWithdrawalEnabled ? "rgba(34,197,94,0.15)" : "rgba(239,68,68,0.15)",
                  color: m.principalWithdrawalEnabled ? "#22c55e" : "#ef4444",
                  border: m.principalWithdrawalEnabled ? "1px solid rgba(34,197,94,0.3)" : "1px solid rgba(239,68,68,0.3)",
                }}
              >
                {m.principalWithdrawalEnabled ? "开启" : "关闭"}
              </button>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">收益提现</span>
              <button
                onClick={() => observationMutation.mutate({ earningsWithdrawalEnabled: !m.earningsWithdrawalEnabled })}
                className="text-xs px-2.5 py-1 rounded-full font-semibold transition-all"
                style={{
                  background: m.earningsWithdrawalEnabled ? "rgba(34,197,94,0.15)" : "rgba(239,68,68,0.15)",
                  color: m.earningsWithdrawalEnabled ? "#22c55e" : "#ef4444",
                  border: m.earningsWithdrawalEnabled ? "1px solid rgba(34,197,94,0.3)" : "1px solid rgba(239,68,68,0.3)",
                }}
              >
                {m.earningsWithdrawalEnabled ? "开启" : "关闭"}
              </button>
            </div>
          </div>
        </div>
      )}

      {data.directReferrals?.length > 0 && (
        <div>
          <Button
            size="sm"
            variant="outline"
            className="w-full text-xs"
            style={{ border: "1px solid rgba(201,162,39,0.25)", color: "#C9A227", minHeight: "36px" }}
            onClick={() => setShowTree(!showTree)}
          >
            <Users size={14} className="mr-1" />
            {showTree ? "隐藏" : "查看"} 团队树 ({data.directReferrals.length} 直推)
          </Button>
          {showTree && (
            <div className="mt-2 p-2 rounded-lg" style={{ background: "rgba(201,162,39,0.03)", border: "1px solid rgba(201,162,39,0.1)" }}>
              <TeamTree rootAddress={m.walletAddress} />
            </div>
          )}
        </div>
      )}

      {/* 投资配套管理 */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <div className="font-semibold text-xs flex items-center gap-1" style={{ color: "#C9A227" }}>
            <Package size={14} /> 投资配套 ({data.orders?.length || 0})
          </div>
          {canWrite && (
            <button
              onClick={() => setShowAddOrder(!showAddOrder)}
              className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg"
              style={{ background: "linear-gradient(135deg, #C9A227, #9A7A1A)", color: "#0c0a08", fontWeight: 600, minHeight: "30px" }}
            >
              <Plus size={12} /> 添加配套
            </button>
          )}
        </div>

        {showAddOrder && (
          <div className="p-3 rounded-lg mb-3 space-y-2.5" style={{ background: "rgba(201,162,39,0.06)", border: "1px solid rgba(201,162,39,0.2)" }}>
            <div>
              <div className="text-[10px] text-muted-foreground mb-1">选择产品</div>
              <select
                value={selectedProduct}
                onChange={e => { setSelectedProduct(parseInt(e.target.value)); setOrderAmount(""); }}
                className="w-full text-xs rounded px-2 py-1.5"
                style={{ background: "rgba(201,162,39,0.08)", border: "1px solid rgba(201,162,39,0.25)", color: "#C9A227" }}
              >
                {dbProducts.map((p: DBProduct) => (
                  <option key={p.id} value={p.id}>{p.name} - {p.days}天 {p.dailyRate}%/日</option>
                ))}
              </select>
            </div>
            {currentProduct && (
              <div className="flex gap-2 text-[10px] text-muted-foreground">
                <span>周期: {currentProduct.days}天</span>
                <span>日利率: {currentProduct.dailyRate}%</span>
                <span>最低: {currentProduct.minAmount}U</span>
              </div>
            )}
            <div>
              <div className="text-[10px] text-muted-foreground mb-1">投资金额 (USDT)</div>
              <Input
                type="number"
                value={orderAmount}
                onChange={e => setOrderAmount(e.target.value)}
                placeholder={`最低 ${currentProduct?.minAmount || 200} USDT`}
                className="text-xs"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(201,162,39,0.2)", minHeight: "36px" }}
              />
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                className="flex-1 text-xs"
                style={{ background: "linear-gradient(135deg, #C9A227, #9A7A1A)", color: "#0c0a08", minHeight: "34px" }}
                onClick={() => createOrderMutation.mutate()}
                disabled={createOrderMutation.isPending}
              >
                {createOrderMutation.isPending ? "添加中..." : "确认添加"}
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="text-xs"
                style={{ border: "1px solid rgba(201,162,39,0.2)", minHeight: "34px" }}
                onClick={() => { setShowAddOrder(false); setOrderAmount(""); }}
              >
                取消
              </Button>
            </div>
          </div>
        )}

        {data.orders?.length > 0 ? (
          <div className="space-y-1.5">
            {data.orders.map((o: any) => (
              <div key={o.id} className="flex items-center justify-between p-2 rounded" style={{ background: "rgba(201,162,39,0.04)" }}>
                <div className="flex flex-col gap-0.5 flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium">{o.product_name || o.productName}</span>
                    <span className="text-xs font-semibold">{parseFloat(o.amount).toFixed(0)} U</span>
                  </div>
                  <div className="text-[10px] text-muted-foreground">
                    {new Date(o.start_date || o.startDate).toLocaleDateString()} ~ {new Date(o.end_date || o.endDate).toLocaleDateString()}
                    {o.total_earned || o.totalEarned ? ` · 已赚 ${parseFloat(o.total_earned || o.totalEarned || "0").toFixed(6)}U` : ""}
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs px-1.5 py-0.5 rounded"
                    style={{
                      background: o.status === "active" ? "rgba(34,197,94,0.1)" : o.status === "cancelled" ? "rgba(239,68,68,0.1)" : "rgba(255,255,255,0.05)",
                      color: o.status === "active" ? "#22c55e" : o.status === "cancelled" ? "#ef4444" : "#888"
                    }}>
                    {o.status === "active" ? "进行中" : o.status === "cancelled" ? "已取消" : "已完成"}
                  </span>
                  {canWrite && o.status === "active" && (
                    <button
                      onClick={() => { if (confirm("确定要取消该配套吗？")) cancelOrderMutation.mutate(o.id); }}
                      className="p-1 rounded flex items-center justify-center"
                      style={{ background: "rgba(239,68,68,0.1)", color: "#ef4444", minWidth: "24px", minHeight: "24px" }}
                      title="取消配套"
                    >
                      <X size={10} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center text-muted-foreground text-xs py-3" style={{ background: "rgba(201,162,39,0.03)", borderRadius: "8px" }}>
            暂无投资配套
          </div>
        )}
      </div>

      {data.withdrawals?.length > 0 && (
        <div>
          <div className="font-semibold text-xs mb-2" style={{ color: "#C9A227" }}>提现记录 ({data.withdrawals.length})</div>
          <div className="space-y-1.5">
            {data.withdrawals.map((w: any) => (
              <div key={w.id} className="flex items-center justify-between p-2 rounded" style={{ background: "rgba(201,162,39,0.04)" }}>
                <span className="text-xs font-semibold">{parseFloat(w.amount).toFixed(6)} U</span>
                <span className="text-xs text-muted-foreground">{new Date(w.created_at || w.createdAt).toLocaleDateString()}</span>
                <span className="text-xs" style={{ color: w.status === "pending" ? "#eab308" : w.status === "completed" ? "#22c55e" : "#ef4444" }}>
                  {w.status === "pending" ? "待审核" : w.status === "completed" ? "已完成" : "已拒绝"}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function MemberCard({ m, onView }: { m: any; onView: () => void }) {
  return (
    <div className="rounded-xl p-3 space-y-2" style={{ background: "linear-gradient(145deg, #1a1510, #110e0a)", border: m.isObserved ? "1px solid rgba(34,197,94,0.3)" : "1px solid rgba(201,162,39,0.12)" }}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {m.isObserved && (
            <div className="w-2 h-2 rounded-full shrink-0" style={{ background: "#22c55e", boxShadow: "0 0 6px rgba(34,197,94,0.5)" }} title="观察账户" />
          )}
          <CopyableAddress address={m.walletAddress} />
          {m.note && (
            <span className="text-[10px] px-1.5 py-0.5 rounded truncate max-w-[100px]" style={{ background: "rgba(201,162,39,0.08)", color: "#C9A227", border: "1px solid rgba(201,162,39,0.15)" }} title={m.note}>
              {m.note}
            </span>
          )}
          <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: "rgba(201,162,39,0.12)", color: "#C9A227" }}>
            {m.level === 0 ? "普通" : `V${m.level}`}
          </span>
          {m.isObserved && (!m.principalWithdrawalEnabled || !m.earningsWithdrawalEnabled) && (
            <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: "rgba(239,68,68,0.1)", color: "#ef4444" }}>
              {!m.principalWithdrawalEnabled && !m.earningsWithdrawalEnabled ? "提现关闭" : !m.principalWithdrawalEnabled ? "本金关闭" : "收益关闭"}
            </span>
          )}
        </div>
        <button onClick={onView} className="p-2 rounded-lg" style={{ background: "rgba(201,162,39,0.1)", color: "#C9A227", minWidth: "36px", minHeight: "36px", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Eye size={16} />
        </button>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <div className="text-center">
          <div className="text-[10px] text-muted-foreground">质押</div>
          <div className="text-xs font-semibold">{parseFloat(m.stakingAmount || 0).toFixed(0)}U</div>
        </div>
        <div className="text-center">
          <div className="text-[10px] text-muted-foreground">收益</div>
          <div className="text-xs font-semibold">{parseFloat(m.totalEarned || 0).toFixed(0)}U</div>
        </div>
        <div className="text-center">
          <div className="text-[10px] text-muted-foreground">直推</div>
          <div className="text-xs font-semibold">{m.directCount || 0}</div>
        </div>
      </div>
      <div className="text-[10px] text-muted-foreground">{new Date(m.createdAt).toLocaleDateString()} 注册</div>
    </div>
  );
}

export default function Members() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [levelFilter, setLevelFilter] = useState<number | null>(null);
  const [observedFilter, setObservedFilter] = useState<boolean | null>(null);
  const [detailAddr, setDetailAddr] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["/api/admin/members", `?page=${page}&limit=20&search=${search}&level=${levelFilter}&observed=${observedFilter}`],
    queryFn: () => getAdminMembers(page, 20, search, levelFilter, observedFilter),
  });

  const { data: detail } = useQuery({
    queryKey: ["/api/admin/members", detailAddr],
    queryFn: () => getAdminMemberDetail(detailAddr!),
    enabled: !!detailAddr,
  });

  const d = data as any;
  const totalPages = d ? Math.ceil(d.total / d.limit) : 1;

  const handleSearch = () => { setSearch(searchInput); setPage(1); };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-1 h-5 rounded-full" style={{ background: "linear-gradient(180deg, #C9A227, #9A7A1A)" }} />
          <h2 className="font-bold text-lg text-foreground">会员管理</h2>
          <span className="text-xs text-muted-foreground ml-2">共 {d?.total || 0} 人</span>
        </div>
        <Button size="sm" variant="outline" disabled={exporting}
          style={{ border: "1px solid rgba(201,162,39,0.25)", color: "#C9A227", minHeight: "36px" }}
          onClick={async () => { setExporting(true); try { await exportMembersCSV(search, levelFilter); } finally { setExporting(false); } }}>
          <Download size={14} className="mr-1" /> {exporting ? "导出中..." : "导出CSV"}
        </Button>
      </div>

      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            data-testid="input-member-search"
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleSearch()}
            placeholder="搜索地址或备注..."
            className="pl-9 text-sm"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(201,162,39,0.2)", minHeight: "40px" }}
          />
        </div>
        <select
          value={levelFilter === null ? "all" : levelFilter.toString()}
          onChange={e => {
            const v = e.target.value;
            setLevelFilter(v === "all" ? null : parseInt(v));
            setPage(1);
          }}
          className="text-xs rounded px-2 shrink-0"
          style={{ background: "rgba(201,162,39,0.08)", border: "1px solid rgba(201,162,39,0.25)", color: "#C9A227", minHeight: "40px", minWidth: "80px" }}
        >
          <option value="all">全部等级</option>
          <option value="0">普通</option>
          {[1,2,3,4,5,6,7].map(v => <option key={v} value={v}>V{v}</option>)}
        </select>
        <button
          onClick={() => { setObservedFilter(observedFilter ? null : true); setPage(1); }}
          className="text-xs rounded px-2.5 shrink-0 flex items-center gap-1"
          style={{
            background: observedFilter ? "rgba(34,197,94,0.15)" : "rgba(255,255,255,0.04)",
            border: observedFilter ? "1px solid rgba(34,197,94,0.3)" : "1px solid rgba(201,162,39,0.25)",
            color: observedFilter ? "#22c55e" : "#C9A227",
            minHeight: "40px",
          }}
        >
          <CircleDot size={12} /> 观察
        </button>
        <Button data-testid="button-search" onClick={handleSearch} className="text-sm" style={{ background: "linear-gradient(135deg, #C9A227, #9A7A1A)", color: "#0c0a08", minHeight: "40px" }}>
          搜索
        </Button>
      </div>

      {isLoading ? (
        <div className="text-center text-muted-foreground py-10">加载中...</div>
      ) : (
        <div className="space-y-2">
          {(d?.members || []).map((m: any) => (
            <MemberCard key={m.id} m={m} onView={() => setDetailAddr(m.walletAddress)} />
          ))}
        </div>
      )}

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

      <Dialog open={!!detailAddr} onOpenChange={() => setDetailAddr(null)}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto mx-2" style={{ background: "linear-gradient(145deg, #1a1510, #110e0a)", border: "1px solid rgba(201,162,39,0.3)" }}>
          <DialogHeader>
            <DialogTitle style={{ color: "#C9A227" }}>会员详情</DialogTitle>
          </DialogHeader>
          {detail ? <MemberDetail data={detail as any} onLevelChanged={() => {
            queryClient.invalidateQueries({ queryKey: ["/api/admin/members"] });
            queryClient.invalidateQueries({ queryKey: ["/api/admin/members", detailAddr] });
          }} /> : <div className="text-center text-muted-foreground py-4">加载中...</div>}
        </DialogContent>
      </Dialog>
    </div>
  );
}
