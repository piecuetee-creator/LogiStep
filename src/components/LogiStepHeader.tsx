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
  LogOut,
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
  onLogout?: () => void;
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
  onLogout,
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
            <div className="relative flex items-center justify-center w-12 h-12 rounded-2xl overflow-hidden border border-amber-500/40 shadow-lg shadow-amber-500/20 bg-slate-950 flex-shrink-0 group">
              <img
                src="/logo.png"
                alt="LogiStep Logo"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src = '/icon.svg';
                }}
              />
              {/* Telematics Pulse Dot */}
              <span className="absolute -top-0.5 -right-0.5 flex h-3.5 w-3.5 z-10">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-orange-500 border-2 border-slate-900"></span>
              </span>
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-1.5">
                  Logi<span className="text-orange-400">Step</span>
                </h1>
                <span className="hidden sm:inline-flex px-2 py-0.5 rounded-full text-[11px] font-bold bg-orange-500/10 text-orange-400 border border-orange-500/30">
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
                    ? 'bg-orange-500 text-slate-950 font-bold shadow-sm'
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
                    ? 'bg-orange-500 text-slate-950 font-bold shadow-sm'
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
                    ? 'bg-orange-500 text-slate-950 font-bold shadow-sm'
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
                <span className="absolute -top-1.5 -right-1.5 bg-orange-500 text-slate-950 text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center shadow-md">
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

            {/* Logout / Switch User button */}
            {onLogout && (
              <button
                type="button"
                onClick={onLogout}
                className="p-2 rounded-xl bg-slate-800/80 hover:bg-red-950/60 text-slate-300 hover:text-red-400 border border-slate-700/70 hover:border-red-500/50 transition-colors"
                title={lang === 'ur' ? 'صارف تبدیل کریں / لاگ آؤٹ' : 'Switch User / Logout'}
              >
                <LogOut className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        {/* Direction Selector: UP vs DOWN (Crucial Boss Requirement!) */}
        <div className="bg-slate-950/70 p-2 sm:p-2.5 rounded-2xl border border-slate-800/90 shadow-inner">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase font-bold tracking-wider text-slate-400 flex items-center gap-1.5">
                <Radio className="w-3.5 h-3.5 text-orange-400 animate-pulse" />
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
                    ? 'bg-gradient-to-r from-orange-500 to-amber-600 text-white border-orange-400/80 shadow-lg shadow-orange-500/25 font-bold'
                    : 'bg-slate-900/90 hover:bg-slate-800 text-slate-300 border-slate-800 font-medium'
                }`}
              >
                <div
                  className={`p-1 rounded-lg ${
                    direction === 'UP' ? 'bg-orange-950/60 text-white' : 'bg-slate-800 text-orange-400'
                  }`}
                >
                  <ArrowUpRight className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs sm:text-sm font-extrabold flex items-center gap-1.5">
                    <span>{t.upLabel}</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-black/30 text-orange-200">
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
