import { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronDown, ChevronUp, Zap, Shield, TrendingUp, FlaskConical,
  Wallet, UserPlus, Coins, Loader2, CheckCircle2, AlertCircle,
  ShieldCheck, ArrowRight, X, BookOpen,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { useActiveAccount } from "thirdweb/react";
import { useDemoStore } from "@/lib/demo-store";
import { DEMO_ADDRESS } from "@/lib/demo-mock-data";
import { useReferrerOf } from "@/hooks/rune/use-community";
import { useTutorialStore } from "@/lib/tutorial-store";
import { NODE_META, type NodeId } from "@/lib/thirdweb/contracts";
import { useShowZh, useT, type Language } from "@/contexts/language-context";

/** Compact per-locale string map — same convention as recruit.tsx. */
type LocaleMap = Partial<Record<Language, string>>;

// ─── Tutorial step state ────────────────────────────────────────────────────
// 0: entry — bind referrer modal can open here (connect+bind are one action)
// 1: connected + bound — purchase node modal open
// 2: purchased — redirecting to /dashboard
type TStep = 0 | 1 | 2;

// ─── Mock node configs (no on-chain read needed in tutorial) ────────────────
interface MockConfig {
  nodeId: NodeId;
  payAmount: bigint;
  maxLimit: bigint;
  curNum: bigint;
  directRate: bigint;
}

const TUTORIAL_CONFIGS: MockConfig[] = [
  { nodeId: 501, payAmount: 1000n * 10n ** 18n, maxLimit: 1000n, curNum: 234n, directRate: 500n },
  { nodeId: 401, payAmount: 2500n * 10n ** 18n, maxLimit:  800n, curNum: 156n, directRate: 800n },
  { nodeId: 301, payAmount: 5000n * 10n ** 18n, maxLimit:  400n, curNum:  89n, directRate: 1000n },
  { nodeId: 201, payAmount:10000n * 10n ** 18n, maxLimit:  200n, curNum:  47n, directRate: 1200n },
  { nodeId: 101, payAmount:50000n * 10n ** 18n, maxLimit:   20n, curNum:   8n, directRate: 1500n },
];

function fmt18(raw: bigint): string {
  return (raw / 10n ** 18n).toLocaleString("en-US");
}

// ─── Visual look-up tables (same as recruit.tsx) ───────────────────────────
const NODE_BG: Record<string, string> = {
  initial:  "from-slate-900/70 to-slate-800/20 border-slate-600/40",
  mid:      "from-blue-950/70 to-blue-900/20 border-blue-700/40",
  advanced: "from-green-950/70 to-green-900/20 border-green-700/40",
  super:    "from-amber-950/70 to-amber-900/20 border-amber-700/40",
  founder:  "from-purple-950/70 to-purple-900/20 border-purple-700/40",
};
const NODE_ACCENT: Record<string, string> = {
  initial: "text-slate-300", mid: "text-blue-400",
  advanced: "text-green-400", super: "text-amber-400", founder: "text-purple-400",
};
const NODE_BADGE: Record<string, string> = {
  initial:  "bg-slate-800/60 text-slate-200 border-slate-600/40",
  mid:      "bg-blue-900/50 text-blue-300 border-blue-700/40",
  advanced: "bg-green-900/50 text-green-300 border-green-700/40",
  super:    "bg-amber-900/50 text-amber-300 border-amber-700/40",
  founder:  "bg-purple-900/50 text-purple-300 border-purple-700/40",
};
const NODE_BTN: Record<string, string> = {
  initial:  "bg-slate-600 hover:bg-slate-500 text-white",
  mid:      "bg-blue-600 hover:bg-blue-500 text-white",
  advanced: "bg-green-600 hover:bg-green-500 text-white",
  super:    "bg-amber-600 hover:bg-amber-500 text-white",
  founder:  "bg-purple-600 hover:bg-purple-500 text-white",
};
const NODE_GLOW: Record<string, string> = {
  initial:  "shadow-[0_0_40px_rgba(148,163,184,0.12)]",
  mid:      "shadow-[0_0_40px_rgba(59,130,246,0.15)]",
  advanced: "shadow-[0_0_40px_rgba(34,197,94,0.15)]",
  super:    "shadow-[0_0_40px_rgba(251,191,36,0.15)]",
  founder:  "shadow-[0_0_40px_rgba(168,85,247,0.15)]",
};
const NODE_PROGRESS_BAR: Record<string, string> = {
  initial: "[&>div]:bg-slate-400", mid: "[&>div]:bg-blue-500",
  advanced: "[&>div]:bg-green-500", super: "[&>div]:bg-amber-500",
  founder: "[&>div]:bg-purple-500",
};

const TIER_ORDER: readonly NodeId[] = [501, 401, 301, 201, 101] as const;

const TIER_STATIC: Record<NodeId, { privatePrice: number; dailyUsdt: number; airdropPerSeat: number; seats: number }> = {
  101: { privatePrice: 0.016, dailyUsdt: 234,  airdropPerSeat: 75000, seats:   20 },
  201: { privatePrice: 0.020, dailyUsdt: 46.8, airdropPerSeat: 13000, seats:  200 },
  301: { privatePrice: 0.024, dailyUsdt: 23.4, airdropPerSeat:  6250, seats:  400 },
  401: { privatePrice: 0.026, dailyUsdt: 11.7, airdropPerSeat:  3000, seats:  800 },
  501: { privatePrice: 0.028, dailyUsdt:  4.7, airdropPerSeat:  1000, seats: 1000 },
};

interface FaqItem { q: LocaleMap; a: LocaleMap }
const FAQ_ITEMS: FaqItem[] = [
  {
    q: {
      en: "How are node funds used?", zh: "节点购买资金如何使用？", "zh-TW": "節點購買資金如何使用？",
      ja: "ノード購入資金はどのように使われますか？", ko: "노드 구매 자금은 어떻게 사용되나요?",
      th: "เงินทุนจากการซื้อโหนดถูกนำไปใช้อย่างไร?", vi: "Quỹ từ việc mua node được sử dụng thế nào?",
    },
    a: {
      en: "Funds are allocated: 40% to TLP liquidity pool, 25% operations, 25% treasury, and 10% sub-token LP — all verifiable on-chain.",
      zh: "募集资金按比例分配至 TLP 流动池（40%）、运营资金（25%）、国库储备（25%）及子TOKEN LP（10%），全程链上透明可查。",
      "zh-TW": "募集資金按比例分配至 TLP 流動池（40%）、營運資金（25%）、國庫儲備（25%）及子TOKEN LP（10%），全程鏈上透明可查。",
      ja: "資金配分：TLP プール 40%、運営 25%、トレジャリー 25%、サブトークン LP 10%。すべてオンチェーンで検証可能。",
      ko: "자금 배분: TLP 풀 40%, 운영 25%, 국고 25%, 서브토큰 LP 10% — 모두 온체인에서 검증 가능.",
      th: "การจัดสรร: TLP pool 40%, ปฏิบัติการ 25%, คลัง 25%, sub-token LP 10% ตรวจสอบบนเชนได้",
      vi: "Phân bổ: 40% TLP pool, 25% vận hành, 25% kho bạc, 10% sub-token LP — đều xác minh on-chain.",
    },
  },
  {
    q: {
      en: "How is daily USDT income settled?", zh: "每日 USDT 收益如何结算？", "zh-TW": "每日 USDT 收益如何結算？",
      ja: "毎日の USDT 収益はどのように決済されますか？", ko: "일일 USDT 수익은 어떻게 정산되나요?",
      th: "รายได้ USDT รายวันถูกชำระอย่างไร?", vi: "Thu nhập USDT hàng ngày được thanh toán thế nào?",
    },
    a: {
      en: "Settled automatically to your bound address every day at UTC 00:00 based on your node tier — no manual claim required.",
      zh: "每日 UTC 00:00 按持仓节点等级自动结算至绑定地址，无需手动领取。",
      "zh-TW": "每日 UTC 00:00 依持有節點等級自動結算至綁定地址，無需手動領取。",
      ja: "毎日 UTC 00:00 にノード等級に応じてバインド済みアドレスへ自動決済 — 手動請求不要。",
      ko: "매일 UTC 00:00 노드 등급에 따라 바인딩된 주소로 자동 정산 — 수동 청구 불필요.",
      th: "ชำระอัตโนมัติเข้าที่อยู่ที่ผูกไว้ทุกวันเวลา UTC 00:00 ตามระดับโหนด — ไม่ต้องเคลม",
      vi: "Tự động thanh toán mỗi ngày 00:00 UTC vào địa chỉ đã liên kết theo cấp node — không cần claim thủ công.",
    },
  },
  {
    q: {
      en: "When are sub-token airdrops distributed?", zh: "子TOKEN空投何时发放？", "zh-TW": "子TOKEN空投何時發放？",
      ja: "サブトークン エアドロップはいつ配布されますか？", ko: "서브토큰 에어드롭은 언제 배포되나요?",
      th: "Sub-token airdrop จะแจกจ่ายเมื่อใด?", vi: "Khi nào sub-token airdrop được phát?",
    },
    a: {
      en: "First airdrop within 30 days of mainnet launch, with quarterly supplements.",
      zh: "主网上线后 30 天内完成首次空投，后续按季度补发。",
      "zh-TW": "主網上線後 30 天內完成首次空投，後續按季度補發。",
      ja: "メインネット稼働後 30 日以内に初回エアドロップ、以降は四半期ごとに追加配布。",
      ko: "메인넷 가동 후 30일 이내 첫 에어드롭, 이후 분기별 보충.",
      th: "Airdrop รอบแรกภายใน 30 วันหลังเปิดเมนเน็ต และทยอยเพิ่มทุกไตรมาส",
      vi: "Đợt airdrop đầu trong 30 ngày sau khi mainnet ra mắt, bổ sung hàng quý.",
    },
  },
];

// ─── Tutorial Guide Card ────────────────────────────────────────────────────
// Only 2 guide steps — connect+bind happen BEFORE guide card appears
interface GuideStep { title: LocaleMap; desc: LocaleMap; icon: typeof Coins; color: string }
const GUIDE_STEPS: GuideStep[] = [
  {
    title: {
      en: "Purchase Node", zh: "选择并购买节点", "zh-TW": "選擇並購買節點",
      ja: "ノードを選んで購入", ko: "노드 선택 및 구매", th: "เลือกและซื้อโหนด", vi: "Chọn và mua node",
    },
    desc: {
      en: "Referrer bound. Now choose a node tier, approve USDT, and confirm. Your node activates on-chain instantly.",
      zh: "推荐关系已绑定。选择节点等级，授权 USDT 并确认支付，节点在链上立即激活。",
      "zh-TW": "推薦關係已綁定。選擇節點等級，授權 USDT 並確認支付，節點在鏈上立即啟動。",
      ja: "リファラーは登録済み。等級を選び USDT を承認・確定すると、ノードがオンチェーンで即時有効化されます。",
      ko: "리퍼러 바인딩 완료. 등급을 선택하고 USDT를 승인/확정하면 노드가 즉시 활성화됩니다.",
      th: "ผูกผู้แนะนำเรียบร้อย เลือกระดับโหนด อนุมัติ USDT และยืนยัน — โหนดจะเปิดใช้บนเชนทันที",
      vi: "Đã liên kết người giới thiệu. Chọn cấp, approve USDT và xác nhận — node kích hoạt on-chain ngay.",
    },
    icon: Coins,
    color: "emerald",
  },
  {
    title: {
      en: "All Done — Entering Dashboard",
      zh: "完成 · 正在进入数据面板",
      "zh-TW": "完成 · 正在進入資料面板",
      ja: "完了 · ダッシュボードへ移動中",
      ko: "완료 · 대시보드로 이동 중",
      th: "เสร็จสิ้น · กำลังเข้าสู่ Dashboard",
      vi: "Hoàn tất · Đang vào Dashboard",
    },
    desc: {
      en: "Node purchased successfully. Loading your dashboard with simulated on-chain data.",
      zh: "节点购买成功，正在加载模拟链上数据面板。",
      "zh-TW": "節點購買成功，正在載入模擬鏈上數據面板。",
      ja: "ノード購入成功。シミュレートされたオンチェーン データのダッシュボードを読み込み中。",
      ko: "노드 구매 완료. 시뮬레이션된 온체인 데이터 대시보드를 불러오는 중.",
      th: "ซื้อโหนดสำเร็จ กำลังโหลด Dashboard พร้อมข้อมูลจำลองบนเชน",
      vi: "Mua node thành công. Đang tải Dashboard với dữ liệu on-chain mô phỏng.",
    },
    icon: TrendingUp,
    color: "cyan",
  },
];

interface GuideCardProps {
  step: TStep;
  realAddress?: string;
  connectedAddr: string;
  buyOpen: boolean;
  onConnect: (addr?: string) => void;
  onBuyNow: () => void;
  onExit: () => void;
}

function GuideCard({ step, realAddress, connectedAddr, buyOpen, onConnect, onBuyNow, onExit }: GuideCardProps) {
  const showZh = useShowZh();
  const tt = useT();
  // step 1 → guideIdx 0 (Purchase Node), step 2 → guideIdx 1 (Done)
  const guideIdx = Math.min(step - 1, 1);
  const guide = GUIDE_STEPS[guideIdx];
  const Icon = guide.icon;

  const colorMap = {
    cyan:    { border: "border-cyan-500/40",    bg: "bg-cyan-500/8",    icon: "bg-cyan-500/15 border-cyan-500/30 text-cyan-400",   text: "text-cyan-300",   dot: "bg-cyan-400",   dotInactive: "bg-cyan-900" },
    amber:   { border: "border-amber-500/40",   bg: "bg-amber-500/8",   icon: "bg-amber-500/15 border-amber-500/30 text-amber-400", text: "text-amber-300",  dot: "bg-amber-400",  dotInactive: "bg-amber-900" },
    emerald: { border: "border-emerald-500/40", bg: "bg-emerald-500/8", icon: "bg-emerald-500/15 border-emerald-500/30 text-emerald-400", text: "text-emerald-300", dot: "bg-emerald-400", dotInactive: "bg-emerald-900" },
  } as const;
  const c = colorMap[guide.color as keyof typeof colorMap];

  return (
    <motion.div
      key={step}
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`rounded-2xl border ${c.border} ${c.bg} p-3 sm:p-4 md:p-5`}
    >
      <div className="flex items-start gap-3 sm:gap-4">
        {/* Icon */}
        <div className={`mt-0.5 w-8 h-8 sm:w-9 sm:h-9 rounded-xl border flex items-center justify-center shrink-0 ${c.icon}`}>
          <Icon className="h-4 w-4" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5 sm:mb-1">
            <span className={`text-[11px] sm:text-[11px] font-bold uppercase tracking-[0.2em] ${c.text}`}>
              {tt({ zh: "教学模式 · Tutorial", "zh-TW": "教學模式 · Tutorial", en: "Tutorial Mode", ja: "チュートリアル", ko: "튜토리얼", th: "ทูตอเรียล", vi: "Hướng dẫn" })}
            </span>
            {/* Step dots */}
            <div className="flex items-center gap-1 ml-1">
              {[0, 1].map((i) => (
                <span
                  key={i}
                  className={`inline-block w-1.5 h-1.5 rounded-full transition-colors ${
                    i <= guideIdx ? c.dot : c.dotInactive
                  }`}
                />
              ))}
            </div>
            <span className={`text-[11px] ${c.text} opacity-60`}>{guideIdx + 1} / 2</span>
          </div>

          <p className="text-xs sm:text-sm font-semibold text-foreground mb-0.5">
            {tt(guide.title)}
          </p>
          <p className="text-[11px] sm:text-xs text-muted-foreground leading-relaxed">
            {tt(guide.desc)}
          </p>
        </div>

        {/* Action / exit */}
        <div className="flex items-center gap-2 shrink-0">
          {step === 2 && (
            <div className="flex items-center gap-1.5 text-xs text-cyan-300">
              <Loader2 className="h-3 w-3 animate-spin" />
              {tt({ zh: "跳转中...", "zh-TW": "跳轉中...", en: "Redirecting...", ja: "移動中…", ko: "이동 중…", th: "กำลังเปลี่ยนหน้า…", vi: "Đang chuyển hướng…" })}
            </div>
          )}
          <button
            type="button"
            onClick={onExit}
            className="w-7 h-7 rounded-lg border border-white/10 flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-white/20 transition-colors"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Wallet address strip after connect */}
      {step >= 1 && connectedAddr && (
        <div className="mt-3 pt-3 border-t border-white/5 flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-[11px] text-emerald-300 font-mono">
            {connectedAddr.slice(0, 6)}…{connectedAddr.slice(-6)}
          </span>
          <span className="text-[11px] text-muted-foreground/50 ml-1">
            {tt({ zh: "· 钱包已连接", "zh-TW": "· 錢包已連接", en: "· Wallet connected", ja: "· ウォレット接続済", ko: "· 지갑 연결됨", th: "· เชื่อมกระเป๋าแล้ว", vi: "· Ví đã kết nối" })}
          </span>
        </div>
      )}

      {/* Re-trigger purchase button — shown when user dismissed the modal with "Later" */}
      {step === 1 && !buyOpen && (
        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="mt-3 pt-3 border-t border-white/5 flex items-center justify-between gap-3"
        >
          <span className="text-[11px] text-amber-200/60">
            {tt({ zh: "随时可以开始购买节点", "zh-TW": "隨時可以開始購買節點", en: "You can purchase a node whenever you're ready", ja: "いつでもノードを購入できます", ko: "언제든지 노드를 구매할 수 있어요", th: "ซื้อโหนดได้เมื่อพร้อม", vi: "Bạn có thể mua node bất cứ lúc nào" })}
          </span>
          <Button
            size="sm"
            onClick={onBuyNow}
            className="h-7 px-3 text-[11px] font-semibold bg-amber-500 hover:bg-amber-400 text-black gap-1.5 shrink-0"
          >
            <Coins className="h-3 w-3" />
            {tt({ zh: "立即购买", "zh-TW": "立即購買", en: "Buy Now", ja: "今すぐ購入", ko: "지금 구매", th: "ซื้อเลย", vi: "Mua ngay" })}
          </Button>
        </motion.div>
      )}
    </motion.div>
  );
}

// ─── Tutorial Bind Referrer Modal ────────────────────────────────────────────
type BindTxState = "idle" | "checking" | "ok" | "submitting" | "confirmed";

interface TutorialBindModalProps {
  open: boolean;
  onClose: () => void;
  onBound: () => void;
}

function TutorialBindModal({ open, onClose, onBound }: TutorialBindModalProps) {
  const tt = useT();
  const [input, setInput] = useState("0x0000000000000000000000000000000000000001");
  const [txState, setTxState] = useState<BindTxState>("idle");

  useEffect(() => {
    if (!open) { setTxState("idle"); return; }
    // Auto-run the pre-check simulation when the modal opens
    const t = setTimeout(() => setTxState("ok"), 600);
    return () => clearTimeout(t);
  }, [open]);

  async function handleBind() {
    setTxState("submitting");
    await new Promise((r) => setTimeout(r, 1400));
    setTxState("confirmed");
    await new Promise((r) => setTimeout(r, 800));
    onBound();
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v && txState !== "submitting") onClose(); }}>
      <DialogContent className="bg-[#080f1e] border border-amber-700/30 max-w-md">
        <DialogHeader>
          <div className="inline-flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center">
              <UserPlus className="h-4 w-4 text-amber-400" />
            </div>
            <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-amber-400">
              {tt({ zh: "步骤 2 / 3 · 绑定推荐关系", "zh-TW": "步驟 2 / 3 · 綁定推薦關係", en: "Step 2 / 3 · Bind Referrer", ja: "ステップ 2 / 3 · リファラー登録", ko: "2 / 3 단계 · 리퍼러 바인딩", th: "ขั้นที่ 2 / 3 · ผูกผู้แนะนำ", vi: "Bước 2 / 3 · Liên kết giới thiệu" })}
            </span>
          </div>
          <DialogTitle className="text-xl font-bold">
            {tt({ zh: "绑定推荐人", "zh-TW": "綁定推薦人", en: "Bind Referrer", ja: "リファラーを登録", ko: "리퍼러 바인딩", th: "ผูกผู้แนะนำ", vi: "Liên kết người giới thiệu" })}
          </DialogTitle>
          <DialogDescription className="text-muted-foreground text-sm">
            {tt({
              zh: "每个钱包只能绑定一次。绑定成功后即可购买节点。",
              "zh-TW": "每個錢包只能綁定一次。綁定成功後即可購買節點。",
              en: "Each wallet binds exactly once. After binding you can purchase a node.",
              ja: "各ウォレットは一度だけ登録できます。登録後にノードを購入できます。",
              ko: "지갑당 한 번만 바인딩됩니다. 바인딩 후 노드를 구매할 수 있습니다.",
              th: "แต่ละกระเป๋าผูกได้ครั้งเดียว หลังจากนั้นจึงซื้อโหนดได้",
              vi: "Mỗi ví chỉ liên kết một lần. Sau khi liên kết bạn có thể mua node.",
            })}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          {/* Tutorial hint */}
          <div className="flex items-center gap-2 rounded-lg border border-cyan-500/25 bg-cyan-500/8 px-3 py-2">
            <BookOpen className="h-3.5 w-3.5 text-cyan-400 shrink-0" />
            <span className="text-[11px] text-cyan-300">
              {tt({
                zh: "教学模式：已预填 ROOT 地址，可直接点击「链上绑定」",
                "zh-TW": "教學模式：已預填 ROOT 地址，可直接點擊「鏈上綁定」",
                en: "Tutorial: ROOT address pre-filled — click 'Bind On-chain' to proceed",
                ja: "チュートリアル：ROOT アドレスを入力済み — 「オンチェーン登録」をクリックして進めてください",
                ko: "튜토리얼: ROOT 주소가 미리 입력됨 — '온체인 바인딩'을 눌러 진행하세요",
                th: "ทูตอเรียล: เติม ROOT ไว้แล้ว — คลิก 'ผูกบนเชน' เพื่อดำเนินการ",
                vi: "Hướng dẫn: Đã điền sẵn ROOT — bấm 'Liên kết on-chain' để tiếp tục",
              })}
            </span>
          </div>

          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">
              {tt({ zh: "推荐人钱包地址", "zh-TW": "推薦人錢包地址", en: "Referrer Wallet Address", ja: "リファラー ウォレット アドレス", ko: "리퍼러 지갑 주소", th: "ที่อยู่ผู้แนะนำ", vi: "Địa chỉ ví người giới thiệu" })}
            </Label>
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={txState === "submitting" || txState === "confirmed"}
              className="font-mono text-sm bg-background/60"
              placeholder="0x…"
            />

            <AnimatePresence mode="wait">
              {txState === "checking" && (
                <motion.p key="checking" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  {tt({ zh: "校验推荐人...", "zh-TW": "驗證推薦人...", en: "Validating referrer…", ja: "リファラーを検証中…", ko: "리퍼러 검증 중…", th: "กำลังตรวจสอบผู้แนะนำ…", vi: "Đang xác thực người giới thiệu…" })}
                </motion.p>
              )}
              {txState === "ok" && (
                <motion.p key="ok" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="text-[11px] text-emerald-300 flex items-center gap-1.5">
                  <ShieldCheck className="h-3 w-3" />
                  {tt({
                    zh: "已验证 · 推荐人有效（ROOT）",
                    "zh-TW": "已驗證 · 推薦人有效（ROOT）",
                    en: "Validated · Referrer is ROOT (network origin)",
                    ja: "検証済 · リファラーは ROOT（ネットワーク基点）",
                    ko: "검증 완료 · 리퍼러는 ROOT (네트워크 기점)",
                    th: "ตรวจสอบแล้ว · ผู้แนะนำคือ ROOT (ต้นทางเครือข่าย)",
                    vi: "Đã xác thực · Người giới thiệu là ROOT (gốc mạng)",
                  })}
                </motion.p>
              )}
              {txState === "submitting" && (
                <motion.p key="submitting" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="text-[11px] text-amber-300 flex items-center gap-1.5">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  {tt({ zh: "模拟链上提交中...", "zh-TW": "模擬鏈上提交中...", en: "Simulating on-chain submission…", ja: "オンチェーン送信を模擬中…", ko: "온체인 제출 시뮬레이션 중…", th: "กำลังจำลองการส่งบนเชน…", vi: "Đang mô phỏng gửi on-chain…" })}
                </motion.p>
              )}
              {txState === "confirmed" && (
                <motion.p key="confirmed" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="text-[11px] text-emerald-300 flex items-center gap-1.5">
                  <CheckCircle2 className="h-3 w-3" />
                  {tt({ zh: "交易已确认 · 绑定成功！", "zh-TW": "交易已確認 · 綁定成功！", en: "Transaction confirmed · Bound successfully!", ja: "トランザクション確定 · 登録成功！", ko: "트랜잭션 확정 · 바인딩 성공!", th: "ธุรกรรมยืนยันแล้ว · ผูกสำเร็จ!", vi: "Giao dịch đã xác nhận · Liên kết thành công!" })}
                </motion.p>
              )}
            </AnimatePresence>
          </div>

          <div className="flex gap-2 pt-1">
            <Button
              variant="ghost"
              onClick={onClose}
              disabled={txState === "submitting" || txState === "confirmed"}
              className="flex-1"
            >
              {tt({ zh: "稍后", "zh-TW": "稍後", en: "Later", ja: "あとで", ko: "나중에", th: "ภายหลัง", vi: "Để sau" })}
            </Button>
            <Button
              className="flex-1 font-semibold"
              disabled={txState === "submitting" || txState === "confirmed" || txState === "idle" || txState === "checking"}
              onClick={handleBind}
            >
              {txState === "submitting" || txState === "confirmed"
                ? <Loader2 className="h-4 w-4 animate-spin" />
                : tt({ zh: "链上绑定（模拟）", "zh-TW": "鏈上綁定（模擬）", en: "Bind On-chain (simulated)", ja: "オンチェーン登録（模擬）", ko: "온체인 바인딩 (시뮬레이션)", th: "ผูกบนเชน (จำลอง)", vi: "Liên kết on-chain (mô phỏng)" })}
            </Button>
          </div>

          <p className="text-[11px] text-muted-foreground/50 text-center">
            {tt({
              zh: "真实操作会消耗少量 BNB 作为 Gas 费",
              "zh-TW": "真實操作會消耗少量 BNB 作為 Gas 費",
              en: "Real usage consumes a small amount of BNB as gas fee",
              ja: "実運用ではガス代として少量の BNB を消費します",
              ko: "실제 사용 시 가스비로 소량의 BNB를 소모합니다",
              th: "การใช้งานจริงจะเสีย BNB เล็กน้อยเป็นค่าแก๊ส",
              vi: "Khi dùng thật sẽ tốn một lượng nhỏ BNB làm phí gas",
            })}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Tutorial Purchase Node Modal ────────────────────────────────────────────
type BuyTxState = "select" | "approving" | "buying" | "done";

const LEVEL_NUM: Record<string, number> = { initial: 1, mid: 2, advanced: 3, super: 4, founder: 5 };

interface TutorialPurchaseModalProps {
  open: boolean;
  preSelectedNodeId?: NodeId | null;
  onClose: () => void;
  onPurchased: (nodeId: NodeId) => void;
}

function TutorialPurchaseModal({ open, preSelectedNodeId, onClose, onPurchased }: TutorialPurchaseModalProps) {
  const tt = useT();
  const [selected, setSelected] = useState<NodeId | null>(preSelectedNodeId ?? null);
  const [txState, setTxState] = useState<BuyTxState>("select");

  useEffect(() => {
    if (open) { setSelected(preSelectedNodeId ?? null); setTxState("select"); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  async function handleBuy() {
    if (!selected) return;
    setTxState("approving");
    await new Promise((r) => setTimeout(r, 1600));
    setTxState("buying");
    await new Promise((r) => setTimeout(r, 1800));
    setTxState("done");
    await new Promise((r) => setTimeout(r, 700));
    onPurchased(selected);
  }

  const busy = txState === "approving" || txState === "buying";

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v && !busy) onClose(); }}>
      <DialogContent className="bg-[#07101f] border border-white/10 max-w-md max-h-[88dvh] overflow-y-auto p-0 gap-0 overflow-hidden">

        {/* ── Header ── */}
        <div className="relative px-5 pt-5 pb-4 border-b border-white/[0.07]">
          <div className="absolute inset-0 bg-gradient-to-br from-amber-500/[0.06] via-transparent to-transparent pointer-events-none" />
          <div className="flex items-center gap-2 mb-3">
            <div className="relative flex items-center justify-center w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/30 shrink-0">
              <Coins className="h-4 w-4 text-amber-400" />
              <div className="absolute inset-0 rounded-xl shadow-[0_0_14px_rgba(245,158,11,0.35)]" />
            </div>
            <div className="flex flex-col">
              <span className="text-[11px] font-semibold uppercase tracking-[0.25em] text-amber-400/70">
                {tt({ zh: "步骤 3 / 3", "zh-TW": "步驟 3 / 3", en: "Step 3 / 3", ja: "ステップ 3 / 3", ko: "3 / 3 단계", th: "ขั้นที่ 3 / 3", vi: "Bước 3 / 3" })}
              </span>
              <DialogTitle className="text-base font-bold leading-tight text-white">
                {tt({ zh: "选择节点等级", "zh-TW": "選擇節點等級", en: "Select Node Tier", ja: "ノード等級を選択", ko: "노드 등급 선택", th: "เลือกระดับโหนด", vi: "Chọn cấp node" })}
              </DialogTitle>
            </div>
            <div className="ml-auto flex items-center gap-1.5 rounded-full border border-cyan-500/25 bg-cyan-500/8 px-2.5 py-1">
              <BookOpen className="h-2.5 w-2.5 text-cyan-400 shrink-0" />
              <span className="text-[11px] font-medium text-cyan-300 whitespace-nowrap">
                {tt({ zh: "教学模式", "zh-TW": "教學模式", en: "Tutorial", ja: "チュートリアル", ko: "튜토리얼", th: "ทูตอเรียล", vi: "Hướng dẫn" })}
              </span>
            </div>
          </div>
          <DialogDescription className="text-[11px] text-muted-foreground/70 leading-snug">
            {tt({
              zh: "选择节点等级后点击购买，系统将模拟完整的链上授权与购买流程。",
              "zh-TW": "選擇節點等級後點擊購買，系統將模擬完整的鏈上授權與購買流程。",
              en: "Select a tier and click purchase — the full on-chain approval & buy flow is simulated.",
              ja: "等級を選択して購入をクリック — 承認と購入のフローを模擬します。",
              ko: "등급을 선택하고 구매 클릭 — 전체 온체인 승인 및 구매 흐름을 시뮬레이션합니다.",
              th: "เลือกระดับแล้วกดซื้อ — ระบบจะจำลองขั้นตอนอนุมัติและซื้อบนเชน",
              vi: "Chọn cấp và bấm mua — quy trình approve & mua on-chain được mô phỏng đầy đủ.",
            })}
          </DialogDescription>
        </div>

        {/* ── Tier list ── */}
        <div className="flex flex-col gap-2 px-4 py-4">
          {[...TUTORIAL_CONFIGS].sort((a, b) => b.nodeId - a.nodeId).map((cfg) => {
            const meta = NODE_META[cfg.nodeId];
            const remaining = Number(cfg.maxLimit - cfg.curNum);
            const totalSeats = Number(cfg.maxLimit);
            const occupiedPct = Math.round(((totalSeats - remaining) / totalSeats) * 100);
            const directPct = Number(cfg.directRate) / 100;
            const isActive = selected === cfg.nodeId;
            const lv = LEVEL_NUM[meta.level] ?? 1;

            return (
              <button
                key={cfg.nodeId}
                type="button"
                disabled={busy || txState === "done"}
                onClick={() => setSelected(cfg.nodeId)}
                className="group relative flex items-center gap-3 rounded-xl border-2 px-3.5 py-3 transition-all duration-150 text-left overflow-hidden cursor-pointer disabled:cursor-not-allowed"
                style={{
                  borderColor: isActive ? `rgb(${meta.rgb})` : "rgba(255,255,255,0.08)",
                  background: isActive ? `rgba(${meta.rgb}, 0.07)` : "rgba(255,255,255,0.02)",
                  boxShadow: isActive ? `0 0 22px rgba(${meta.rgb}, 0.22), inset 0 0 0 1px rgba(${meta.rgb}, 0.12)` : "none",
                }}
              >
                {/* Left accent bar */}
                <span
                  className="absolute left-0 top-0 bottom-0 w-1 rounded-l-xl transition-opacity"
                  style={{ background: `rgb(${meta.rgb})`, opacity: isActive ? 1 : 0.35 }}
                  aria-hidden
                />

                {/* Tier icon */}
                <span
                  className="ml-0.5 h-11 w-11 rounded-xl shrink-0 flex items-center justify-center text-lg font-bold transition-shadow"
                  style={{
                    background: `rgba(${meta.rgb}, 0.14)`,
                    color: `rgb(${meta.rgb})`,
                    border: `1px solid rgba(${meta.rgb}, 0.30)`,
                    boxShadow: isActive ? `0 0 14px rgba(${meta.rgb}, 0.35)` : "none",
                  }}
                >
                  {meta.nameCn.charAt(meta.nameCn.length - 1)}
                </span>

                {/* Info column */}
                <div className="flex-1 min-w-0">
                  {/* Name row */}
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-bold text-white leading-none">{meta.nameCn}</span>
                    <span className={`text-[11px] font-mono uppercase tracking-[0.18em] leading-none ${meta.color}`}>{meta.nameEn}</span>
                    <span className="ml-auto text-[11px] font-mono tracking-wider text-white/25 border border-white/10 rounded px-1 py-0.5 leading-none">
                      LV.{lv}
                    </span>
                  </div>

                  {/* Stats row */}
                  <div className="flex items-center gap-2 text-[11px] mb-1.5">
                    <span className="text-white/40">
                      {tt({ zh: "剩余", "zh-TW": "剩餘", en: "Left", ja: "残り", ko: "남음", th: "เหลือ", vi: "Còn" })}{" "}
                      <span className="text-white/80 font-semibold tabular-nums">{remaining}</span>
                    </span>
                    <span className="text-white/15">|</span>
                    <span className="text-white/40">
                      {tt({ zh: "返佣", "zh-TW": "返佣", en: "Comm.", ja: "報酬", ko: "커미션", th: "คอม", vi: "Hoa hồng" })}{" "}
                      <span className="font-semibold" style={{ color: `rgb(${meta.rgb})` }}>{directPct}%</span>
                    </span>
                  </div>

                  {/* Occupancy bar */}
                  <div className="h-[3px] rounded-full bg-white/[0.06] overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${occupiedPct}%`,
                        background: `rgba(${meta.rgb}, ${isActive ? 0.8 : 0.45})`,
                        transition: "background 0.2s",
                      }}
                    />
                  </div>
                  <div className="text-[11px] text-white/20 mt-0.5 tabular-nums">{occupiedPct}% {tt({ zh: "已售", "zh-TW": "已售", en: "sold", ja: "販売済", ko: "판매됨", th: "ขายแล้ว", vi: "đã bán" })}</div>
                </div>

                {/* Price column */}
                <div className="shrink-0 text-right leading-none pl-1">
                  <div
                    className="text-lg font-bold tabular-nums leading-none"
                    style={{ color: isActive ? `rgb(${meta.rgb})` : "rgba(255,255,255,0.85)" }}
                  >
                    {fmt18(cfg.payAmount)}
                  </div>
                  <div className="text-[11px] text-white/25 mt-1 font-mono uppercase tracking-[0.2em]">USDT</div>
                </div>
              </button>
            );
          })}
        </div>

        {/* ── Status strip ── */}
        <div className="px-4 pb-2">
          <AnimatePresence mode="wait">
            {txState === "approving" && (
              <motion.div key="approving" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
                className="flex items-center gap-2.5 rounded-xl border border-blue-500/25 bg-blue-500/8 px-3.5 py-2.5 text-[11px] text-blue-200">
                <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-400 shrink-0" />
                {tt({ zh: "模拟 USDT 授权中...", "zh-TW": "模擬 USDT 授權中...", en: "Simulating USDT approval…", ja: "USDT 承認を模擬中…", ko: "USDT 승인 시뮬레이션 중…", th: "กำลังจำลองอนุมัติ USDT…", vi: "Đang mô phỏng approve USDT…" })}
              </motion.div>
            )}
            {txState === "buying" && (
              <motion.div key="buying" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
                className="flex items-center gap-2.5 rounded-xl border border-amber-500/25 bg-amber-500/8 px-3.5 py-2.5 text-[11px] text-amber-200">
                <Loader2 className="h-3.5 w-3.5 animate-spin text-amber-400 shrink-0" />
                {tt({ zh: "模拟节点购买交易中...", "zh-TW": "模擬節點購買交易中...", en: "Simulating node purchase…", ja: "ノード購入を模擬中…", ko: "노드 구매 시뮬레이션 중…", th: "กำลังจำลองธุรกรรมซื้อโหนด…", vi: "Đang mô phỏng giao dịch mua node…" })}
              </motion.div>
            )}
            {txState === "done" && (
              <motion.div key="done" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
                className="flex items-center gap-2.5 rounded-xl border border-emerald-500/25 bg-emerald-500/8 px-3.5 py-2.5 text-[11px] text-emerald-300">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                {tt({ zh: "购买成功！节点已激活，正在跳转...", "zh-TW": "購買成功！節點已啟動，正在跳轉...", en: "Purchase confirmed! Node activated — redirecting…", ja: "購入完了！有効化 — 移動中…", ko: "구매 완료! 활성화 — 이동 중…", th: "ซื้อสำเร็จ! เปิดใช้งาน — กำลังเปลี่ยนหน้า…", vi: "Mua thành công! Kích hoạt — đang chuyển…" })}
              </motion.div>
            )}
            {txState === "select" && !selected && (
              <motion.div key="hint" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="flex items-center gap-1.5 text-[11px] text-white/25 px-1">
                <AlertCircle className="h-3 w-3 shrink-0" />
                {tt({ zh: "请先选择一个节点等级", "zh-TW": "請先選擇一個節點等級", en: "Please select a tier first", ja: "等級を選択してください", ko: "등급을 먼저 선택하세요", th: "โปรดเลือกระดับโหนดก่อน", vi: "Vui lòng chọn cấp node trước" })}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ── Action buttons ── */}
        <div className="flex gap-2.5 px-4 pb-5 pt-1">
          <Button
            variant="ghost"
            onClick={onClose}
            disabled={busy || txState === "done"}
            className="flex-[0_0_auto] w-24 h-11 text-sm border border-white/10 hover:bg-white/5 text-white/50 hover:text-white/80"
          >
            {tt({ zh: "稍后", "zh-TW": "稍後", en: "Later", ja: "あとで", ko: "나중에", th: "ภายหลัง", vi: "Để sau" })}
          </Button>
          <Button
            className="flex-1 h-11 font-semibold gap-2 text-sm bg-amber-500 hover:bg-amber-400 text-black shadow-[0_0_20px_rgba(245,158,11,0.35)] disabled:opacity-40 disabled:shadow-none transition-all"
            disabled={!selected || busy || txState === "done"}
            onClick={handleBuy}
          >
            {busy
              ? <Loader2 className="h-4 w-4 animate-spin" />
              : <>
                  <ShieldCheck className="h-4 w-4" />
                  {tt({ zh: "授权并购买", "zh-TW": "授權並購買", en: "Approve & Buy", ja: "承認 & 購入", ko: "승인 & 구매", th: "อนุมัติ & ซื้อ", vi: "Approve & mua" })}
                  <ArrowRight className="h-4 w-4" />
                </>
            }
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Tutorial 3-step visual guide ──────────────────────────────────────────
// Connect+Bind are one step: the community contract checks registration on connect
interface JoinStep { title: LocaleMap; desc: LocaleMap }
const STEPS: JoinStep[] = [
  {
    title: {
      en: "Connect & Bind Referrer", zh: "连接钱包 · 绑定推荐关系", "zh-TW": "連接錢包 · 綁定推薦關係",
      ja: "ウォレット接続 · リファラー登録", ko: "지갑 연결 · 리퍼러 바인딩",
      th: "เชื่อมกระเป๋า · ผูกผู้แนะนำ", vi: "Kết nối ví · Liên kết người giới thiệu",
    },
    desc: {
      en: "Connect your wallet — the contract checks community registration. If unbound, binding is required before you can proceed.",
      zh: "连接钱包时，合约自动检测是否已注册推荐关系。未绑定则需立即完成链上绑定，每个钱包仅需操作一次。",
      "zh-TW": "連接錢包時，合約自動檢測是否已註冊推薦關係。未綁定則需立即完成鏈上綁定，每個錢包僅需操作一次。",
      ja: "ウォレット接続時に契約が登録状況を確認。未登録なら即時オンチェーン登録が必要です（各ウォレット 1 回のみ）。",
      ko: "지갑 연결 시 컨트랙트가 등록 여부를 확인합니다. 미등록이면 즉시 온체인 바인딩이 필요하며, 지갑당 1회만 하면 됩니다.",
      th: "เมื่อเชื่อมกระเป๋า สัญญาจะตรวจสอบการลงทะเบียน หากยังไม่ผูก ต้องผูกบนเชนทันที (แต่ละกระเป๋าทำครั้งเดียว)",
      vi: "Khi kết nối ví, hợp đồng kiểm tra đăng ký cộng đồng. Nếu chưa liên kết, phải hoàn tất ngay (mỗi ví chỉ một lần).",
    },
  },
  {
    title: {
      en: "Choose Node", zh: "选择节点", "zh-TW": "選擇節點",
      ja: "ノード選択", ko: "노드 선택", th: "เลือกโหนด", vi: "Chọn node",
    },
    desc: {
      en: "Pick the tier that matches your stake — L1 to L5",
      zh: "按投资规模选择节点等级（L1–L5）",
      "zh-TW": "依投資規模選擇節點等級（L1–L5）",
      ja: "投資規模に合わせてノード等級を選択（L1–L5）",
      ko: "투자 규모에 맞는 노드 등급 선택 (L1–L5)",
      th: "เลือกระดับโหนดตามขนาดการลงทุน (L1–L5)",
      vi: "Chọn cấp node phù hợp khoản đầu tư — L1 đến L5",
    },
  },
  {
    title: {
      en: "Pay & Activate", zh: "支付激活", "zh-TW": "支付啟動",
      ja: "支払いと有効化", ko: "결제 및 활성화", th: "ชำระและเปิดใช้งาน", vi: "Thanh toán & kích hoạt",
    },
    desc: {
      en: "Approve USDT and pay; the node activates on contract confirm",
      zh: "授权并支付 USDT，合约确认后节点即时激活",
      "zh-TW": "授權並支付 USDT，合約確認後節點即時啟動",
      ja: "USDT を承認して支払うと、契約確定後にノードが即時有効化",
      ko: "USDT 승인 후 결제하면 컨트랙트 확정 즉시 노드 활성화",
      th: "อนุมัติและชำระ USDT โหนดจะเปิดใช้งานทันทีเมื่อสัญญายืนยัน",
      vi: "Approve và thanh toán USDT; node được kích hoạt ngay khi hợp đồng xác nhận",
    },
  },
];

// ─── Main Tutorial Page ─────────────────────────────────────────────────────
export default function Tutorial() {
  const showZh = useShowZh();
  const tt = useT();
  const { enterDemo } = useDemoStore();
  const [, navigate] = useLocation();
  const account = useActiveAccount();
  const { isBound, isLoading: boundLoading } = useReferrerOf(account?.address);
  const [step, setStep] = useState<TStep>(0);
  const [walletAddress, setWalletAddress] = useState<string>(DEMO_ADDRESS);
  const [isChecking, setIsChecking] = useState(false);
  const [bindOpen, setBindOpen] = useState(false);
  const [buyOpen, setBuyOpen] = useState(false);
  const [preSelectedBuyNode, setPreSelectedBuyNode] = useState<NodeId | null>(null);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  // "connect" → spotlight on connect button (no wallet)
  // "purchase" → spotlight on purchase button (wallet connected but not yet bound)
  // null → no spotlight (modal open or step > 0)
  const [spotlight, setSpotlight] = useState<"connect" | "purchase" | null>(null);
  const setConnectSpotlight = useTutorialStore((s) => s.setConnectSpotlight);

  // Track the previous real wallet address so we can detect disconnection.
  const prevAddressRef = useRef<string | undefined>(account?.address);

  // If the real wallet disconnects mid-tutorial, fully reset to step 0
  // so the UI returns to the "connect wallet" entry state.
  useEffect(() => {
    const prev = prevAddressRef.current;
    prevAddressRef.current = account?.address;
    // prev was a real address, now it's gone → user disconnected
    if (prev !== undefined && account?.address === undefined) {
      setStep(0);
      setWalletAddress(DEMO_ADDRESS);
      setBindOpen(false);
      setBuyOpen(false);
      setPreSelectedBuyNode(null);
    }
  }, [account?.address]);

  // Auto-skip step 0 when wallet is already connected AND already registered.
  useEffect(() => {
    if (step !== 0 || bindOpen || buyOpen || boundLoading) return;
    if (account?.address && isBound) {
      setWalletAddress(account.address);
      setStep(1);
      setPreSelectedBuyNode(null);
      setBuyOpen(true);
    }
  }, [account?.address, isBound, boundLoading, step, bindOpen, buyOpen]);

  useEffect(() => {
    if (step === 0 && !bindOpen && !buyOpen) {
      // Only spotlight "connect" or "purchase" when NOT already bound.
      // If already bound, the auto-skip above handles it.
      if (!account?.address) {
        setSpotlight("connect");
      } else if (!isBound && !boundLoading) {
        setSpotlight("purchase");
      } else {
        setSpotlight(null);
      }
    } else {
      setSpotlight(null);
    }
  }, [account?.address, isBound, boundLoading, step, bindOpen, buyOpen]);

  // When the "connect" spotlight is active, highlight the REAL header button
  // and scroll smoothly to the top so it is visible.
  useEffect(() => {
    if (spotlight === "connect") {
      setConnectSpotlight(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      setConnectSpotlight(false);
    }
  }, [spotlight, setConnectSpotlight]);

  // Always clear the header spotlight when leaving the tutorial page.
  useEffect(() => {
    return () => setConnectSpotlight(false);
  }, [setConnectSpotlight]);

  // Simulate: connect → contract checks community registration → not found → bind required
  function handleConnect(addr?: string) {
    setSpotlight(null);
    const resolved = addr ?? DEMO_ADDRESS;
    setWalletAddress(resolved);
    setIsChecking(true);
    setTimeout(() => {
      setIsChecking(false);
      setBindOpen(true);
    }, 1200);
  }

  // Open the purchase modal, optionally pre-selecting a specific node tier.
  function openBuyModal(nodeId: NodeId | null = null) {
    setPreSelectedBuyNode(nodeId);
    setBuyOpen(true);
  }

  // Already-connected wallet: skip bind, go straight to purchase (assumed already bound)
  function handleBuyDirectly() {
    setSpotlight(null);
    setWalletAddress(account!.address);
    setStep(1);
    openBuyModal(null);
  }

  // After bind confirmed → wallet is now fully connected (connected + registered)
  function handleBound() {
    setBindOpen(false);
    setStep(1);
    openBuyModal(null);
  }

  function handlePurchased(nodeId: NodeId) {
    setBuyOpen(false);
    setPreSelectedBuyNode(null);
    setStep(2);
    enterDemo(walletAddress, nodeId);
    setTimeout(() => navigate("/dashboard"), 1500);
  }

  function handleExit() {
    navigate("/recruit");
  }

  const walletConnected = step >= 1;
  const showSpotlight = spotlight !== null && !bindOpen && !buyOpen;

  return (
    <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-10 space-y-8 sm:space-y-14 max-w-6xl">

      {/* ── Full-page spotlight overlay ── */}
      <AnimatePresence>
        {showSpotlight && (
          <motion.div
            key="spotlight-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35 }}
            className="fixed inset-0 z-40 bg-black/72 backdrop-blur-[3px] pointer-events-none"
          />
        )}
      </AnimatePresence>

      {/* ── Step 0: wallet connect entry banner ── */}
      {step === 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          style={{ zIndex: showSpotlight ? 50 : undefined, position: showSpotlight ? "relative" : undefined }}
          className="rounded-2xl border border-cyan-500/30 bg-[#060e1c]/95 backdrop-blur-md px-3 sm:px-4 py-3 sm:py-3.5 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 shadow-[0_0_0_1px_rgba(34,211,238,0.15)]"
        >
          <div className="flex items-center gap-2.5 sm:gap-3 flex-1 min-w-0">
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl border border-cyan-500/30 bg-cyan-500/15 flex items-center justify-center shrink-0">
              <BookOpen className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-cyan-400" />
            </div>
            <div className="min-w-0 flex-1">
              <span className="text-[11px] sm:text-[11px] font-bold uppercase tracking-[0.2em] text-cyan-400 block">
                {tt({ zh: "教学模式 · Tutorial", "zh-TW": "教學模式 · Tutorial", en: "Tutorial Mode", ja: "チュートリアル", ko: "튜토리얼", th: "ทูตอเรียล", vi: "Chế độ hướng dẫn" })}
              </span>
              <span className="text-[11px] sm:text-xs text-muted-foreground leading-snug line-clamp-2 sm:line-clamp-none">
                {isChecking
                  ? tt({ zh: "正在检测...", "zh-TW": "正在檢測...", en: "Checking registration…", ja: "確認中…", ko: "확인 중…", th: "กำลังตรวจสอบ…", vi: "Đang kiểm tra…" })
                  : account?.address
                  ? tt({ zh: "钱包已连接 · 点击进入购买", "zh-TW": "錢包已連接 · 點擊進入購買", en: "Wallet connected — simulate purchase", ja: "接続済 — ノード購入を模擬", ko: "연결됨 — 구매 시뮬레이션", th: "เชื่อมแล้ว — จำลองซื้อโหนด", vi: "Ví kết nối — mô phỏng mua" })
                  : tt({ zh: "连接钱包 · 系统自动检测并引导绑定推荐人", "zh-TW": "連接錢包 · 系統自動檢測並引導綁定", en: "Connect wallet — auto-checks registration & guides binding", ja: "接続 — 登録状況を確認してバインドを案内", ko: "연결 — 등록 확인 후 바인딩 안내", th: "เชื่อมต่อ — ตรวจสอบและแนะนำการผูก", vi: "Kết nối — kiểm tra và hướng dẫn liên kết" })}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {isChecking ? (
              <div className="flex items-center gap-1.5 text-xs text-cyan-300 px-3">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                {tt({ zh: "检测中...", "zh-TW": "檢測中...", en: "Checking...", ja: "確認中…", ko: "확인 중…", th: "กำลังตรวจสอบ…", vi: "Đang kiểm tra…" })}
              </div>
            ) : account?.address ? (
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 text-[11px] text-emerald-300 font-mono border border-emerald-500/30 bg-emerald-500/10 rounded-lg px-2.5 py-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  {account.address.slice(0, 6)}…{account.address.slice(-6)}
                </div>
                {/* Spotlighted purchase button for already-connected wallet */}
                <div className="relative flex flex-col items-center">
                  <Button
                    onClick={handleBuyDirectly}
                    size="sm"
                    className={`h-8 px-3 text-xs font-semibold bg-amber-500 hover:bg-amber-400 text-black gap-1.5 transition-all ${
                      spotlight === "purchase"
                        ? "ring-2 ring-amber-400/90 ring-offset-2 ring-offset-[#060e1c] shadow-[0_0_28px_8px_rgba(251,191,36,0.45)]"
                        : ""
                    }`}
                  >
                    <Coins className="h-3 w-3" />
                    {tt({ zh: "模拟购买节点", "zh-TW": "模擬購買節點", en: "Simulate Purchase", ja: "購入を模擬", ko: "구매 시뮬레이션", th: "จำลองซื้อโหนด", vi: "Mô phỏng mua node" })}
                  </Button>
                  <AnimatePresence>
                    {spotlight === "purchase" && (
                      <motion.span
                        key="hint-purchase"
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: [0, 3, 0] }}
                        exit={{ opacity: 0 }}
                        transition={{ y: { repeat: Infinity, duration: 1.4, ease: "easeInOut" }, opacity: { duration: 0.25 } }}
                        className="absolute top-full mt-2 text-[11px] text-amber-300/90 font-medium whitespace-nowrap pointer-events-none select-none"
                      >
                        ↑ {tt({ zh: "点此进入模拟购买", "zh-TW": "點此進入模擬購買", en: "Click to simulate purchase", ja: "クリックして購入を模擬", ko: "클릭해서 구매 시뮬레이션", th: "คลิกเพื่อจำลองการซื้อ", vi: "Bấm để mô phỏng mua" })}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            ) : (
              /* No wallet — hint points to the REAL header connect button (spotlighted above).
                 The "Simulate" button is a demo fallback for users without a real wallet. */
              <div className="flex items-center gap-2">
                <AnimatePresence>
                  {spotlight === "connect" && (
                    <motion.span
                      key="hint-connect-header"
                      initial={{ opacity: 0, x: 6 }}
                      animate={{ opacity: 1, x: [0, -4, 0] }}
                      exit={{ opacity: 0 }}
                      transition={{ x: { repeat: Infinity, duration: 1.3, ease: "easeInOut" }, opacity: { duration: 0.25 } }}
                      className="text-[11px] text-cyan-300/90 font-medium whitespace-nowrap pointer-events-none select-none"
                    >
                      {tt({ zh: "↗ 点击右上角Connect按钮", "zh-TW": "↗ 點擊右上角Connect按鈕", en: "↗ Click Connect in the top-right", ja: "↗ 右上のConnectをクリック", ko: "↗ 우측 상단 Connect 클릭", th: "↗ คลิก Connect มุมบนขวา", vi: "↗ Bấm Connect góc trên phải" })}
                    </motion.span>
                  )}
                </AnimatePresence>
                <Button
                  onClick={() => handleConnect()}
                  size="sm"
                  variant="outline"
                  className="h-8 px-3 text-xs font-medium border-cyan-700/40 text-cyan-300/70 hover:text-cyan-200 hover:border-cyan-500/50 gap-1.5"
                >
                  <Wallet className="h-3 w-3" />
                  {tt({ zh: "模拟体验", "zh-TW": "模擬體驗", en: "Demo", ja: "デモ", ko: "데모", th: "ทดลอง", vi: "Demo" })}
                </Button>
              </div>
            )}
            <button
              type="button"
              onClick={handleExit}
              className="w-7 h-7 rounded-lg border border-white/10 flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-white/20 transition-colors"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </motion.div>
      )}

      {/* ── Step 1+: full tutorial guide card ── */}
      {step >= 1 && (
        <GuideCard
          step={step}
          realAddress={account?.address}
          connectedAddr={walletAddress}
          buyOpen={buyOpen}
          onConnect={handleConnect}
          onBuyNow={() => openBuyModal(null)}
          onExit={handleExit}
        />
      )}

      {/* ── Hero ── */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55 }}
        className="relative overflow-hidden rounded-2xl border border-border/50 bg-card/40 backdrop-blur-md px-4 py-7 sm:px-6 sm:py-10 md:px-12 md:py-14 shadow-[0_8px_48px_rgba(0,0,0,0.5)] text-center"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-primary/8 via-transparent to-transparent pointer-events-none" />
        <div className="absolute -top-32 -right-32 w-80 h-80 bg-amber-500/10 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute -bottom-20 -left-20 w-60 h-60 bg-blue-500/8 rounded-full blur-[80px] pointer-events-none" />
        <div className="absolute top-3 left-3 w-4 h-4 border-t-2 border-l-2 border-primary/40 rounded-tl pointer-events-none" />
        <div className="absolute top-3 right-3 w-4 h-4 border-t-2 border-r-2 border-primary/40 rounded-tr pointer-events-none" />
        <div className="absolute bottom-3 left-3 w-4 h-4 border-b-2 border-l-2 border-primary/40 rounded-bl pointer-events-none" />
        <div className="absolute bottom-3 right-3 w-4 h-4 border-b-2 border-r-2 border-primary/40 rounded-br pointer-events-none" />

        <div className="relative z-10">
          <div className="inline-flex items-center gap-1.5 sm:gap-2 rounded-full border border-amber-500/30 bg-amber-900/20 px-3 sm:px-4 py-1 sm:py-1.5 mb-4 sm:mb-6">
            <Zap className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-amber-400" />
            <span className="text-[11px] sm:text-[11px] font-semibold uppercase tracking-[0.18em] sm:tracking-[0.2em] text-amber-300 whitespace-nowrap">
              Node Recruitment · Open Now
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl md:text-5xl font-bold tracking-tight text-foreground leading-tight mb-3 sm:mb-4">
            {tt({ zh: "符·节点权柄重铸", "zh-TW": "符·節點權柄重鑄", en: "Node Tier Reforge", ja: "符・ノード権限再構築", ko: "符・노드 권한 재구축", th: "การหลอมระดับโหนด · 符", vi: "Đúc lại Cấp Node · 符" })}
          </h1>
          <p className="text-xs sm:text-base md:text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed mb-1.5 sm:mb-2">
            {tt({ zh: "五级节点体系 · 双TOKEN通缩经济 · 机构级收益结构", "zh-TW": "五級節點體系 · 雙TOKEN通縮經濟 · 機構級收益結構", en: "5-Tier Nodes · Dual-Token Deflation · Institutional Returns", ja: "5 段階ノード · デュアルトークン デフレ · 機関級リターン", ko: "5단계 노드 · 듀얼토큰 디플레이션 · 기관급 수익", th: "5 ระดับโหนด · เศรษฐกิจดีเฟลชันสองเหรียญ · ผลตอบแทนระดับสถาบัน", vi: "Hệ thống 5 cấp · Kinh tế giảm phát hai token · Lợi suất cấp tổ chức" })}
          </p>
          <p className="text-[11px] sm:text-sm text-muted-foreground/60 max-w-xl mx-auto hidden sm:block">
            RUNE Protocol Node Recruitment · Five-Tier System · Dual-Token Deflationary Economy
          </p>
          <div className="mt-6 sm:mt-10 grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 pt-5 sm:pt-8 border-t border-border/30">
            {[
              { label: { en: "Total Seats",   zh: "总席位",     "zh-TW": "總席位",     ja: "総席数",     ko: "총 좌석",   th: "ที่นั่งทั้งหมด", vi: "Tổng số ghế" }, val: "2,420" },
              { label: { en: "Node Tiers",    zh: "节点等级",   "zh-TW": "節點等級",   ja: "ノード等級", ko: "노드 등급", th: "ระดับโหนด",     vi: "Cấp node"     }, val: "5" },
              { label: { en: "Opening Price", zh: "开盘价",     "zh-TW": "開盤價",     ja: "開始価格",   ko: "오픈 가격", th: "ราคาเปิด",      vi: "Giá mở"        }, val: "$0.028" },
              { label: { en: "USDT APY",      zh: "年化收益率", "zh-TW": "年化收益率", ja: "年利",       ko: "연 수익률", th: "APY USDT",      vi: "APY USDT"     }, val: "170.82%", gold: true },
            ].map(({ label, val, gold }) => (
              <div key={label.en} className="space-y-0.5 sm:space-y-1">
                <div className="text-[11px] sm:text-[11px] uppercase tracking-[0.15em] sm:tracking-[0.18em] text-muted-foreground/50 font-medium">{label.en}</div>
                <div className={`text-xl sm:text-2xl md:text-3xl font-bold leading-none ${gold ? "text-amber-400" : "text-foreground"}`}>{val}</div>
                {showZh && <div className="text-[11px] sm:text-[11px] text-muted-foreground/65">{tt(label)}</div>}
              </div>
            ))}
          </div>
        </div>
      </motion.div>

      {/* ── Node cards ── */}
      <section>
        <div className="flex items-center gap-2 mb-6">
          <div className="h-px flex-1 bg-border/30" />
          <h2 className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground/60 px-3">
            {tt({ zh: "节点等级 · Node Tiers", "zh-TW": "節點等級 · Node Tiers", en: "Node Tiers", ja: "ノード等級", ko: "노드 등급", th: "ระดับโหนด · Node Tiers", vi: "Cấp node · Node Tiers" })}
          </h2>
          <div className="h-px flex-1 bg-border/30" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-5">
          {TIER_ORDER.map((nodeId, i) => {
            const meta  = NODE_META[nodeId];
            const stat  = TIER_STATIC[nodeId];
            const cfg   = TUTORIAL_CONFIGS.find((c) => c.nodeId === nodeId)!;
            const level = meta.level;

            const investment    = Number(cfg.payAmount / 10n ** 18n);
            const seats         = Number(cfg.maxLimit);
            const seatsRemaining = Number(cfg.maxLimit - cfg.curNum);
            const directRatePct = Number(cfg.directRate) / 100;
            const occupiedPct   = Math.round(((seats - seatsRemaining) / seats) * 100);

            return (
              <motion.div
                key={nodeId}
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, delay: i * 0.1 }}
                className={`relative flex flex-col rounded-2xl border bg-gradient-to-b p-4 sm:p-5 ${NODE_BG[level]} ${NODE_GLOW[level]}`}
              >
                <div className="flex items-start justify-between mb-3 sm:mb-4">
                  <div>
                    <div className={`text-[11px] sm:text-[11px] font-mono uppercase tracking-[0.2em] mb-0.5 sm:mb-1 ${NODE_ACCENT[level]}`}>
                      {meta.nameEn}
                    </div>
                    <div className="text-base sm:text-xl font-bold text-foreground">{tt({ zh: meta.nameCn, "zh-TW": meta.nameCn, ja: meta.nameCn, ko: meta.nameCn, en: meta.nameEn, th: meta.nameEn, vi: meta.nameEn })}</div>
                  </div>
                  <span className={`text-[11px] sm:text-[11px] font-semibold uppercase tracking-wider border rounded px-1.5 sm:px-2 py-0.5 ${NODE_BADGE[level]}`}>
                    Lv.{i + 1}
                  </span>
                </div>

                <div className="space-y-2 sm:space-y-2.5 flex-1">
                  {[
                    { label: { en: "Investment",        zh: "投资门槛",     "zh-TW": "投資門檻",     ja: "投資額",          ko: "투자 금액",     th: "เงินลงทุน",      vi: "Mức đầu tư"     }, val: `$${investment.toLocaleString()}`,           accent: true },
                    { label: { en: "Private",           zh: "私募价格",     "zh-TW": "私募價格",     ja: "プライベート価格", ko: "프라이빗 가격", th: "ราคาพรีเซล",     vi: "Giá private"     }, val: `$${stat.privatePrice.toFixed(3)}` },
                    { label: { en: "Total Seats",       zh: "席位总量",     "zh-TW": "席位總量",     ja: "総席数",          ko: "총 좌석",       th: "ที่นั่งทั้งหมด",  vi: "Tổng số ghế"   }, val: showZh ? `${seats.toLocaleString()} 席` : `${seats.toLocaleString()}` },
                    { label: { en: "Daily USDT",        zh: "每日USDT收益", "zh-TW": "每日USDT收益", ja: "日次 USDT 収益",  ko: "일 USDT 수익",  th: "USDT ต่อวัน",   vi: "USDT mỗi ngày" }, val: `$${stat.dailyUsdt}`,                       accent: true },
                    { label: { en: "Airdrop",           zh: "子TOKEN空投",  "zh-TW": "子TOKEN空投",  ja: "サブトークン エアドロップ", ko: "서브토큰 에어드롭", th: "Airdrop ลูก", vi: "Airdrop sub"   }, val: `${stat.airdropPerSeat.toLocaleString()} SUB` },
                    { label: { en: "Direct Commission", zh: "直推返佣",     "zh-TW": "直推返佣",     ja: "直推紹介報酬",    ko: "직추천 커미션", th: "คอมมิชชันตรง",   vi: "Hoa hồng trực tiếp" }, val: `${directRatePct}%`,             accent: true },
                  ].map(({ label, val, accent: isAccent }) => (
                    <div key={label.en} className="flex items-center justify-between gap-1">
                      <span className="text-[11px] sm:text-[11px] text-muted-foreground/60">{tt(label)}</span>
                      <span className={`text-xs sm:text-sm font-semibold ${isAccent ? NODE_ACCENT[level] : "text-foreground/90"}`}>{val}</span>
                    </div>
                  ))}
                </div>

                <div className="mt-3 sm:mt-4 space-y-1 sm:space-y-1.5">
                  <div className="flex justify-between text-[11px] sm:text-[11px] text-muted-foreground/50">
                    <span>{tt({ zh: "席位占用 Occupancy", "zh-TW": "席位佔用 Occupancy", en: "Occupancy", ja: "席数充填", ko: "좌석 점유율", th: "อัตราจอง", vi: "Tỷ lệ lấp đầy" })}</span>
                    <span className={NODE_ACCENT[level]}>{occupiedPct}%</span>
                  </div>
                  <Progress value={occupiedPct} className={`h-1 sm:h-1.5 bg-white/5 ${NODE_PROGRESS_BAR[level]}`} />
                  <div className="text-[11px] sm:text-[11px] text-muted-foreground/40 text-right">
                    {tt({
                      zh: `剩余 ${seatsRemaining.toLocaleString()} 席`,
                      "zh-TW": `剩餘 ${seatsRemaining.toLocaleString()} 席`,
                      en: `${seatsRemaining.toLocaleString()} left`,
                      ja: `残り ${seatsRemaining.toLocaleString()} 席`,
                      ko: `${seatsRemaining.toLocaleString()} 좌석 남음`,
                      th: `เหลือ ${seatsRemaining.toLocaleString()} ที่`,
                      vi: `Còn ${seatsRemaining.toLocaleString()} ghế`,
                    })}
                  </div>
                </div>

                {/* CTA — state changes as tutorial progresses */}
                {step >= 2 ? (
                  <Button
                    variant="outline"
                    className="mt-4 w-full h-9 text-sm font-medium border-emerald-700/40 text-emerald-200 cursor-default"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
                    {tt({ zh: "已购买 · 跳转面板中...", "zh-TW": "已購買 · 跳轉面板中...", en: "Purchased · Redirecting…", ja: "購入済 · 移動中…", ko: "구매 완료 · 이동 중…", th: "ซื้อแล้ว · กำลังไป Dashboard…", vi: "Đã mua · Đang chuyển…" })}
                  </Button>
                ) : walletConnected ? (
                  /* Step 1: connected + registered → buy button active, pre-selects this tier */
                  <Button
                    onClick={() => openBuyModal(nodeId)}
                    className={`mt-4 w-full h-9 text-sm font-semibold ${NODE_BTN[level]}`}
                  >
                    <Coins className="h-3.5 w-3.5 mr-1" />
                    {tt({ zh: "立即购买 · Buy Now", "zh-TW": "立即購買 · Buy Now", en: "Buy Now", ja: "今すぐ購入", ko: "지금 구매", th: "ซื้อเลย", vi: "Mua ngay" })}
                  </Button>
                ) : (
                  /* Step 0: not yet connected — click to trigger the connect flow */
                  <button
                    type="button"
                    onClick={() => handleConnect()}
                    className="mt-4 w-full h-9 rounded-lg border border-dashed border-cyan-700/40 bg-cyan-950/10 hover:bg-cyan-950/20 hover:border-cyan-600/50 flex items-center justify-center gap-2 text-[11px] text-cyan-300/60 hover:text-cyan-300/90 transition-colors group"
                  >
                    <Wallet className="h-3 w-3 group-hover:scale-110 transition-transform" />
                    {tt({ zh: "点击连接钱包后解锁", "zh-TW": "點擊連接錢包後解鎖", en: "Connect wallet to unlock", ja: "ウォレット接続で解放", ko: "지갑 연결 후 해제", th: "เชื่อมต่อกระเป๋าเพื่อปลดล็อค", vi: "Kết nối ví để mở khóa" })}
                  </button>
                )}
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="space-y-6">
        <div className="flex items-center gap-2">
          <div className="h-px flex-1 bg-border/30" />
          <h2 className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground/60 px-3">
            {tt({ zh: "操作流程 · How It Works", "zh-TW": "操作流程 · How It Works", en: "How It Works", ja: "操作フロー", ko: "진행 과정", th: "วิธีทำงาน", vi: "Cách hoạt động" })}
          </h2>
          <div className="h-px flex-1 bg-border/30" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {STEPS.map(({ title, desc }, idx) => (
            <motion.div
              key={title.en}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: idx * 0.08 }}
              className={`relative rounded-xl border p-3.5 sm:p-4 space-y-1.5 sm:space-y-2 transition-colors ${
                idx === Math.min(step, 2)
                  ? "border-cyan-500/40 bg-cyan-500/5"
                  : idx < step
                  ? "border-emerald-700/30 bg-emerald-950/10"
                  : "border-border/30 bg-card/20"
              }`}
            >
              <div className="flex items-center gap-2">
                <span className={`w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center text-[11px] sm:text-[11px] font-bold shrink-0 ${
                  idx < step
                    ? "bg-emerald-500/20 text-emerald-300"
                    : idx === Math.min(step, 2)
                    ? "bg-cyan-500/20 text-cyan-300"
                    : "bg-white/5 text-muted-foreground"
                }`}>
                  {idx < step ? "✓" : idx + 1}
                </span>
                <span className={`text-xs sm:text-sm font-semibold ${
                  idx < step ? "text-emerald-200" : idx === Math.min(step, 2) ? "text-cyan-200" : "text-foreground"
                }`}>
                  {tt(title)}
                </span>
              </div>
              <p className="text-[11px] sm:text-[11px] text-muted-foreground/70 leading-relaxed pl-7 sm:pl-8">
                {tt(desc)}
              </p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <div className="h-px flex-1 bg-border/30" />
          <h2 className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground/60 px-3">
            {tt({ zh: "常见问题 · FAQ", "zh-TW": "常見問題 · FAQ", en: "FAQ", ja: "よくある質問", ko: "자주 묻는 질문", th: "คำถามที่พบบ่อย", vi: "Câu hỏi thường gặp" })}
          </h2>
          <div className="h-px flex-1 bg-border/30" />
        </div>
        {FAQ_ITEMS.map(({ q, a }, i) => (
          <div key={i} className="rounded-xl border border-border/30 bg-card/20 overflow-hidden">
            <button
              type="button"
              onClick={() => setOpenFaq(openFaq === i ? null : i)}
              className="w-full flex items-center justify-between px-4 py-3.5 text-left text-sm font-medium hover:bg-white/[0.02] transition-colors"
            >
              <span>{tt(q)}</span>
              {openFaq === i
                ? <ChevronUp className="h-4 w-4 text-muted-foreground/50 shrink-0" />
                : <ChevronDown className="h-4 w-4 text-muted-foreground/50 shrink-0" />}
            </button>
            <AnimatePresence>
              {openFaq === i && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.22 }}
                  className="overflow-hidden"
                >
                  <p className="px-4 pb-4 text-sm text-muted-foreground/70 leading-relaxed border-t border-border/20 pt-3">
                    {tt(a)}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}
      </section>

      {/* ── Modals ── */}
      <TutorialBindModal
        open={bindOpen}
        onClose={() => setBindOpen(false)}
        onBound={handleBound}
      />
      <TutorialPurchaseModal
        open={buyOpen}
        preSelectedNodeId={preSelectedBuyNode}
        onClose={() => { setBuyOpen(false); setPreSelectedBuyNode(null); }}
        onPurchased={handlePurchased}
      />
    </div>
  );
}
