import React, { useState } from 'react';
import { TripEventRecord, LanguageCode } from '../types';
import { UI_TEXT } from '../utils/i18n';
import {
  X,
  FileSpreadsheet,
  CheckCircle2,
  Clock,
  MapPin,
  Trash2,
  Copy,
  Check,
  ArrowUpRight,
  ArrowDownLeft,
  Share2,
} from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  records: TripEventRecord[];
  onClearRecords: () => void;
  lang: LanguageCode;
}

export const TripHistoryModal: React.FC<Props> = ({
  isOpen,
  onClose,
  records,
  onClearRecords,
  lang,
}) => {
  if (!isOpen) return null;

  const t = UI_TEXT[lang] || UI_TEXT.en;
  const [copied, setCopied] = useState(false);
  const [showConfirmClear, setShowConfirmClear] = useState(false);

  // Generate text report for WhatsApp / Dispatcher
  const handleCopySummary = () => {
    if (records.length === 0) return;
    const lines = [
      `🚛 *LOGISTEP FLEET TRIP SHEET*`,
      `Vehicle: ${records[0].vehicleNumber || 'TLB-786'}`,
      `Driver: ${records[0].driverName || 'Driver Khan'}`,
      `Consignment: CN-${records[0].imei.slice(-6)}`,
      `---------------------------------`,
      ...records.map(
        (r) =>
          `✅ *Step ${r.stepId}*: ${r.title}\n   🕒 ${r.formattedDateTime} | ⚡ ${r.speedCode} km/h | 🧭 ${r.direction} (Ignition:${r.ignition})${
            r.batteryLevel !== undefined ? ` | 🔋 ${r.batteryLevel}%` : ''
          }\n   📍 ${r.locationName}`
      ),
      `---------------------------------`,
      `Generated via LogiStep VTP AVL Gateway`,
    ];
    navigator.clipboard.writeText(lines.join('\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-700/80 rounded-3xl p-5 sm:p-6 shadow-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl overflow-hidden border border-orange-500/40 bg-slate-950 flex-shrink-0 shadow-md">
              <img
                src="/logo.png"
                alt="LogiStep Logo"
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src = '/icon.svg';
                }}
              />
            </div>
            <div>
              <h3 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
                <span>{t.tripTimeline}</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-orange-400 font-mono font-bold">
                  {records.length} / 10 Steps
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Logistics audit log & speed code telemetry
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

        {/* Action bar: Share/Copy + Clear */}
        {records.length > 0 && (
          showConfirmClear ? (
            <div className="p-3 bg-rose-950/70 border border-rose-800/80 rounded-xl my-3 text-xs space-y-2">
              <p className="text-rose-200 font-medium">
                {t.clearTripConfirm || "Reset trip history? All recorded steps will be cleared."}
              </p>
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowConfirmClear(false)}
                  className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onClearRecords();
                    setShowConfirmClear(false);
                  }}
                  className="px-3 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold transition-colors shadow-sm"
                >
                  Reset History
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between py-2.5 px-3 bg-slate-950/60 rounded-xl my-3 border border-slate-800/80">
              <button
                type="button"
                onClick={handleCopySummary}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-orange-500 hover:bg-orange-400 text-slate-950 font-bold text-xs transition-colors shadow-sm"
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied to Clipboard!' : 'Copy WhatsApp Report'}</span>
              </button>

              <button
                type="button"
                onClick={() => setShowConfirmClear(true)}
                className="flex items-center gap-1 text-xs text-rose-400 hover:text-rose-300 font-medium px-2 py-1 rounded hover:bg-rose-500/10 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{t.clearTrip}</span>
              </button>
            </div>
          )
        )}

        {/* Timeline Content */}
        <div className="flex-1 overflow-y-auto pr-1 py-2 space-y-3">
          {records.length === 0 ? (
            <div className="py-16 text-center text-slate-500 space-y-2">
              <Clock className="w-10 h-10 mx-auto text-slate-600 opacity-60" />
              <p className="text-sm font-medium">{t.noHistory}</p>
            </div>
          ) : (
            <div className="relative pl-6 sm:pl-8 space-y-4 border-l-2 border-slate-800 ml-3 sm:ml-4 my-2">
              {records.map((rec, idx) => {
                const prevRec = idx > 0 ? records[idx - 1] : null;
                const timeDiffMinutes = prevRec
                  ? Math.round((rec.timestamp - prevRec.timestamp) / 60000)
                  : 0;

                return (
                  <div key={rec.id} className="relative group">
                    {/* Node Dot */}
                    <div className="absolute -left-[31px] sm:-left-[39px] top-1.5 w-6 h-6 rounded-full bg-slate-900 border-2 border-orange-500 flex items-center justify-center text-orange-400 shadow-md">
                      <span className="text-[10px] font-black">{rec.stepId}</span>
                    </div>

                    {/* Card */}
                    <div className="p-3 sm:p-4 rounded-2xl bg-slate-950/80 border border-slate-800/90 hover:border-slate-700 transition-colors">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-1.5">
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-sm sm:text-base text-white">
                            Step {rec.stepId}: {rec.title}
                          </span>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-0.5 ${
                              rec.direction === 'UP'
                                ? 'bg-orange-500/20 text-orange-300'
                                : 'bg-amber-500/20 text-amber-300'
                            }`}
                          >
                            {rec.direction === 'UP' ? (
                              <ArrowUpRight className="w-3 h-3" />
                            ) : (
                              <ArrowDownLeft className="w-3 h-3" />
                            )}
                            {rec.direction} (Ign: {rec.ignition})
                          </span>
                        </div>

                        <span className="text-xs font-mono text-slate-400">
                          {rec.formattedDateTime}
                        </span>
                      </div>

                      {/* Location & Speed */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-400 mt-2">
                        <div className="flex items-center gap-1.5 truncate">
                          <MapPin className="w-3.5 h-3.5 text-orange-400 flex-shrink-0" />
                          <span className="truncate text-slate-300">{rec.locationName}</span>
                        </div>

                        <div className="flex items-center gap-3 sm:justify-end font-mono">
                          {rec.batteryLevel !== undefined && (
                            <span className="text-emerald-400 font-bold text-[11px] flex items-center gap-0.5">
                              <span>🔋</span>
                              <span>{rec.batteryLevel}%</span>
                            </span>
                          )}
                          <span className="text-orange-400 font-bold">
                            Speed: {rec.speedCode} km/h
                          </span>
                          {timeDiffMinutes > 0 && (
                            <span className="text-slate-500 text-[11px]">
                              +{timeDiffMinutes}m interval
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Raw Hex toggleable / inspectable */}
                      {rec.txHex && (
                        <div className="mt-2 text-[10px] font-mono text-slate-500 truncate bg-slate-900/90 p-1.5 rounded border border-slate-800/80">
                          TX: <span className="text-orange-400/90">{rec.txHex}</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-slate-800 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition-colors"
          >
            {t.close}
          </button>
        </div>
      </div>
    </div>
  );
};
