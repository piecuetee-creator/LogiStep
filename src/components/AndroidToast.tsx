import React, { useEffect, useState } from 'react';
import { Radio, CheckCircle2 } from 'lucide-react';

export const AndroidToast: React.FC = () => {
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    const handleToast = (e: any) => {
      const msg = e.detail?.message;
      if (msg) {
        setToastMessage(msg);
      }
    };

    window.addEventListener('logistep-toast', handleToast);
    return () => window.removeEventListener('logistep-toast', handleToast);
  }, []);

  useEffect(() => {
    if (!toastMessage) return;
    const timer = setTimeout(() => {
      setToastMessage(null);
    }, 3200);
    return () => clearTimeout(timer);
  }, [toastMessage]);

  if (!toastMessage) return null;

  return (
    <div className="fixed bottom-16 left-1/2 -translate-x-1/2 z-50 pointer-events-none px-4 max-w-sm w-full animate-in fade-in slide-in-from-bottom-4 duration-200">
      <div className="bg-slate-900/95 backdrop-blur-md border border-orange-500/40 text-white px-4 py-2.5 rounded-2xl shadow-2xl flex items-center gap-3">
        <div className="w-6 h-6 rounded-lg bg-orange-500/20 text-orange-400 flex items-center justify-center shrink-0">
          <CheckCircle2 className="w-4 h-4" />
        </div>
        <p className="text-xs font-semibold text-slate-200 leading-snug">
          {toastMessage}
        </p>
      </div>
    </div>
  );
};
