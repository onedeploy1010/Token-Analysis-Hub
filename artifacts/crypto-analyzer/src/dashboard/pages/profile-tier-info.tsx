import { ArrowLeft, Info } from "lucide-react";
import { useLocation } from "wouter";
import { useTranslation } from "react-i18next";

const AMBER = "hsl(43,74%,58%)";

const DASH = "—";

const LEVELS = [
  { v: "V1", holdingKey: "nodes.tier.holding1k",  teamKey: "nodes.tier.team20k",    refs: 2,  teamReward: "4%",  sameRank: DASH,                       special: DASH },
  { v: "V2", holdingKey: "nodes.tier.holding1k",  teamKey: "nodes.tier.team50k",    refs: 3,  teamReward: "8%",  sameRank: DASH,                       special: DASH },
  { v: "V3", holdingKey: "nodes.tier.holding1k",  teamKey: "nodes.tier.team300k",   refs: 5,  teamReward: "12%", sameRank: "nodes.tier.sameRank1",     special: DASH },
  { v: "V4", holdingKey: "nodes.tier.holding2k",  teamKey: "nodes.tier.team1m",     refs: 7,  teamReward: "16%", sameRank: "nodes.tier.sameRank1",     special: DASH },
  { v: "V5", holdingKey: "nodes.tier.holding3k",  teamKey: "nodes.tier.team3m",     refs: 10, teamReward: "20%", sameRank: "nodes.tier.sameRank1",     special: DASH },
  { v: "V6", holdingKey: "nodes.tier.holding4k",  teamKey: "nodes.tier.team7m",     refs: 13, teamReward: "23%", sameRank: "nodes.tier.sameRank1",     special: "nodes.tier.specialUpperDividend" },
  { v: "V7", holdingKey: "nodes.tier.holding5k",  teamKey: "nodes.tier.team20m",    refs: 15, teamReward: "25%", sameRank: "nodes.tier.sameRank1",     special: "nodes.tier.specialUpperDividend" },
  { v: "V8", holdingKey: "nodes.tier.holding10k", teamKey: "nodes.tier.team50m",    refs: 15, teamReward: "27%", sameRank: "nodes.tier.sameRank5",     special: DASH },
  { v: "V9", holdingKey: "nodes.tier.holding20k", teamKey: "nodes.tier.team90m",    refs: 15, teamReward: "29%", sameRank: "nodes.tier.sameRank1",     special: "nodes.tier.specialPeerDividendDao" },
];

export default function ProfileTierInfoPage() {
  const [, navigate] = useLocation();
  const { t } = useTranslation();

  return (
    <div className="min-h-screen pb-24" style={{ background: "#080808" }}>
      {/* Header */}
      <div className="relative overflow-hidden" style={{ background: "linear-gradient(180deg, #1a1408 0%, #0e0b05 60%, #080808 100%)" }}>
        <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse at 60% 0%, rgba(212,168,50,0.1) 0%, transparent 60%)" }} />
        <div className="relative px-4 pt-3 pb-5">
          <div className="flex items-center gap-3 mb-5">
            <button
              onClick={() => navigate("/profile/referral")}
              className="w-9 h-9 flex items-center justify-center rounded-full shrink-0"
              style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}
              aria-label={t("common.back")}
            >
              <ArrowLeft className="h-5 w-5 text-white/90" />
            </button>
            <h1 className="text-[17px] font-bold text-white">{t("nodes.tier.pageTitle")}</h1>
          </div>

          {/* Top KPIs */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl p-4" style={{ background: "rgba(212,168,50,0.07)", border: "1px solid rgba(212,168,50,0.2)" }}>
              <div className="text-[10px] text-white/40 mb-1">{t("nodes.tier.directRewardFixed")}</div>
              <div className="text-[28px] font-black" style={{ color: AMBER }}>5%</div>
              <div className="text-[9px] text-white/30 mt-1">{t("nodes.tier.directRewardFixedDesc")}</div>
            </div>
            <div className="rounded-2xl p-4" style={{ background: "rgba(99,102,241,0.07)", border: "1px solid rgba(99,102,241,0.2)" }}>
              <div className="text-[10px] text-white/40 mb-1">{t("nodes.tier.teamRewardRange")}</div>
              <div className="text-[28px] font-black text-indigo-400">4–29%</div>
              <div className="text-[9px] text-white/30 mt-1">{t("nodes.tier.teamRewardRangeDesc")}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 mt-4 space-y-4">
        {/* Info note */}
        <div className="flex gap-2 rounded-xl p-3" style={{ background: "rgba(212,168,50,0.05)", border: "1px solid rgba(212,168,50,0.12)" }}>
          <Info className="h-3.5 w-3.5 shrink-0 mt-0.5" style={{ color: AMBER }} />
          <p className="text-[10px] text-white/45 leading-relaxed">
            {t("nodes.tier.qualifyPrefix")}<span style={{ color: AMBER }}>{t("nodes.tier.holdingReq")}</span>{t("nodes.tier.qualifyComma")}<span style={{ color: AMBER }}>{t("nodes.tier.teamPerformance")}</span>{t("nodes.tier.qualifyAnd")}<span style={{ color: AMBER }}>{t("nodes.tier.directReferrals")}</span>{t("nodes.tier.qualifySuffix")}
          </p>
        </div>

        {/* V-level cards */}
        {LEVELS.map((lvl, i) => {
          const pct = (i + 1) / LEVELS.length;
          const hue = 220 + pct * 60;
          const accent = `hsl(${hue},80%,65%)`;
          return (
            <div key={lvl.v} className="rounded-2xl overflow-hidden"
              style={{ border: `1px solid hsla(${hue},60%,50%,0.2)`, background: `hsla(${hue},30%,10%,0.4)` }}>
              {/* Card header */}
              <div className="flex items-center justify-between px-4 py-3"
                style={{ background: `hsla(${hue},40%,12%,0.6)`, borderBottom: `1px solid hsla(${hue},50%,40%,0.15)` }}>
                <span className="text-[15px] font-black" style={{ color: accent }}>{lvl.v}</span>
                <span className="text-[13px] font-black" style={{ color: accent }}>{lvl.teamReward} {t("nodes.tier.teamRewardLabel")}</span>
              </div>
              {/* Card body */}
              <div className="grid grid-cols-3 gap-0 px-4 py-3">
                {[
                  { label: t("nodes.tier.holdingReq"), value: t(lvl.holdingKey) },
                  { label: t("nodes.tier.teamPerformance"), value: t(lvl.teamKey) },
                  { label: t("nodes.tier.directReferrals"), value: t("nodes.tier.peopleCount", { count: lvl.refs }) },
                ].map((item) => (
                  <div key={item.label} className="text-center">
                    <div className="text-[9px] text-white/30 mb-1">{item.label}</div>
                    <div className="text-[12px] font-bold text-white/80">{item.value}</div>
                  </div>
                ))}
              </div>
              {/* Special rights */}
              {(lvl.sameRank !== DASH || lvl.special !== DASH) && (
                <div className="flex gap-2 px-4 pb-3 flex-wrap">
                  {lvl.sameRank !== DASH && (
                    <span className="text-[9px] px-2 py-0.5 rounded-full font-bold"
                      style={{ background: `hsla(${hue},60%,50%,0.12)`, border: `1px solid hsla(${hue},60%,50%,0.25)`, color: accent }}>
                      {t(lvl.sameRank)}
                    </span>
                  )}
                  {lvl.special !== DASH && (
                    <span className="text-[9px] px-2 py-0.5 rounded-full font-bold"
                      style={{ background: "rgba(212,168,50,0.1)", border: "1px solid rgba(212,168,50,0.25)", color: AMBER }}>
                      {t(lvl.special)}
                    </span>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {/* Footer note */}
        <div className="text-center text-[9px] text-white/20 pb-2">
          {t("nodes.tier.footerNote")}
        </div>
      </div>
    </div>
  );
}
