-- Normalize system_config schema (testnet's richer shape) and seed
-- everything from the latest "RUNE 代币发行 精简版" spec (2026-05-01).
-- Drop+recreate is safe: existing rows (ma_price 0.10 etc.) are
-- replaced by structured JSONB equivalents under the same keys.
DROP TABLE IF EXISTS system_config CASCADE;
CREATE TABLE system_config (
  namespace text NOT NULL DEFAULT 'rune',
  key text NOT NULL,
  value jsonb NOT NULL,
  description text,
  updated_by text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (namespace, key)
);

INSERT INTO system_config(namespace, key, value, description) VALUES

-- ── 一、代币体系 ────────────────────────────────────────────────────
('rune', 'token_supply_rune', '{
  "totalSupply": 210000000,
  "finalRetained": 21000000,
  "deflationPct": 90,
  "allocation": {
    "tradingPool":         100000000,
    "contractInteractive":  30000000,
    "nodeAirdrop":          10000000,
    "initialBurn":          68000000,
    "briberyMarket":         2000000
  },
  "launchPriceUsdt": 0.028,
  "launchThresholdUsdt": 20000000,
  "initialPoolUsdt": 8000000,
  "initialPoolPctToLp": 35
}', 'RUNE 母币（符）总量 + 分配 + 启动条件'),

('rune', 'token_supply_ember', '{
  "totalSupply": 13100000,
  "finalRetained": 1310000,
  "deflationPct": 90,
  "launchThresholdUsdt": 5000000,
  "fullCirculation": true,
  "deflationCycleMonths": [18, 24]
}', 'EMBER 子币（符火）总量 + 启动条件'),

-- ── 二、入金分流 ────────────────────────────────────────────────────
('rune', 'pool_split_rule', '{
  "TLP": { "label": "交易流动池", "pct": 35, "subSplit": { "lpInject": 17.5, "buybackRune": 17.5 } },
  "QEP": { "label": "量化执行池", "pct": 45, "expectedMonthlyRoiPct": [15, 35] },
  "TRP": { "label": "国库储备池", "pct": 20, "purpose": "extreme-market price defense + redemption backstop" }
}', '入金三池分流 TLP/QEP/TRP'),

-- ── 三、日常收益结算 ─────────────────────────────────────────────────
('rune', 'staking_settlement_rule', '{
  "userPortionPct": 100,
  "splits": [
    { "currency": "USDT",  "share": 0.65, "note": "static — paid to wallet directly" },
    { "currency": "EMBER", "share": 0.35, "note": "dynamic — buyback EMBER, USD-valued, injected back to pool" }
  ],
  "directReferralPct": 5,
  "directReferralCurrency": "EMBER",
  "samelevelPct": 1,
  "samelevelMinLevel": 3,
  "dailyAutoBuyMotherPct": 0.1,
  "subTokenSellSlippageDefaultPct": 99.9999,
  "open": false,
  "note": "Staking pool not yet open; formulas ready, on-chain settlement to be wired later."
}', '质押每日收益结算（静态 65% USDT + 动态 35% EMBER 买入）'),

-- ── 四、套餐 ────────────────────────────────────────────────────────
('rune', 'staking_packages', '[
  { "days": 30,  "dailyMinPct": 0.3, "dailyMaxPct": 0.5, "bonusPct": 0,  "perTxCapUsdt": 1000, "perAddressOrders": 5, "dailyNetCapUsdt": 200000, "settlement": "monthly", "rolloverNote": "30 天后需先提取本金后复投或转 90 天" },
  { "days": 90,  "dailyMinPct": 0.5, "dailyMaxPct": 0.7, "bonusPct": 0,  "perTxCapUsdt": 1000, "perAddressOrders": 5, "dailyNetCapUsdt": 300000, "settlement": "monthly", "rolloverNote": "每 30 天提一次收益；90 天后需复投或转 180 天（结算变日结）" },
  { "days": 180, "dailyMinPct": 0.7, "dailyMaxPct": 0.9, "bonusPct": 10, "perTxCapUsdt": 1000, "perAddressOrders": 5, "dailyNetCapUsdt": null, "settlement": "daily" },
  { "days": 360, "dailyMinPct": 0.7, "dailyMaxPct": 0.9, "bonusPct": 20, "perTxCapUsdt": 1000, "perAddressOrders": 5, "dailyNetCapUsdt": null, "settlement": "daily" },
  { "days": 540, "dailyMinPct": 0.7, "dailyMaxPct": 1.0, "bonusPct": 30, "perTxCapUsdt": 1000, "perAddressOrders": 5, "dailyNetCapUsdt": null, "settlement": "daily" }
]', '5 档质押套餐：日化 / 加成 / 限额 / 结算方式'),

-- ── 提现手续费阶梯 ──────────────────────────────────────────────────
('rune', 'withdraw_fee_tiers', '[
  { "withinDays": 0,    "feePct": 35 },
  { "withinDays": 7,    "feePct": 25 },
  { "withinDays": 15,   "feePct": 15 },
  { "withinDays": 30,   "feePct": 5 },
  { "withinDays": 9999, "feePct": 1 }
]', '提现手续费阶梯（>=45 天到 1%）'),

-- ── 五、控进控出（按 U 池规模分级） ──────────────────────────────────
('rune', 'inflow_control_tiers', '[
  { "uPoolMaxUsdt": 5000000,   "feePct": 3 },
  { "uPoolMaxUsdt": 10000000,  "feePct": 6 },
  { "uPoolMaxUsdt": 20000000,  "feePct": 8 },
  { "uPoolMaxUsdt": 30000000,  "feePct": 10 },
  { "uPoolMaxUsdt": null,      "feePct": 12 }
]', '控进：进得有序；超额自动排队 + 0.1% 补偿'),

('rune', 'outflow_mother_tiers', '[
  { "uPoolMaxUsdt": 5000000,   "feePct": 3 },
  { "uPoolMaxUsdt": 10000000,  "feePct": 5 },
  { "uPoolMaxUsdt": 20000000,  "feePct": 7 },
  { "uPoolMaxUsdt": 30000000,  "feePct": 9 },
  { "uPoolMaxUsdt": null,      "feePct": 11 }
]', '母币控出（按 U 池规模阶梯）'),

('rune', 'outflow_sub_tiers', '[
  { "lpUsdtMaxUsdt": 1000000,  "feePct": 4 },
  { "lpUsdtMaxUsdt": 3000000,  "feePct": 6 },
  { "lpUsdtMaxUsdt": 5000000,  "feePct": 8 },
  { "lpUsdtMaxUsdt": 10000000, "feePct": 10 },
  { "lpUsdtMaxUsdt": null,     "feePct": 11 }
]', '子币控出（按 LP USDT 侧阶梯）'),

('rune', 'sub_slippage_ladder', '{
  "basePct": 5,
  "addOnPriceDrop5Pct": 5,
  "lpSellMultipleThreshold": 5,
  "lpSellMultipleSlippage": 20,
  "lpUsdtDrop15Threshold": 15,
  "lpUsdtDrop15Slippage": 25,
  "allConditionsMaxPct": 30
}', '子币滑点阶梯（base 5% / 触发条件递增 / 三条件全中 → 30% 封顶）'),

-- ── 母币销毁质押日化分层 ────────────────────────────────────────────
('rune', 'mother_burn_yield_tiers', '[
  { "minMother": 0,      "maxMother": 99,     "dailyYieldPct": 1.0 },
  { "minMother": 100,    "maxMother": 999,    "dailyYieldPct": 1.2 },
  { "minMother": 1000,   "maxMother": 9999,   "dailyYieldPct": 1.3 },
  { "minMother": 10000,  "maxMother": 99999,  "dailyYieldPct": 1.4 },
  { "minMother": 100000, "maxMother": null,   "dailyYieldPct": 1.5 }
]', '母币销毁质押日化收益（按销毁数量）'),

-- ── 六、节点招募 ────────────────────────────────────────────────────
('rune', 'node_tiers', '[
  { "nodeId": 501, "label": "INITIAL",  "nameCn": "初级", "priceUsdt": 1000,  "quota": 1000, "directRatePct": 5,  "airdropRune": 1000,  "dividendWeightPct": 100 },
  { "nodeId": 401, "label": "MID",      "nameCn": "中级", "priceUsdt": 2500,  "quota": 800,  "directRatePct": 8,  "airdropRune": 3000,  "dividendWeightPct": 120 },
  { "nodeId": 301, "label": "ADVANCED", "nameCn": "高级", "priceUsdt": 5000,  "quota": 400,  "directRatePct": 10, "airdropRune": 6250,  "dividendWeightPct": 140 },
  { "nodeId": 201, "label": "SUPER",    "nameCn": "超级", "priceUsdt": 10000, "quota": 200,  "directRatePct": 12, "airdropRune": 13000, "dividendWeightPct": 160 },
  { "nodeId": 101, "label": "FOUNDER",  "nameCn": "联创", "priceUsdt": 50000, "quota": 20,   "directRatePct": 15, "airdropRune": 75000, "dividendWeightPct": 200 }
]', '5 档节点 — 价格 / 名额 / 直推率 / 空投 RUNE / 分红权重'),

('rune', 'airdrop_unlock_stages', '[
  { "stage": 1, "poolThresholdUsdt": 2800000,  "releasePct": 10, "note": "底池 280 万（初始）" },
  { "stage": 2, "poolThresholdUsdt": 7000000,  "releasePct": 20, "note": "底池 700 万" },
  { "stage": 3, "poolThresholdUsdt": 17500000, "releasePct": 30, "note": "底池 1,750 万" },
  { "stage": 4, "poolThresholdUsdt": 35000000, "releasePct": 40, "note": "底池 3,500 万 或 满 180 天" }
]', '节点空投 RUNE 4 阶段解锁'),

-- ── 七、推广 V 级 ───────────────────────────────────────────────────
('rune', 'v_level_rules', '[
  { "level": 1, "label": "V1", "personalHoldUsdt": 1000,  "teamVolumeUsdt": 20000,    "teamMembers": 2,  "teamRewardPct": 4,  "samelevelPct": 0, "settle": null,                                       "note": "基础推广" },
  { "level": 2, "label": "V2", "personalHoldUsdt": 1000,  "teamVolumeUsdt": 50000,    "teamMembers": 3,  "teamRewardPct": 8,  "samelevelPct": 0, "settle": null,                                       "note": "" },
  { "level": 3, "label": "V3", "personalHoldUsdt": 1000,  "teamVolumeUsdt": 300000,   "teamMembers": 5,  "teamRewardPct": 12, "samelevelPct": 1, "settle": null,                                       "note": "平级 1%" },
  { "level": 4, "label": "V4", "personalHoldUsdt": 2000,  "teamVolumeUsdt": 1000000,  "teamMembers": 7,  "teamRewardPct": 16, "samelevelPct": 1, "settle": null,                                       "note": "" },
  { "level": 5, "label": "V5", "personalHoldUsdt": 3000,  "teamVolumeUsdt": 3000000,  "teamMembers": 10, "teamRewardPct": 20, "samelevelPct": 1, "settle": null,                                       "note": "" },
  { "level": 6, "label": "V6", "personalHoldUsdt": 4000,  "teamVolumeUsdt": 7000000,  "teamMembers": 13, "teamRewardPct": 23, "samelevelPct": 1, "settle": { "fromV8Pct": 6, "fromV9Pct": 3 },          "note": "V8 沉淀 6% + V9 沉淀 3%" },
  { "level": 7, "label": "V7", "personalHoldUsdt": 5000,  "teamVolumeUsdt": 20000000, "teamMembers": 15, "teamRewardPct": 25, "samelevelPct": 1, "settle": { "fromV8Pct": 8, "fromV9Pct": 4 },          "note": "V8 沉淀 8% + V9 沉淀 4%（前期最高开放等级）" },
  { "level": 8, "label": "V8", "personalHoldUsdt": 10000, "teamVolumeUsdt": 50000000, "teamMembers": 15, "teamRewardPct": 27, "samelevelPct": 1, "settle": { "samelevelPct": 5 },                       "note": "同级沉淀 5%" },
  { "level": 9, "label": "V9", "personalHoldUsdt": 20000, "teamVolumeUsdt": 90000000, "teamMembers": 15, "teamRewardPct": 29, "samelevelPct": 1, "settle": { "samelevelPct": 5, "daoGovernance": true }, "note": "同级沉淀 5% + DAO 治理权" }
]', 'V1-V9 级差 / 平级 / 沉淀分配（V8/V9 每日审计公示）'),

('rune', 'v_level_eligibility_rules', '{
  "minSinglePositionUsdt": 1,
  "maxSinglePositionUsdt": 1000,
  "directDownlineMinUsdtForValid": 1000,
  "promotionEntryHoldUsdt": 1000,
  "openMaxLevelInitially": 7,
  "v8v9DailyAuditDisclosure": true,
  "crossDeptSettlementPct": 8,
  "nodeQualifiedExtraSettlementMinPct": 8,
  "nodeQualifiedExtraSettlementMaxPct": 15
}', 'V 级资格细则 — 单笔 / 直推有效 / V8V9 公示 / 跨部门沉淀 / 节点加权'),

-- ── 八、价格守护（5 重） ─────────────────────────────────────────────
('rune', 'price_defense_mechanisms', '[
  { "ord": 1, "name": "SEAL",   "label": "封印机制",  "trigger": "single-day price drop > 5%",     "action": "sell slippage 5% → 35% (max), auto-restore on stabilization" },
  { "ord": 2, "name": "PYRE",   "label": "焚符机制",  "trigger": "after SEAL trip",                 "action": "burn LP-pool tokens (deflation) to recover price structure" },
  { "ord": 3, "name": "ANCHOR", "label": "镇符机制",  "trigger": "price band breach",               "action": "treasury auto-sell above ceiling, auto-buy below floor (e.g. $55-$60)" },
  { "ord": 4, "name": "FORGE",  "label": "锻符机制",  "trigger": "always-on",                       "action": "AI quant + bribery-market external bleed-in (15-35%/mo)" },
  { "ord": 5, "name": "BASE",   "label": "底符机制",  "trigger": "pool drop ≥95% from peak",        "action": "fuse-break: lock yield-day count for old users, new deposits unaffected; locked accounts get AI quant copy-trade + prediction access until pool recovers" }
]', '五重价格守护机制（SEAL / PYRE / ANCHOR / FORGE / BASE）'),

-- ── 九、税费与每日销毁 ──────────────────────────────────────────────
('rune', 'tax_and_slippage', '{
  "mother": {
    "buySlippagePct":           5,
    "buySlippageBreakdown":     { "node": 2, "community": 3 },
    "sellSlippagePct":          5,
    "sellSlippageBreakdown":    { "community": 2, "burn": 3 },
    "secondaryProfitTaxPct":    10,
    "secondaryProfitTaxMaxPct": 30,
    "secondaryTaxBreakdown":    { "node": 5, "community": 15 },
    "extraSellByPool": [
      { "uPoolMaxUsdt": 10000000, "extraPct": 20 },
      { "uPoolMaxUsdt": 20000000, "extraPct": 15 },
      { "uPoolMaxUsdt": null,     "extraPct": 10 }
    ],
    "dailyAutoBurnPct":         0.2,
    "dailyAutoBurnBreakdown":   { "burn": 80, "weeklyBoard": 2, "monthlyBoard": 1, "node": 1, "v5_v9": 2, "community": 14 }
  },
  "sub": {
    "buySlippagePct":           5,
    "buySlippageBreakdown":     { "node": 2, "community": 3 },
    "sellSlippagePct":          5,
    "sellSlippageBreakdown":    { "burn": 4, "community": 1 },
    "secondaryProfitTaxPct":    10,
    "secondaryTaxBreakdown":    { "node": 3, "community": 7 },
    "c2cTaxPct":                3,
    "c2cTaxBreakdown":          { "burn": 1, "guardianReserve": 2 },
    "dailyAutoBurnPct":         0.1,
    "dailyAutoBurnBreakdown":   { "burn": 80, "weeklyBoard": 2, "monthlyBoard": 1, "node": 1, "v5_v9": 2, "community": 14 }
  }
}', '母币 / 子币 滑点 + 税费 + 每日自动销毁（含明细分配）')

ON CONFLICT (namespace, key) DO UPDATE SET
  value = EXCLUDED.value,
  description = EXCLUDED.description,
  updated_at = now();
