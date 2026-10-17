import React, { useState } from 'react';
import { Calculator, Check, Copy, RotateCcw, X } from 'lucide-react';

interface CalculatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApply?: (val: number) => void;
  onInsert?: (val: number) => void;
  initialValue?: number | string;
}

export const CalculatorModal: React.FC<CalculatorModalProps> = ({
  isOpen,
  onClose,
  onApply,
  onInsert,
  initialValue,
}) => {
  const [expression, setExpression] = useState<string>(
    initialValue && initialValue !== 0 ? String(initialValue) : ''
  );
  const [result, setResult] = useState<string>('');
  const [history, setHistory] = useState<string[]>([]);

  if (!isOpen) return null;

  const handleChar = (ch: string) => {
    setExpression((prev) => prev + ch);
  };

  const handleClear = () => {
    setExpression('');
    setResult('');
  };

  const handleBackspace = () => {
    setExpression((prev) => prev.slice(0, -1));
  };

  const calculate = () => {
    try {
      if (!expression.trim()) return;
      // Sanitize expression: allow only numbers and math operators
      const sanitized = expression.replace(/[^0-9+\-*/.() ]/g, '');
      // Evaluate math expression securely
      const evalFn = new Function(`return (${sanitized})`);
      const res = evalFn();
      if (typeof res === 'number' && !isNaN(res) && isFinite(res)) {
        // Format to max 4 decimals if needed
        const rounded = Math.round(res * 10000) / 10000;
        const resStr = String(rounded);
        setResult(resStr);
        setHistory((prev) => [`${expression} = ${resStr}`, ...prev.slice(0, 4)]);
      } else {
        setResult('Erreur');
      }
    } catch {
      setResult('Erreur');
    }
  };

  const handleApply = () => {
    const callback = onInsert || onApply;
    if (result && result !== 'Erreur') {
      callback?.(parseFloat(result));
      onClose();
    } else {
      calculate();
      try {
        const sanitized = expression.replace(/[^0-9+\-*/.() ]/g, '');
        const res = new Function(`return (${sanitized})`)();
        if (typeof res === 'number' && !isNaN(res)) {
          callback?.(Math.round(res * 10000) / 10000);
          onClose();
        }
      } catch {
        // keep open
      }
    }
  };

  const buttons = [
    ['C', '(', ')', '/'],
    ['7', '8', '9', '*'],
    ['4', '5', '6', '-'],
    ['1', '2', '3', '+'],
    ['0', '.', 'DEL', '='],
  ];

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-xs overflow-hidden animate-in fade-in zoom-in-95">
        {/* Header */}
        <div className="px-4 py-3 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calculator className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-bold tracking-wide">Calculatrice Intégrée</span>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-white rounded">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Display Screen */}
        <div className="p-4 bg-slate-950 text-right space-y-1">
          <div className="text-xs text-slate-400 font-mono min-h-[1.25rem] overflow-x-auto truncate">
            {expression || '0'}
          </div>
          <div className="text-2xl font-black font-mono text-emerald-400 tabular-nums">
            {result || '= ' + (expression || '0')}
          </div>
        </div>

        {/* Recent History */}
        {history.length > 0 && (
          <div className="px-4 py-1.5 bg-slate-100 dark:bg-slate-800/60 text-[10px] text-slate-500 font-mono border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <span>Dernier: {history[0]}</span>
            <button
              type="button"
              onClick={() => setExpression(history[0].split('=')[1]?.trim() || '')}
              className="text-emerald-600 hover:underline flex items-center gap-0.5"
            >
              <RotateCcw className="w-3 h-3" /> Réutiliser
            </button>
          </div>
        )}

        {/* Keypad */}
        <div className="p-3 grid grid-cols-4 gap-2 bg-slate-50 dark:bg-slate-900">
          {buttons.flat().map((btn, idx) => {
            const isOperator = ['+', '-', '*', '/', '='].includes(btn);
            const isAction = ['C', 'DEL'].includes(btn);

            return (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  if (btn === 'C') handleClear();
                  else if (btn === 'DEL') handleBackspace();
                  else if (btn === '=') calculate();
                  else handleChar(btn);
                }}
                className={`py-3 rounded-xl font-mono text-sm font-bold transition-all active:scale-95 shadow-2xs ${
                  btn === '='
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white col-span-1 shadow-md'
                    : isAction
                    ? 'bg-rose-100 hover:bg-rose-200 dark:bg-rose-950 dark:hover:bg-rose-900 text-rose-700 dark:text-rose-300'
                    : isOperator
                    ? 'bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-blue-600 dark:text-blue-400'
                    : 'bg-white hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 border border-slate-200/80 dark:border-slate-700'
                }`}
              >
                {btn}
              </button>
            );
          })}
        </div>

        {/* Actions Footer */}
        {onApply && (
          <div className="p-3 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => {
                calculate();
                navigator.clipboard?.writeText(result || expression);
              }}
              className="px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg flex items-center gap-1"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>Copier</span>
            </button>
            <button
              type="button"
              onClick={handleApply}
              className="px-4 py-2 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg flex items-center gap-1.5 shadow-xs"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Insérer le résultat</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
