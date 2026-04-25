import { Link } from "wouter";
import { ArrowUpRight, FlaskConical, ShieldCheck, ShieldAlert, Shield } from "lucide-react";
import { motion } from "framer-motion";
import { useMemo } from "react";
import { formatPercent } from "@/lib/format";
import { Project, ProjectRiskLevel } from "@rune/api-client-react";
import { useLanguage } from "@/contexts/language-context";

/** Deterministic pseudo-random sparkline from a seed string.
 * Generates 12 points on a 0-40 vertical range with a bias toward upward trend. */
function makeSparkPath(seed: string, width = 200, height = 40, points = 12) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  const rand = () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967295;
  };
  const ys: number[] = [];
  let y = height * 0.75;
  for (let i = 0; i < points; i++) {
    const drift = -1.4 + rand() * 1.0;          // slight upward bias
    const noise = (rand() - 0.5) * 6;
    y = Math.max(2, Math.min(height - 2, y + drift + noise));
    ys.push(y);
  }
  // ensure last point is in upper half so trend looks bullish
  ys[ys.length - 1] = Math.min(ys[ys.length - 1], height * 0.35);

  const stepX = width / (points - 1);
  const linePts = ys.map((py, i) => `${(i * stepX).toFixed(1)},${py.toFixed(1)}`);
  const lineD = `M ${linePts.join(" L ")}`;
  const areaD = `${lineD} L ${width},${height} L 0,${height} Z`;
  return { lineD, areaD, lastX: width, lastY: ys[ys.length - 1] };
}

const DEEP_ANALYSIS_ROUTES: Record<string, string> = {
  RUNE: "/projects/rune",
  B18:  "/projects/b18",
  HYPE: "/projects/hyperliquid",
  ATM:  "/projects/legend-atm",
};

interface ProjectCardProps {
  project: Project;
}

const CATEGORY_META: Record<string, {
  color: string; dimColor: string; bg: string;
  barColor: string; glowRgb: string;
}> = {
  vault:          { color: "text-purple-300",  dimColor: "text-purple-400/60", bg: "bg-purple-500/12",  barColor: "bg-purple-400",  glowRgb: "168,85,247" },
  dex:            { color: "text-amber-300",   dimColor: "text-amber-400/60",  bg: "bg-amber-500/12",   barColor: "bg-amber-400",   glowRgb: "245,158,11" },
  lending:        { color: "text-emerald-300", dimColor: "text-emerald-400/60",bg: "bg-emerald-500/12", barColor: "bg-emerald-400", glowRgb: "52,211,153" },
  yield:          { color: "text-sky-300",     dimColor: "text-sky-400/60",    bg: "bg-sky-500/12",     barColor: "bg-sky-400",     glowRgb: "56,189,248" },
  derivatives:    { color: "text-rose-300",    dimColor: "text-rose-400/60",   bg: "bg-rose-500/12",    barColor: "bg-rose-400",    glowRgb: "244,63,94"  },
  staking:        { color: "text-indigo-300",  dimColor: "text-indigo-400/60", bg: "bg-indigo-500/12",  barColor: "bg-indigo-400",  glowRgb: "99,102,241" },
  infrastructure: { color: "text-amber-300",   dimColor: "text-amber-400/60",  bg: "bg-amber-500/12",   barColor: "bg-amber-400",   glowRgb: "245,158,11" },
};

function getCategoryMeta(category: string) {
  return CATEGORY_META[category.toLowerCase()] ?? CATEGORY_META.dex;
}

const RISK_ENGLISH: Record<ProjectRiskLevel, string> = {
  low: "LOW",
  medium: "MED",
  high: "HIGH",
};

export function RiskBadge({ level }: { level: ProjectRiskLevel }) {
  const { t, language } = useLanguage();
  const isEn = language === "en";

  const config: Record<ProjectRiskLevel, { key: string; color: string; icon: typeof ShieldCheck }> = {
    low:    { key: "mr.risk.low",    color: "text-emerald-400", icon: ShieldCheck },
    medium: { key: "mr.risk.medium", color: "text-amber-400",   icon: Shield },
    high:   { key: "mr.risk.high",   color: "text-rose-400",    icon: ShieldAlert },
  };
  const { key, color, icon: Icon } = config[level];

  return (
    <div className={`flex items-center gap-1.5 ${color}`}>
      <Icon className="h-3 w-3" />
      <span className="text-[10px] font-semibold uppercase tracking-widest">{t(key)}</span>
      {!isEn && (
        <span className="text-[9px] opacity-50">{RISK_ENGLISH[level]}</span>
      )}
    </div>
  );
}

export function ProjectCard({ project }: ProjectCardProps) {
  const { t, language } = useLanguage();
  const isEn = language === "en";
  const href = DEEP_ANALYSIS_ROUTES[project.symbol] ?? `/projects/${project.id}`;
  const hasDeepAnalysis = project.symbol in DEEP_ANALYSIS_ROUTES;
  const meta = getCategoryMeta(project.category);
  const spark = useMemo(() => makeSparkPath(project.symbol + project.id, 200, 40, 12), [project.symbol, project.id]);
  const sparkId = `spark-${project.symbol}-${project.id}`;

  return (
    <Link href={href}>
      <div
        className="relative h-full flex flex-col overflow-hidden rounded-2xl border border-white/[0.07] bg-[#0b1120]/80 backdrop-blur-sm cursor-pointer group transition-all duration-350"
        style={{
          boxShadow: "0 2px 20px rgba(0,0,0,0.35)",
        }}
        onMouseEnter={e => {
          (e.currentTarget as HTMLDivElement).style.boxShadow =
            `0 8px 40px rgba(0,0,0,0.5), 0 0 0 1px rgba(${meta.glowRgb},0.25), 0 0 30px rgba(${meta.glowRgb},0.1)`;
          (e.currentTarget as HTMLDivElement).style.transform = "translateY(-4px)";
        }}
        onMouseLeave={e => {
          (e.currentTarget as HTMLDivElement).style.boxShadow = "0 2px 20px rgba(0,0,0,0.35)";
          (e.currentTarget as HTMLDivElement).style.transform = "translateY(0)";
        }}
      >
        {/* Top accent line */}
        <div className={`h-[2px] w-full ${meta.barColor} opacity-50 group-hover:opacity-90 transition-opacity duration-300`} />

        {/* Subtle background glow */}
        <div
          className="absolute top-0 right-0 w-40 h-40 rounded-full blur-[60px] pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500"
          style={{ background: `rgba(${meta.glowRgb},0.08)` }}
        />

        {/* Watermark symbol */}
        <div className="absolute bottom-2 right-3 text-[64px] font-black text-white/[0.028] select-none pointer-events-none leading-none tracking-tighter">
          {project.symbol}
        </div>

        {/* ── Header: logo + name ── */}
        <div className="px-5 pt-5 pb-4 flex items-center gap-3">
          {project.symbol === "RUNE" ? (
            <div className="w-11 h-11 rounded-xl overflow-hidden bg-black border border-primary/30 shrink-0 shadow-[0_0_12px_rgba(251,191,36,0.2)]">
              <img src="/rune-logo-new.png" alt="RUNE" className="w-full h-full object-contain" />
            </div>
          ) : (
            <div className={`w-11 h-11 rounded-xl shrink-0 flex items-center justify-center border border-white/[0.08] ${meta.bg}`}>
              <span className={`text-sm font-bold font-mono tracking-wide ${meta.color}`}>
                {project.symbol.slice(0, 2)}
              </span>
            </div>
          )}

          <div className="min-w-0 flex-1">
            <h3 className={`font-bold text-[15px] leading-tight tracking-tight text-white/90 group-hover:${meta.color} transition-colors truncate`}>
              {project.name}
            </h3>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-[10px] font-mono text-white/35 tracking-widest">{project.symbol}</span>
              <span className="text-white/20 text-[10px]">·</span>
              <span className={`text-[9px] font-bold uppercase tracking-[0.14em] ${meta.dimColor}`}>
                {project.category}
              </span>
              {hasDeepAnalysis && (
                <span className="inline-flex items-center gap-0.5 text-[8px] px-1.5 py-px rounded-full bg-primary/10 border border-primary/20 text-primary/80 font-semibold tracking-wider ml-0.5">
                  <FlaskConical className="h-2 w-2" /> DEEP
                </span>
              )}
            </div>
          </div>

          {project.isRecommended && (
            <div className="w-5 h-5 rounded-full bg-primary/10 border border-primary/25 flex items-center justify-center shrink-0">
              <svg className="w-2.5 h-2.5 fill-primary" viewBox="0 0 24 24">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
              </svg>
            </div>
          )}
        </div>

        {/* ── APY hero block w/ embedded sparkline ── */}
        <div className={`mx-5 relative rounded-xl px-4 pt-5 pb-2 ${meta.bg} border border-white/[0.05] overflow-hidden`}>
          <div className="relative z-10 flex flex-col items-center justify-center text-center">
            <p className="text-[9px] uppercase tracking-[0.25em] text-white/35 font-semibold mb-1.5">
              {t("mr.metric.apy.label")}
            </p>
            <p
              className={`text-[42px] font-bold leading-none tracking-tight ${meta.color}`}
              style={{ fontVariantNumeric: "tabular-nums", fontFamily: "'Inter', 'SF Pro Display', system-ui, sans-serif" }}
            >
              {formatPercent(project.apy)}
            </p>
          </div>

          {/* Animated sparkline beneath APY */}
          <div className="relative z-10 mt-2 h-10 w-full">
            <svg viewBox="0 0 200 40" className="w-full h-full overflow-visible" preserveAspectRatio="none">
              <defs>
                <linearGradient id={`${sparkId}-area`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%"  stopColor={`rgb(${meta.glowRgb})`} stopOpacity="0.45" />
                  <stop offset="100%" stopColor={`rgb(${meta.glowRgb})`} stopOpacity="0" />
                </linearGradient>
                <linearGradient id={`${sparkId}-line`} x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%"  stopColor={`rgb(${meta.glowRgb})`} stopOpacity="0.5" />
                  <stop offset="100%" stopColor={`rgb(${meta.glowRgb})`} stopOpacity="1" />
                </linearGradient>
                <filter id={`${sparkId}-glow`}>
                  <feGaussianBlur stdDeviation="1.2" result="b" />
                  <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
                </filter>
              </defs>
              <motion.path
                d={spark.areaD}
                fill={`url(#${sparkId}-area)`}
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8, delay: 0.3 }}
              />
              <motion.path
                d={spark.lineD}
                fill="none"
                stroke={`url(#${sparkId}-line)`}
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                filter={`url(#${sparkId}-glow)`}
                initial={{ pathLength: 0 }}
                whileInView={{ pathLength: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 1.4, ease: [0.22, 1, 0.36, 1] }}
              />
              {/* Pulsing tip dot */}
              <motion.circle
                cx={spark.lastX} cy={spark.lastY} r="2.4"
                fill={`rgb(${meta.glowRgb})`}
                initial={{ scale: 0, opacity: 0 }}
                whileInView={{ scale: 1, opacity: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.3, delay: 1.4 }}
                style={{ transformOrigin: `${spark.lastX}px ${spark.lastY}px` }}
              />
              <motion.circle
                cx={spark.lastX} cy={spark.lastY} r="3"
                fill={`rgb(${meta.glowRgb})`}
                animate={{ scale: [1, 2.6, 1], opacity: [0.6, 0, 0.6] }}
                transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut", delay: 1.6 }}
                style={{ transformOrigin: `${spark.lastX}px ${spark.lastY}px` }}
              />
            </svg>
          </div>
        </div>

        {/* ── TVL + footer ── */}
        <div className="px-5 pt-4 pb-5 flex-1 flex flex-col justify-between gap-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[9px] uppercase tracking-[0.2em] text-white/30 font-semibold mb-0.5">
                {t("mr.metric.tvl.label")}
              </p>
              <p className="text-xl font-bold text-white/75 tracking-tight"
                style={{ fontVariantNumeric: "tabular-nums" }}>
                {project.tvl.startsWith("$") ? project.tvl : `$${project.tvl}`}
              </p>
            </div>
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center border border-white/[0.08] ${meta.bg} group-hover:scale-110 transition-transform duration-200`}
            >
              <ArrowUpRight className={`h-4 w-4 ${meta.color} group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform`} />
            </div>
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-white/[0.06]">
            <RiskBadge level={project.riskLevel} />
            <span className={`text-[10px] font-semibold tracking-wider ${meta.dimColor}`}>
              {hasDeepAnalysis ? t("mr.action.deepAnalysis") : t("mr.action.viewAnalysis")}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
