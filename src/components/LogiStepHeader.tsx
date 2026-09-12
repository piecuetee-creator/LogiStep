import React from 'react';
import { TripDirection, LanguageCode, ConnectionStatus } from '../types';
import { UI_TEXT } from '../utils/i18n';
import {
  ArrowUpRight,
  ArrowDownLeft,
  Terminal,
  FileSpreadsheet,
  Settings,
  Radio,
  Sparkles,
} from 'lucide-react';

interface Props {
  direction: TripDirection;
  onDirectionChange: (dir: TripDirection) => void;
  lang: LanguageCode;
  onLangChange: (lang: LanguageCode) => void;
  connectionStatus: ConnectionStatus;
  completedStepsCount: number;
  onOpenHistory: () => void;
  onOpenLogs: () => void;
  onOpenSettings: () => void;
}

export const LogiStepHeader: React.FC<Props> = ({
  direction,
  onDirectionChange,
  lang,
  onLangChange,
  connectionStatus,
  completedStepsCount,
  onOpenHistory,
  onOpenLogs,
  onOpenSettings,
}) => {
  const t = UI_TEXT[lang] || UI_TEXT.en;
  const isRtl = lang === 'ur' || lang === 'ps';

  return (
    <header className="sticky top-0 z-30 bg-slate-900/90 backdrop-blur-md border-b border-slate-800/80 px-3 sm:px-6 py-3">
      <div className="max-w-7xl mx-auto flex flex-col gap-3">
        {/* Top bar: Brand + Language + Status + Quick Tools */}
        <div className="flex items-center justify-between gap-2">
          {/* Logo & Brand */}
          <div className="flex items-center gap-3">
            <div className="relative flex items-center justify-center w-11 h-11 rounded-xl bg-gradient-to-br from-amber-500 via-orange-600 to-amber-700 shadow-lg shadow-amber-500/20 text-slate-950 font-black text-xl tracking-tighter border border-amber-400/40">
              <span>LS</span>
              {/* Telematics Pulse Dot */}
              <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500 border-2 border-slate-900"></span>
              </span>
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-1.5">
                  Logi<span className="text-amber-400">Step</span>
                </h1>
                <span className="hidden sm:inline-flex px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30">
                  GT06 AVL
                </span>
              </div>
              <p className="text-xs text-slate-400 font-medium leading-none">
                {t.appSubtitle} • <span className="text-slate-300">VTP Fleet</span>
              </p>
            </div>
          </div>

          {/* Right utility actions: Language Toggle + Modals */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Language Switcher */}
            <div className="flex items-center bg-slate-800/90 p-1 rounded-xl border border-slate-700/60 text-xs font-semibold">
              <button
                type="button"
                onClick={() => onLangChange('en')}
                className={`px-2 py-1 rounded-lg transition-all ${
                  lang === 'en'
                    ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                    : 'text-slate-300 hover:text-white'
                }`}
                title="English"
              >
                EN
              </button>
              <button
                type="button"
                onClick={() => onLangChange('ur')}
                className={`px-2 py-1 rounded-lg transition-all ${
                  lang === 'ur'
                    ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                    : 'text-slate-300 hover:text-white'
                }`}
                title="اردو"
              >
                اردو
              </button>
              <button
                type="button"
                onClick={() => onLangChange('ps')}
                className={`px-2 py-1 rounded-lg transition-all ${
                  lang === 'ps'
                    ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                    : 'text-slate-300 hover:text-white'
                }`}
                title="پښتو"
              >
                پښتو
              </button>
            </div>

            {/* Trip Sheet / History button */}
            <button
              type="button"
              onClick={onOpenHistory}
              className="relative p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 hover:text-white border border-slate-700/70 transition-colors"
              title={t.historyBtn}
            >
              <FileSpreadsheet className="w-5 h-5" />
              {completedStepsCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-emerald-500 text-slate-950 text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center shadow-md">
                  {completedStepsCount}
                </span>
              )}
            </button>

            {/* GT06 Logs button */}
            <button
              type="button"
              onClick={onOpenLogs}
              className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 hover:text-white border border-slate-700/70 transition-colors"
              title={t.logsBtn}
            >
              <Terminal className="w-5 h-5" />
            </button>

            {/* Settings button */}
            <button
              type="button"
              onClick={onOpenSettings}
              className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 hover:text-white border border-slate-700/70 transition-colors"
              title={t.settingsBtn}
            >
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Direction Selector: UP vs DOWN (Crucial Boss Requirement!) */}
        <div className="bg-slate-950/70 p-2 sm:p-2.5 rounded-2xl border border-slate-800/90 shadow-inner">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase font-bold tracking-wider text-slate-400 flex items-center gap-1.5">
                <Radio className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                {t.direction}:
              </span>
              <span className="text-[11px] font-medium text-slate-400">
                {direction === 'UP' ? 'Ignition = 1 (ACC ON)' : 'Ignition = 0 (ACC OFF)'}
              </span>
            </div>

            {/* UP & DOWN Toggle Buttons */}
            <div className="grid grid-cols-2 gap-2 sm:w-auto">
              {/* UP Button */}
              <button
                type="button"
                onClick={() => onDirectionChange('UP')}
                className={`relative flex items-center gap-2 px-3 sm:px-5 py-2.5 rounded-xl text-left transition-all border ${
                  direction === 'UP'
                    ? 'bg-gradient-to-r from-emerald-600 to-emerald-700 text-white border-emerald-400/70 shadow-lg shadow-emerald-500/20 font-bold'
                    : 'bg-slate-900/90 hover:bg-slate-800 text-slate-300 border-slate-800 font-medium'
                }`}
              >
                <div
                  className={`p-1 rounded-lg ${
                    direction === 'UP' ? 'bg-emerald-950/50 text-white' : 'bg-slate-800 text-emerald-400'
                  }`}
                >
                  <ArrowUpRight className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs sm:text-sm font-extrabold flex items-center gap-1.5">
                    <span>{t.upLabel}</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-black/30 text-emerald-200">
                      IGN 1
                    </span>
                  </div>
                  <div className="text-[10px] opacity-80 truncate">{t.upSub}</div>
                </div>
              </button>

              {/* DOWN Button */}
              <button
                type="button"
                onClick={() => onDirectionChange('DOWN')}
                className={`relative flex items-center gap-2 px-3 sm:px-5 py-2.5 rounded-xl text-left transition-all border ${
                  direction === 'DOWN'
                    ? 'bg-gradient-to-r from-amber-600 to-amber-700 text-white border-amber-400/70 shadow-lg shadow-amber-500/20 font-bold'
                    : 'bg-slate-900/90 hover:bg-slate-800 text-slate-300 border-slate-800 font-medium'
                }`}
              >
                <div
                  className={`p-1 rounded-lg ${
                    direction === 'DOWN' ? 'bg-amber-950/50 text-white' : 'bg-slate-800 text-amber-400'
                  }`}
                >
                  <ArrowDownLeft className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs sm:text-sm font-extrabold flex items-center gap-1.5">
                    <span>{t.downLabel}</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-black/30 text-amber-200">
                      IGN 0
                    </span>
                  </div>
                  <div className="text-[10px] opacity-80 truncate">{t.downSub}</div>
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
