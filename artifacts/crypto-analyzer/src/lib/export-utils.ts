/**
 * B18 Simulator Export Utilities
 * 导出工具 - 支持 CSV 和 PDF 格式
 */

import type { SimulationStore } from '@/stores/simulation-store';

// ============================================================
// CSV 导出
// ============================================================

export function exportToCsv(data: ReturnType<SimulationStore['exportData']>): void {
  const { system, investments, releaseHistory, time, calculations } = data;

  let csv = '';

  // BOM for Excel UTF-8
  csv += '\uFEFF';

  // 标题
  csv += 'B18 Token Simulator Export Report\n';
  csv += `Export Time: ${data.exportTime}\n`;
  csv += `Current Simulation Day: ${time.currentDay}\n`;
  csv += '\n';

  // 系统状态
  csv += '=== System State ===\n';
  csv += 'Metric,Value,Unit\n';
  csv += `Token Price,${system.tokenPrice.toFixed(4)},USDC\n`;
  csv += `Initial Price,${system.initialTokenPrice.toFixed(4)},USDC\n`;
  csv += `Price Change,${((system.tokenPrice - system.initialTokenPrice) / system.initialTokenPrice * 100).toFixed(2)},%\n`;
  csv += `LP Pool Tokens,${system.lpPoolTokens.toFixed(2)},B18\n`;
  csv += `LP Pool USDT,${system.lpPoolUsdt.toFixed(2)},USDC\n`;
  csv += `Treasury Balance,${system.treasuryBalance.toFixed(2)},USDC\n`;
  csv += `Vesting (Delivery) Balance,${system.vestingBalance.toFixed(2)},B18\n`;
  csv += `Bonus Pool Balance,${system.bonusPoolBalance.toFixed(2)},B18\n`;
  csv += `SPP USDC Balance,${system.sppBalance.toFixed(2)},USDC\n`;
  csv += `SPP Held B18,${system.sppHeldB18.toFixed(2)},B18\n`;
  csv += `Total Burned,${system.totalBurned.toFixed(2)},B18\n`;
  csv += `Circulating Supply,${system.circulatingSupply.toFixed(2)},B18\n`;
  csv += `Total Investment,${system.totalInvestment.toFixed(2)},USDC\n`;
  csv += `Total Released,${system.totalReleased.toFixed(2)},USDC\n`;
  csv += `Scheduled Release,${system.totalScheduledRelease.toFixed(2)},USDC\n`;
  csv += `Pending Withdrawals,${system.pendingWithdrawals.toFixed(2)},USDC\n`;
  csv += '\n';

  // 计算摘要
  csv += '=== Calculation Summary ===\n';
  csv += 'Metric,Value\n';
  csv += `Staking Purchase USDT,$${calculations.stakingPurchaseUsdt.toFixed(2)}\n`;
  csv += `Staking Tokens,${calculations.stakingTokens.toFixed(2)} B18\n`;
  csv += `Staking Interest,$${calculations.stakingInterest.toFixed(2)}\n`;
  csv += `Staking Total Value,$${calculations.stakingTotalValue.toFixed(2)}\n`;
  csv += `Staking Total Tokens,${calculations.stakingTotalTokens.toFixed(2)} B18\n`;
  csv += `Staking Period,${calculations.stakingPeriodDays} days\n`;
  csv += `Staking Daily Rate,${(calculations.stakingDailyRate * 100).toFixed(2)}%\n`;
  csv += `Release Days,${calculations.releaseDays} days\n`;
  csv += `Release Tax Rate,${(calculations.stakingReleaseTax * 100).toFixed(2)}%\n`;
  csv += '\n';

  // 投资记录
  csv += '=== Investment Records ===\n';
  csv += 'ID,Timestamp,Investment (USDC),Tokens Purchased,Staking Days,Release Days,Daily Rate,Compound,Total Tokens After Staking,Daily Release (USDC),Tax Rate,Released Days,Total Released (USDC),Status\n';
  investments.forEach(inv => {
    csv += `${inv.id},${new Date(inv.timestamp).toISOString()},${inv.investmentUsdc.toFixed(2)},${inv.tokensPurchased.toFixed(2)},${inv.stakingPeriodDays},${inv.releasePeriodDays},${(inv.dailyRate * 100).toFixed(2)}%,${inv.useCompound},${inv.totalTokensAfterStaking.toFixed(2)},${inv.dailyReleaseUsdc.toFixed(2)},${(inv.taxRate * 100).toFixed(1)}%,${inv.releasedDays},${inv.totalReleasedUsdc.toFixed(2)},${inv.status}\n`;
  });
  csv += '\n';

  // 释放历史
  csv += '=== Release History ===\n';
  csv += 'Day,Investment ID,Tokens Released,Gross USDC,Tax USDC,Net USDC,To Delivery Contract,To Burn,To Bonus Pool,To SPP,Price Before,Price After\n';
  releaseHistory.forEach(rec => {
    csv += `${rec.day},${rec.investmentId},${rec.tokensReleased.toFixed(4)},${rec.grossUsdc.toFixed(2)},${rec.taxUsdc.toFixed(2)},${rec.netUsdc.toFixed(2)},${rec.toDeliveryContract.toFixed(4)},${rec.toBurn.toFixed(4)},${rec.toBonusPool.toFixed(4)},${rec.toSpp.toFixed(4)},${rec.priceBeforeRelease.toFixed(4)},${rec.priceAfterRelease.toFixed(4)}\n`;
  });

  // 下载文件
  downloadFile(csv, `b18-simulation-${formatDateForFilename()}.csv`, 'text/csv;charset=utf-8');
}

// ============================================================
// PDF 导出
// ============================================================

export async function exportToPdf(data: ReturnType<SimulationStore['exportData']>): Promise<void> {
  // 动态导入 jsPDF
  const { default: jsPDF } = await import('jspdf');
  const autoTable = (await import('jspdf-autotable')).default;

  const { system, investments, releaseHistory, time, calculations } = data;

  const doc = new jsPDF();

  // 标题
  doc.setFontSize(20);
  doc.setTextColor(40, 40, 40);
  doc.text('B18 Token Simulator Report', 14, 22);

  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`Export Time: ${data.exportTime}`, 14, 30);
  doc.text(`Current Simulation Day: ${time.currentDay}`, 14, 36);

  let yPos = 45;

  // 系统状态表格
  doc.setFontSize(14);
  doc.setTextColor(40);
  doc.text('System State', 14, yPos);
  yPos += 8;

  const systemData = [
    ['Token Price', `$${system.tokenPrice.toFixed(4)}`],
    ['Price Change', `${((system.tokenPrice - system.initialTokenPrice) / system.initialTokenPrice * 100).toFixed(2)}%`],
    ['LP Pool Tokens', `${formatNumber(system.lpPoolTokens)} B18`],
    ['LP Pool USDT', `$${formatNumber(system.lpPoolUsdt)}`],
    ['Treasury Balance', `$${formatNumber(system.treasuryBalance)}`],
    ['Vesting Balance', `${formatNumber(system.vestingBalance)} B18`],
    ['Bonus Pool', `${formatNumber(system.bonusPoolBalance)} B18`],
    ['SPP USDC', `$${formatNumber(system.sppBalance)}`],
    ['SPP B18', `${formatNumber(system.sppHeldB18)} B18`],
    ['Total Burned', `${formatNumber(system.totalBurned)} B18`],
    ['Circulating Supply', `${formatNumber(system.circulatingSupply)} B18`],
    ['Total Investment', `$${formatNumber(system.totalInvestment)}`],
    ['Total Released', `$${formatNumber(system.totalReleased)}`],
  ];

  autoTable(doc, {
    startY: yPos,
    head: [['Metric', 'Value']],
    body: systemData,
    theme: 'striped',
    headStyles: { fillColor: [59, 130, 246] },
    margin: { left: 14 },
    tableWidth: 90,
  });

  // @ts-ignore
  yPos = doc.lastAutoTable.finalY + 15;

  // 投资汇总
  if (yPos > 240) {
    doc.addPage();
    yPos = 20;
  }

  doc.setFontSize(14);
  doc.text('Investment Summary', 14, yPos);
  yPos += 8;

  const investmentSummary = [
    ['Total Investments', investments.length.toString()],
    ['Active (Releasing)', investments.filter(i => i.status === 'releasing').length.toString()],
    ['Completed', investments.filter(i => i.status === 'completed').length.toString()],
    ['Total Invested', `$${formatNumber(system.totalInvestment)}`],
    ['Total Released', `$${formatNumber(system.totalReleased)}`],
    ['Scheduled Release', `$${formatNumber(system.totalScheduledRelease)}`],
    ['Release Progress', `${(system.totalScheduledRelease > 0 ? (system.totalReleased / system.totalScheduledRelease * 100) : 0).toFixed(1)}%`],
  ];

  autoTable(doc, {
    startY: yPos,
    head: [['Metric', 'Value']],
    body: investmentSummary,
    theme: 'striped',
    headStyles: { fillColor: [34, 197, 94] },
    margin: { left: 14 },
    tableWidth: 90,
  });

  // @ts-ignore
  yPos = doc.lastAutoTable.finalY + 15;

  // 投资明细
  if (investments.length > 0) {
    if (yPos > 220) {
      doc.addPage();
      yPos = 20;
    }

    doc.setFontSize(14);
    doc.text('Investment Details', 14, yPos);
    yPos += 8;

    const investmentData = investments.map(inv => [
      inv.id.slice(0, 8) + '...',
      `$${formatNumber(inv.investmentUsdc)}`,
      `${inv.stakingPeriodDays}d`,
      `${inv.releasePeriodDays}d`,
      `${(inv.taxRate * 100).toFixed(0)}%`,
      `$${formatNumber(inv.dailyReleaseUsdc)}`,
      inv.status,
    ]);

    autoTable(doc, {
      startY: yPos,
      head: [['ID', 'Invested', 'Stake', 'Release', 'Tax', 'Daily', 'Status']],
      body: investmentData,
      theme: 'striped',
      headStyles: { fillColor: [168, 85, 247] },
      margin: { left: 14 },
      styles: { fontSize: 8 },
    });

    // @ts-ignore
    yPos = doc.lastAutoTable.finalY + 15;
  }

  // 释放历史摘要 (最近20条)
  if (releaseHistory.length > 0) {
    if (yPos > 200) {
      doc.addPage();
      yPos = 20;
    }

    doc.setFontSize(14);
    doc.text(`Release History (Last ${Math.min(20, releaseHistory.length)} records)`, 14, yPos);
    yPos += 8;

    const recentReleases = releaseHistory.slice(-20);
    const releaseData = recentReleases.map(rec => [
      rec.day.toString(),
      `$${rec.grossUsdc.toFixed(2)}`,
      `$${rec.taxUsdc.toFixed(2)}`,
      `$${rec.netUsdc.toFixed(2)}`,
      `$${rec.priceAfterRelease.toFixed(4)}`,
    ]);

    autoTable(doc, {
      startY: yPos,
      head: [['Day', 'Gross', 'Tax', 'Net', 'Price After']],
      body: releaseData,
      theme: 'striped',
      headStyles: { fillColor: [249, 115, 22] },
      margin: { left: 14 },
      styles: { fontSize: 8 },
    });
  }

  // 添加页脚
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(
      `B18 Simulator - Page ${i} of ${pageCount}`,
      doc.internal.pageSize.width / 2,
      doc.internal.pageSize.height - 10,
      { align: 'center' }
    );
  }

  // 保存
  doc.save(`b18-simulation-${formatDateForFilename()}.pdf`);
}

// ============================================================
// 辅助函数
// ============================================================

function formatNumber(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(2) + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(2) + 'K';
  }
  return num.toFixed(2);
}

function formatDateForFilename(): string {
  const now = new Date();
  return now.toISOString().slice(0, 19).replace(/[T:]/g, '-');
}

function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// ============================================================
// 导出 JSON
// ============================================================

export function exportToJson(data: ReturnType<SimulationStore['exportData']>): void {
  const jsonString = JSON.stringify(data, null, 2);
  downloadFile(jsonString, `b18-simulation-${formatDateForFilename()}.json`, 'application/json');
}
