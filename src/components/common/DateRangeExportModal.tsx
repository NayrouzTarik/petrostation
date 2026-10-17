import React, { useState } from 'react';
import { Calendar, Download, FileSpreadsheet, X } from 'lucide-react';
import { formatDateDMY } from '../../utils/dateUtils.ts';

interface DateRangeExportModalProps {
  isOpen: boolean;
  title: string;
  subtitle?: string;
  onClose: () => void;
  onExport: (startDate: string, endDate: string) => void;
}

export const DateRangeExportModal: React.FC<DateRangeExportModalProps> = ({
  isOpen,
  title,
  subtitle = 'Sélectionnez la période pour filtrer les données du fichier Excel (JJ/MM/AA)',
  onClose,
  onExport,
}) => {
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(1); // 1st of current month
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onExport(startDate, endDate);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95">
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 rounded-lg">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">{title}</h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">{subtitle}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Date de début
              </label>
              <div className="relative">
                <input
                  type="date"
                  required
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-950 font-mono text-slate-900 dark:text-slate-100"
                />
              </div>
              <span className="text-[10px] text-slate-400 mt-1 block">
                Format: <strong className="font-mono text-slate-600 dark:text-slate-300">{formatDateDMY(startDate)}</strong>
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Date de fin
              </label>
              <div className="relative">
                <input
                  type="date"
                  required
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-950 font-mono text-slate-900 dark:text-slate-100"
                />
              </div>
              <span className="text-[10px] text-slate-400 mt-1 block">
                Format: <strong className="font-mono text-slate-600 dark:text-slate-300">{formatDateDMY(endDate)}</strong>
              </span>
            </div>
          </div>

          <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-lg border border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>
              Période sélectionnée : du <strong>{formatDateDMY(startDate)}</strong> au <strong>{formatDateDMY(endDate)}</strong>
            </span>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-lg"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg flex items-center gap-1.5 shadow-xs"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Exporter vers Excel (.xlsx)</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
