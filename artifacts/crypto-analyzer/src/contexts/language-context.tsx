import { createContext, useContext, useState, useCallback, ReactNode } from "react";

type Language = "en" | "zh";

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  toggleLanguage: () => void;
  t: (key: string) => string;
}

const translations: Record<string, Record<Language, string>> = {
  // App level
  "app.title": { en: "B18 Token Economics", zh: "B18 代币经济模型" },
  "app.subtitle": { en: "DeFi Protocol Calculator", zh: "DeFi 协议计算器" },
  "button.reset": { en: "Reset", zh: "重置" },
  "button.resetAll": { en: "Reset All Data", zh: "重置所有数据" },
  "button.calculate": { en: "Calculate", zh: "计算" },
  "button.confirm": { en: "Confirm", zh: "确认" },
  "button.cancel": { en: "Cancel", zh: "取消" },
  "button.add": { en: "Add", zh: "添加" },
  "button.remove": { en: "Remove", zh: "删除" },
  
  // Metrics
  "metrics.price": { en: "B18 Price", zh: "B18 价格" },
  "metrics.circulation": { en: "Circulation", zh: "流通量" },
  "metrics.treasury": { en: "Treasury", zh: "国库余额" },
  "metrics.burned": { en: "Burned", zh: "已销毁" },
  "metrics.delivery": { en: "Delivery Contract", zh: "交付合约" },
  "metrics.lpUsdt": { en: "LP USDC", zh: "LP USDC" },
  "metrics.lpB18": { en: "LP B18", zh: "LP B18" },
  "metrics.fromDelivery": { en: "from Delivery", zh: "来自交付合约" },
  "metrics.bonusPool": { en: "Bonus Pool", zh: "奖励池" },
  
  // Tabs (both tab.* and tabs.* for compatibility)
  "tab.staking": { en: "Presale Staking", zh: "一级市场质押" },
  "tab.secondary": { en: "Secondary Market", zh: "二级市场交易" },
  "tab.release": { en: "Release & Withdrawal", zh: "释放提现" },
  "tab.rewards": { en: "Dynamic Rewards", zh: "动态奖励" },
  "tab.distribution": { en: "Token Distribution", zh: "代币分布" },
  "tab.summary": { en: "Summary", zh: "统计汇总" },
  "tab.simulator": { en: "Cash Flow Simulator", zh: "现金流模拟" },
  "tabs.staking": { en: "Staking", zh: "质押计算" },
  "tabs.secondary": { en: "Market", zh: "二级市场" },
  "tabs.release": { en: "Release", zh: "释放提现" },
  "tabs.rewards": { en: "Rewards", zh: "动态奖励" },
  "tabs.distribution": { en: "Distribution", zh: "代币分配" },
  "tabs.summary": { en: "Summary", zh: "统计汇总" },
  "tabs.simulator": { en: "Cash Flow", zh: "现金流模拟" },
  
  // Staking
  "staking.title": { en: "Presale Staking Calculator", zh: "一级市场质押计算" },
  "staking.desc": { en: "Presale purchase with no slippage, USDC split: 50% to treasury, 50% to LP. Delivery contract adds matching B18 to LP to maintain price stability. Tokens are released daily after staking.", zh: "预售购买无滑点，USDC分配：50%进国库，50%进LP。交付合约同时添加等值B18到LP维持价格稳定。代币质押后按日释放。" },
  "staking.params": { en: "Investment Parameters", zh: "投资参数" },
  "staking.amount": { en: "Investment Amount (USDC, min 100)", zh: "投入金额 (USDC，最低100)" },
  "staking.period": { en: "Staking Period", zh: "质押周期" },
  "staking.releasePeriod": { en: "Release Period", zh: "释放周期" },
  "staking.compound": { en: "Daily Compounding", zh: "每日本利复投" },
  "staking.compoundDesc": { en: "Enable compounding: daily principal + interest = next day principal", zh: "开启复利：每日本金+利息=第二天本金，按日利率滚存" },
  "staking.flow": { en: "Investment Flow", zh: "投资流程" },
  "staking.fundFlow": { en: "Fund Flow (No Slippage)", zh: "资金流向（无滑点）" },
  "staking.toTreasury": { en: "To Treasury", zh: "进国库" },
  "staking.toLP": { en: "To LP Pool", zh: "进LP底池" },
  "staking.deliveryLP": { en: "Delivery Contract Adds to LP", zh: "交付合约添加LP流动性" },
  "staking.lpMatch": { en: "Match 50% USDC, maintain price stability", zh: "配比50% USDC，维持价格稳定" },
  "staking.priceImpact": { en: "Price Impact", zh: "价格影响" },
  "staking.priceStable": { en: "Price Stays Stable", zh: "价格保持稳定" },
  "staking.priceStableDesc": { en: "Delivery contract adds matching B18 to LP, USDC and B18 increase proportionally, price stays stable", zh: "交付合约同时添加等值B18到LP，USDC与B18同比例增加，价格保持稳定" },
  "staking.returns": { en: "Investment Returns", zh: "投资收益" },
  "staking.tokensReceived": { en: "Tokens Received", zh: "获得代币" },
  "staking.stakingReturns": { en: "Staking Returns", zh: "质押收益" },
  "staking.totalReturn": { en: "Total Interest", zh: "总共利息" },
  "staking.releaseTax": { en: "Release Tax", zh: "释放税" },
  "staking.totalPeriod": { en: "Total Period", zh: "总周期" },
  "staking.days": { en: "days", zh: "天" },
  "staking.principal": { en: "Principal", zh: "投入本金" },
  "staking.noSlippage": { en: "Presale No Slippage", zh: "预售无滑点" },
  "staking.stakingPL": { en: "Staking P&L", zh: "质押本利" },
  "staking.dailyProfit": { en: "Daily Profit", zh: "日均收益" },
  "staking.netProfit": { en: "Net Profit", zh: "净收益" },
  "staking.simulate": { en: "Simulate Purchase & Stake", zh: "模拟购买质押" },
  "staking.details": { en: "Detailed Breakdown", zh: "收益明细" },
  
  // Secondary Market
  "secondary.title": { en: "Secondary Market Trading", zh: "二级市场交易" },
  "secondary.desc": { en: "AMM trading with 3% slippage fee, 60% to treasury, 20% burn, 20% to bonus pool", zh: "AMM交易，3%滑点费用，60%进国库，20%销毁，20%进奖金池" },
  "secondary.buy": { en: "Buy", zh: "买入" },
  "secondary.sell": { en: "Sell", zh: "卖出" },
  "secondary.buyAmount": { en: "Buy Amount (USDC)", zh: "买入金额 (USDC)" },
  "secondary.sellAmount": { en: "Sell Amount (B18)", zh: "卖出数量 (B18)" },
  "secondary.priceInfo": { en: "Price Information", zh: "价格信息" },
  "secondary.currentPrice": { en: "Current Price", zh: "当前价格" },
  "secondary.afterPrice": { en: "Price After Trade", zh: "交易后价格" },
  "secondary.slippage": { en: "Slippage", zh: "滑点" },
  "secondary.slippageFee": { en: "Slippage Fee", zh: "滑点费用" },
  "secondary.feeDistribution": { en: "Fee Distribution", zh: "费用分配" },
  "secondary.toTreasury": { en: "To Treasury", zh: "进国库" },
  "secondary.toBurn": { en: "Burn", zh: "销毁" },
  "secondary.toBonus": { en: "To Bonus Pool", zh: "进奖金池" },
  "secondary.tradeResult": { en: "Trade Result", zh: "交易结果" },
  "secondary.tokensReceived": { en: "Tokens Received", zh: "获得代币" },
  "secondary.usdtReceived": { en: "USDC Received", zh: "获得USDC" },
  "secondary.simulateBuy": { en: "Simulate Buy", zh: "模拟买入" },
  "secondary.simulateSell": { en: "Simulate Sell", zh: "模拟卖出" },
  
  // Release & Withdrawal
  "release.title": { en: "Release & Withdrawal", zh: "释放提现" },
  "release.desc": { en: "Release staked tokens for USDC. Treasury pays in USDC, released B18 distributed: 60% to delivery contract, 20% burn, 20% bonus pool.", zh: "释放质押代币换取USDC。国库用USDC兑付，释放的B18分配：60%回交付合约、20%销毁、20%奖金池。" },
  "release.simulator": { en: "Release Withdrawal Simulator", zh: "释放提现模拟" },
  "release.stakedTokens": { en: "Staked Tokens (from staking calculator)", zh: "质押代币（来自质押计算）" },
  "release.stakedAmount": { en: "Staked Amount (P+I)", zh: "质押量 (本+利)" },
  "release.releasePeriod": { en: "Release Period", zh: "释放周期" },
  "release.releaseResult": { en: "Release Result", zh: "释放结果" },
  "release.dailyRelease": { en: "Daily Release", zh: "每日释放" },
  "release.monthlyRelease": { en: "Monthly Release", zh: "月释放" },
  "release.totalRelease": { en: "Total Release", zh: "总释放量" },
  "release.releaseTax": { en: "Release Tax", zh: "释放税" },
  "release.netRelease": { en: "Net Release", zh: "净释放" },
  "release.withdrawalPayout": { en: "Withdrawal Payout", zh: "提现兑付" },
  "release.b18Distribution": { en: "B18 Distribution After Payout", zh: "提现被兑付后的B18分配" },
  "release.toDelivery": { en: "To Delivery Contract", zh: "回交付合约" },
  "release.toBurn": { en: "Burn (Black Hole)", zh: "黑洞销毁" },
  "release.toBonus": { en: "Bonus Pool", zh: "奖金池" },
  "release.simulateRelease": { en: "Simulate Release", zh: "模拟释放" },
  "release.params": { en: "Release Parameters", zh: "释放参数" },
  "release.withdrawDays": { en: "Withdraw Days", zh: "提现天数" },
  "release.simulationDay": { en: "Simulation Day", zh: "模拟天数" },
  "release.calculateDay": { en: "Calculate Day", zh: "计算第X天" },
  "release.dayStatus": { en: "Day Status", zh: "当天状态" },
  "release.treasuryBalance": { en: "Treasury Balance", zh: "国库余额" },
  "release.currentPrice": { en: "Current Price", zh: "当前价格" },
  "release.preview": { en: "Release Preview", zh: "释放预览" },
  "release.taxAmount": { en: "Tax Amount", zh: "税费金额" },
  "release.taxRate": { en: "Tax Rate", zh: "税率" },
  "release.taxB18": { en: "Tax B18", zh: "税费B18" },
  "release.taxUsdt": { en: "Tax USDC Value", zh: "税费USDC价值" },
  "release.taxBuyback": { en: "Tax Buyback Impact", zh: "税费回购影响" },
  "release.confirmRelease": { en: "Confirm Release", zh: "确认释放" },
  "release.cashflow": { en: "Cash Flow Status", zh: "现金流状态" },
  "release.sufficient": { en: "Sufficient", zh: "充足" },
  "release.insufficient": { en: "Insufficient", zh: "不足" },
  "release.queueRequired": { en: "Queue Required", zh: "需要排队" },
  "release.dayPayout": { en: "Day Payout Required", zh: "当天需要支付" },
  
  // Dynamic Rewards
  "rewards.title": { en: "Dynamic Rewards Calculator", zh: "动态奖励计算器" },
  "rewards.desc": { en: "V1-V10 tier cumulative rewards based on team performance", zh: "V1-V10等级累进奖励，基于团队业绩" },
  "rewards.tierTab": { en: "Tier Rewards", zh: "级别奖励" },
  "rewards.layerTab": { en: "Performance Rewards", zh: "业绩奖励" },
  "rewards.memberTier": { en: "Member Tier", zh: "会员等级" },
  "rewards.qualifyingRange": { en: "Qualifying Range", zh: "达标区间" },
  "rewards.teamPerformance": { en: "Team Performance (10K USDC)", zh: "小区业绩（万U）" },
  "rewards.currentTier": { en: "Current Tier", zh: "当前等级" },
  "rewards.rewardRate": { en: "Reward Rate", zh: "奖励比例" },
  "rewards.grossReward": { en: "Gross Reward", zh: "毛奖励" },
  "rewards.releaseTax": { en: "Release Tax", zh: "释放税" },
  "rewards.netReward": { en: "Net Reward", zh: "净奖励" },
  "rewards.rewardFormula": { en: "Reward Formula", zh: "奖励公式" },
  "rewards.performanceTokens": { en: "Performance Tokens", zh: "业绩代币" },
  "rewards.baseReward": { en: "Base Reward", zh: "基础奖励" },
  "rewards.tierReward": { en: "Tier Reward", zh: "级别奖励" },
  "rewards.taxPurchase": { en: "Tax Purchase Required", zh: "需购买税费" },
  "rewards.treasuryPays": { en: "Treasury Pays", zh: "国库支付" },
  "rewards.taxDistribution": { en: "Tax B18 Distribution", zh: "税费B18分配" },
  "rewards.dailyReward": { en: "Daily Reward", zh: "日奖励" },
  "rewards.monthlyReward": { en: "Monthly Reward", zh: "月奖励" },
  "rewards.annualReward": { en: "Annual Reward", zh: "年奖励" },
  "rewards.layerNumber": { en: "Layer", zh: "层" },
  "rewards.layerPerformance": { en: "Layer Performance", zh: "层业绩" },
  "rewards.layerPercent": { en: "Layer Percent", zh: "层比例" },
  "rewards.layerReward": { en: "Layer Reward", zh: "层奖励" },
  "rewards.networkPerformance": { en: "Network Performance", zh: "全网业绩" },
  "rewards.totalLayers": { en: "Total Layers", zh: "总层数" },
  "rewards.addLayer": { en: "Add Layer", zh: "添加层" },
  "rewards.bonusPool": { en: "Bonus Pool", zh: "奖金池" },
  "rewards.performanceRatio": { en: "Performance Ratio", zh: "业绩占比" },
  "rewards.totalPerformance": { en: "Total Performance", zh: "总业绩" },
  "rewards.totalReward": { en: "Total Reward", zh: "总奖励" },
  "rewards.warning": { en: "Warning", zh: "警告" },
  "rewards.exceedsNetwork": { en: "Total exceeds network performance", zh: "总业绩超过全网业绩" },
  
  // Token Distribution
  "distribution.title": { en: "Token Distribution", zh: "代币分布" },
  "distribution.circulation": { en: "Circulation", zh: "流通量" },
  "distribution.delivery": { en: "Delivery Contract", zh: "交付合约" },
  "distribution.burned": { en: "Burned", zh: "已销毁" },
  "distribution.bonusPool": { en: "Bonus Pool", zh: "奖金池" },
  "distribution.lpPool": { en: "LP Pool", zh: "LP池" },
  
  // Summary
  "summary.title": { en: "Calculation Summary", zh: "总计算统计" },
  "summary.stakingInput": { en: "Staking Input", zh: "质押投入" },
  "summary.secondaryMarket": { en: "Secondary Market", zh: "二级市场" },
  "summary.releaseWithdraw": { en: "Release & Withdrawal", zh: "释放提现" },
  "summary.dynamicRewards": { en: "Dynamic Rewards", zh: "动态奖励" },
  "summary.totalInvestment": { en: "Total Investment", zh: "总投入" },
  "summary.netProfit": { en: "Net Profit", zh: "净利润" },
  "summary.totalReturns": { en: "Total Returns", zh: "总收益" },
  "summary.totalTax": { en: "Total Tax", zh: "总税费" },
  "summary.tierAndPerformance": { en: "Tier + Performance", zh: "级别+业绩" },
  "summary.noData": { en: "Complete calculations in tabs below to see summary", zh: "在下方各标签页进行计算后，这里将显示汇总结果" },
  "summary.investment": { en: "Investment", zh: "投入" },
  "summary.profit": { en: "Profit", zh: "利润" },
  "summary.tax": { en: "Tax", zh: "税费" },
  
  // Simulator
  "simulator.title": { en: "Cash Flow Simulator", zh: "现金流模拟" },
  "simulator.desc": { en: "Day-by-day simulation of treasury cash flow with funding protection", zh: "逐日模拟国库现金流，包含资金保护机制" },
  
  // Footer
  "footer.chain": { en: "Base Chain", zh: "Base链" },
  "footer.totalSupply": { en: "Total Supply", zh: "总发行量" },
  "footer.initialCirculation": { en: "Initial Circulation", zh: "初始流通" },
  "footer.deliveryContract": { en: "Delivery Contract", zh: "交付合约" },
  "footer.title": { en: "B18 Token Economics Calculator", zh: "B18 代币经济模型计算器" },
  "footer.stats": { en: "Base Chain | Total: 10.1M | Initial: 100K | Delivery: 10M", zh: "Base链 | 总发行量: 1,010万 | 初始流通: 10万 | 交付合约: 1,000万" },
  
  // Common
  "common.day": { en: "day", zh: "天" },
  "common.days": { en: "days", zh: "天" },
  "common.month": { en: "month", zh: "月" },
  "common.year": { en: "year", zh: "年" },
  "common.daily": { en: "Daily", zh: "日" },
  "common.monthly": { en: "Monthly", zh: "月" },
  "common.annual": { en: "Annual", zh: "年" },
  "common.total": { en: "Total", zh: "总计" },
  "common.net": { en: "Net", zh: "净" },
  "common.gross": { en: "Gross", zh: "毛" },
  "common.rate": { en: "Rate", zh: "率" },
  "common.amount": { en: "Amount", zh: "金额" },
  "common.tokens": { en: "Tokens", zh: "代币" },
  "common.price": { en: "Price", zh: "价格" },
  "common.value": { en: "Value", zh: "价值" },
  "common.balance": { en: "Balance", zh: "余额" },
  "common.status": { en: "Status", zh: "状态" },
  "common.times30": { en: "x30", zh: "x30" },
  "common.times360": { en: "x360", zh: "x360" },
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>("zh");

  const toggleLanguage = useCallback(() => {
    setLanguage((prev) => (prev === "en" ? "zh" : "en"));
  }, []);

  const t = useCallback(
    (key: string): string => {
      const translation = translations[key];
      if (!translation) {
        console.warn(`Missing translation for key: ${key}`);
        return key;
      }
      return translation[language];
    },
    [language]
  );

  return (
    <LanguageContext.Provider value={{ language, setLanguage, toggleLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
}
