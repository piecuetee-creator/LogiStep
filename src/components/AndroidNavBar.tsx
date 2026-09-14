import React from 'react';
import { Truck, MapPin, History, Terminal, Settings } from 'lucide-react';
import { triggerHapticFeedback } from '../utils/androidBridge';
import { LanguageCode } from '../types';

interface Props {
  activeTab: 'steps' | 'location' | 'history' | 'logs' | 'settings';
  onChangeTab: (tab: 'steps' | 'location' | 'history' | 'logs' | 'settings') => void;
  lang: LanguageCode;
  tripRecordsCount: number;
}

export const AndroidNavBar: React.FC<Props> = ({
  activeTab,
  onChangeTab,
  lang,
  tripRecordsCount,
}) => {
  const handleTabClick = (tab: 'steps' | 'location' | 'history' | 'logs' | 'settings') => {
    triggerHapticFeedback(15);
    onChangeTab(tab);
  };

  const labels = {
    en: { steps: 'Trip Steps', location: 'GPS & Hub', history: 'Trip Log', logs: 'GT06 AVL', settings: 'Driver' },
    ur: { steps: 'مراحل', location: 'مقام', history: 'ریکارڈ', logs: 'پروٹوکول', settings: 'ڈرائیور' },
    ps: { steps: 'ګامونه', location: 'ځای', history: 'ریکارډ', logs: 'پروټوکول', settings: 'موټر چلوونکی' },
  }[lang] || { steps: 'Trip Steps', location: 'GPS & Hub', history: 'Trip Log', logs: 'GT06 AVL', settings: 'Driver' };

  return (
    <nav className="sticky bottom-0 left-0 right-0 z-40 bg-slate-950/95 backdrop-blur-lg border-t border-slate-800/80 px-2 py-1.5 flex items-center justify-around shadow-2xl select-none">
      <button
        type="button"
        onClick={() => handleTabClick('steps')}
        className={`flex flex-col items-center gap-1 py-1.5 px-3 rounded-2xl transition-all active:scale-95 ${
          activeTab === 'steps'
            ? 'text-orange-400 font-bold'
            : 'text-slate-400 hover:text-slate-200 font-medium'
        }`}
      >
        <div
          className={`w-9 h-7 rounded-xl flex items-center justify-center transition-colors ${
            activeTab === 'steps' ? 'bg-orange-500/20' : 'bg-transparent'
          }`}
        >
          <Truck className="w-5 h-5" />
        </div>
        <span className="text-[10px] tracking-tight">{labels.steps}</span>
      </button>

      <button
        type="button"
        onClick={() => handleTabClick('location')}
        className={`flex flex-col items-center gap-1 py-1.5 px-3 rounded-2xl transition-all active:scale-95 ${
          activeTab === 'location'
            ? 'text-orange-400 font-bold'
            : 'text-slate-400 hover:text-slate-200 font-medium'
        }`}
      >
        <div
          className={`w-9 h-7 rounded-xl flex items-center justify-center transition-colors ${
            activeTab === 'location' ? 'bg-orange-500/20' : 'bg-transparent'
          }`}
        >
          <MapPin className="w-5 h-5" />
        </div>
        <span className="text-[10px] tracking-tight">{labels.location}</span>
      </button>

      <button
        type="button"
        onClick={() => handleTabClick('history')}
        className={`relative flex flex-col items-center gap-1 py-1.5 px-3 rounded-2xl transition-all active:scale-95 ${
          activeTab === 'history'
            ? 'text-orange-400 font-bold'
            : 'text-slate-400 hover:text-slate-200 font-medium'
        }`}
      >
        <div
          className={`relative w-9 h-7 rounded-xl flex items-center justify-center transition-colors ${
            activeTab === 'history' ? 'bg-orange-500/20' : 'bg-transparent'
          }`}
        >
          <History className="w-5 h-5" />
          {tripRecordsCount > 0 && (
            <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full bg-orange-500 text-slate-950 font-black text-[9px] flex items-center justify-center">
              {tripRecordsCount}
            </span>
          )}
        </div>
        <span className="text-[10px] tracking-tight">{labels.history}</span>
      </button>

      <button
        type="button"
        onClick={() => handleTabClick('logs')}
        className={`flex flex-col items-center gap-1 py-1.5 px-3 rounded-2xl transition-all active:scale-95 ${
          activeTab === 'logs'
            ? 'text-orange-400 font-bold'
            : 'text-slate-400 hover:text-slate-200 font-medium'
        }`}
      >
        <div
          className={`w-9 h-7 rounded-xl flex items-center justify-center transition-colors ${
            activeTab === 'logs' ? 'bg-orange-500/20' : 'bg-transparent'
          }`}
        >
          <Terminal className="w-5 h-5" />
        </div>
        <span className="text-[10px] tracking-tight">{labels.logs}</span>
      </button>

      <button
        type="button"
        onClick={() => handleTabClick('settings')}
        className={`flex flex-col items-center gap-1 py-1.5 px-3 rounded-2xl transition-all active:scale-95 ${
          activeTab === 'settings'
            ? 'text-orange-400 font-bold'
            : 'text-slate-400 hover:text-slate-200 font-medium'
        }`}
      >
        <div
          className={`w-9 h-7 rounded-xl flex items-center justify-center transition-colors ${
            activeTab === 'settings' ? 'bg-orange-500/20' : 'bg-transparent'
          }`}
        >
          <Settings className="w-5 h-5" />
        </div>
        <span className="text-[10px] tracking-tight">{labels.settings}</span>
      </button>
    </nav>
  );
};
