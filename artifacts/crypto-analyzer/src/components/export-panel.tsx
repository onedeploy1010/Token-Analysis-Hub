/**
 * Export Panel Component
 * 导出面板 - 支持 CSV, PDF, JSON 格式
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Download, FileSpreadsheet, FileText, FileJson, Loader2, CheckCircle2 } from 'lucide-react';
import { useLanguage } from '@/contexts/language-context';
import { useSimulationStore } from '@/stores/simulation-store';
import { exportToCsv, exportToPdf, exportToJson } from '@/lib/export-utils';

export function ExportPanel() {
  const { language } = useLanguage();
  const [isExporting, setIsExporting] = useState(false);
  const [exportType, setExportType] = useState<string | null>(null);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);

  const exportData = useSimulationStore(state => state.exportData);

  const handleExport = async (type: 'csv' | 'pdf' | 'json') => {
    setIsExporting(true);
    setExportType(type);

    try {
      const data = exportData();

      switch (type) {
        case 'csv':
          exportToCsv(data);
          break;
        case 'pdf':
          await exportToPdf(data);
          break;
        case 'json':
          exportToJson(data);
          break;
      }

      setShowSuccessDialog(true);
      setTimeout(() => setShowSuccessDialog(false), 2000);
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setIsExporting(false);
      setExportType(null);
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1.5"
            disabled={isExporting}
          >
            {isExporting ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Download className="h-3.5 w-3.5" />
            )}
            <span className="text-xs">
              {language === 'zh' ? '导出' : 'Export'}
            </span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuLabel className="text-xs">
            {language === 'zh' ? '选择格式' : 'Select Format'}
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => handleExport('csv')}
            disabled={isExporting}
            className="gap-2"
          >
            <FileSpreadsheet className="h-4 w-4 text-green-600" />
            <div className="flex flex-col">
              <span>CSV</span>
              <span className="text-[10px] text-muted-foreground">
                {language === 'zh' ? 'Excel 兼容' : 'Excel compatible'}
              </span>
            </div>
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => handleExport('pdf')}
            disabled={isExporting}
            className="gap-2"
          >
            <FileText className="h-4 w-4 text-red-600" />
            <div className="flex flex-col">
              <span>PDF</span>
              <span className="text-[10px] text-muted-foreground">
                {language === 'zh' ? '打印报告' : 'Print report'}
              </span>
            </div>
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => handleExport('json')}
            disabled={isExporting}
            className="gap-2"
          >
            <FileJson className="h-4 w-4 text-blue-600" />
            <div className="flex flex-col">
              <span>JSON</span>
              <span className="text-[10px] text-muted-foreground">
                {language === 'zh' ? '完整数据' : 'Full data'}
              </span>
            </div>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
        <DialogContent className="max-w-[200px] p-4">
          <DialogHeader className="items-center">
            <CheckCircle2 className="h-10 w-10 text-green-500 mb-2" />
            <DialogTitle className="text-sm">
              {language === 'zh' ? '导出成功' : 'Export Complete'}
            </DialogTitle>
            <DialogDescription className="text-xs text-center">
              {exportType?.toUpperCase()} {language === 'zh' ? '文件已下载' : 'downloaded'}
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    </>
  );
}

/**
 * 内联导出按钮 - 用于卡片内
 */
export function ExportButtons({ onExport }: { onExport?: (type: 'csv' | 'pdf' | 'json') => void }) {
  const { language } = useLanguage();
  const [isExporting, setIsExporting] = useState(false);

  const exportData = useSimulationStore(state => state.exportData);

  const handleExport = async (type: 'csv' | 'pdf' | 'json') => {
    setIsExporting(true);
    try {
      const data = exportData();
      switch (type) {
        case 'csv':
          exportToCsv(data);
          break;
        case 'pdf':
          await exportToPdf(data);
          break;
        case 'json':
          exportToJson(data);
          break;
      }
      onExport?.(type);
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="flex gap-1">
      <Button
        variant="outline"
        size="sm"
        className="h-7 px-2 text-[10px] gap-1"
        onClick={() => handleExport('csv')}
        disabled={isExporting}
      >
        <FileSpreadsheet className="h-3 w-3" />
        CSV
      </Button>
      <Button
        variant="outline"
        size="sm"
        className="h-7 px-2 text-[10px] gap-1"
        onClick={() => handleExport('pdf')}
        disabled={isExporting}
      >
        <FileText className="h-3 w-3" />
        PDF
      </Button>
      <Button
        variant="outline"
        size="sm"
        className="h-7 px-2 text-[10px] gap-1"
        onClick={() => handleExport('json')}
        disabled={isExporting}
      >
        <FileJson className="h-3 w-3" />
        JSON
      </Button>
    </div>
  );
}
