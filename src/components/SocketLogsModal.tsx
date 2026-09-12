import React from 'react';
import { SocketLogEntry, ConnectionStatus, LanguageCode } from '../types';
import { Terminal, X, Trash2, Radio, CheckCircle, RefreshCw } from 'lucide-react';
import { UI_TEXT } from '../utils/i18n';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  logs: SocketLogEntry[];
  onClearLogs: () => void;
  onTestPing: () => void;
  isTesting: boolean;
  connectionStatus: ConnectionStatus;
  lang: LanguageCode;
}

export const SocketLogsModal: React.FC<Props> = ({
  isOpen,
  onClose,
  logs,
  onClearLogs,
  onTestPing,
  isTesting,
  connectionStatus,
  lang,
}) => {
  if (!isOpen) return null;
  const t = UI_TEXT[lang] || UI_TEXT.en;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-700/80 rounded-3xl p-5 sm:p-6 shadow-2xl max-h-[90vh] flex flex-col font-mono">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <Terminal className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white font-sans">
                  GT06 AVL Telematics Console
                </h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-emerald-400 font-mono">
                  {connectionStatus}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-sans">
                Real-time binary frame stream (avl.vtps.org:5200)
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Toolbar */}
        <div className="flex items-center justify-between py-2 px-3 bg-slate-950/60 rounded-xl my-3 border border-slate-800/80 text-xs font-sans">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onTestPing}
              disabled={isTesting}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-colors shadow-sm disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isTesting ? 'animate-spin' : ''}`} />
              <span>{isTesting ? 'Handshaking...' : 'Test Login (0x01)'}</span>
            </button>
          </div>

          <button
            type="button"
            onClick={onClearLogs}
            className="flex items-center gap-1 text-slate-400 hover:text-rose-400 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear</span>
          </button>
        </div>

        {/* Logs Stream */}
        <div className="flex-1 overflow-y-auto pr-1 py-2 space-y-2 text-[11px] select-text">
          {logs.length === 0 ? (
            <div className="py-16 text-center text-slate-600 font-sans">
              No socket frames captured yet. Transmit any step to inspect packets.
            </div>
          ) : (
            logs.map((log) => {
              const dirStyles: Record<string, { bg: string; text: string; badge: string }> = {
                INFO: {
                  bg: 'bg-slate-950/60',
                  text: 'text-slate-300',
                  badge: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
                },
                TX: {
                  bg: 'bg-emerald-950/20 border-emerald-900/30',
                  text: 'text-emerald-300',
                  badge: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40',
                },
                RX: {
                  bg: 'bg-teal-950/20 border-teal-900/30',
                  text: 'text-teal-300',
                  badge: 'bg-teal-500/20 text-teal-400 border-teal-500/40',
                },
                ERROR: {
                  bg: 'bg-rose-950/20 border-rose-900/30',
                  text: 'text-rose-300',
                  badge: 'bg-rose-500/20 text-rose-400 border-rose-500/40',
                },
              };

              const style = dirStyles[log.direction] || dirStyles.INFO;

              return (
                <div
                  key={log.id}
                  className={`p-2.5 rounded-xl border border-slate-800/80 ${style.bg}`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`px-1.5 py-0.2 rounded text-[9px] font-black tracking-wider border ${style.badge}`}
                      >
                        {log.direction}
                      </span>
                      <span className="text-slate-500 text-[10px]">{log.timestamp}</span>
                    </div>
                  </div>

                  <p className={`${style.text} leading-relaxed break-words font-sans text-xs`}>
                    {log.message}
                  </p>

                  {log.hexData && (
                    <div className="mt-1.5 p-1.5 bg-black/70 rounded border border-slate-800 text-[10px] font-mono text-amber-300 break-all select-all">
                      {log.hexData}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-slate-800 flex justify-end font-sans">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition-colors"
          >
            {t.close}
          </button>
        </div>
      </div>
    </div>
  );
};
