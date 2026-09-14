import React from 'react';
import { StepDefinition, TripDirection, LanguageCode, Coordinates, TripEventRecord } from '../types';
import { UI_TEXT } from '../utils/i18n';
import {
  CheckCircle2,
  X,
  Radio,
  MapPin,
  Clock,
  Send,
  Loader2,
  ArrowUpRight,
  ArrowDownLeft,
  ShieldCheck,
  Terminal,
} from 'lucide-react';

interface Props {
  step: StepDefinition | null;
  direction: TripDirection;
  coords: Coordinates;
  lang: LanguageCode;
  isProcessing: boolean;
  activeResultRecord: TripEventRecord | null;
  onConfirm: () => void;
  onClose: () => void;
}

export const StepConfirmDialog: React.FC<Props> = ({
  step,
  direction,
  coords,
  lang,
  isProcessing,
  activeResultRecord,
  onConfirm,
  onClose,
}) => {
  if (!step && !activeResultRecord) return null;

  const t = UI_TEXT[lang] || UI_TEXT.en;
  const currentStep = step || (activeResultRecord ? {
    id: activeResultRecord.stepId,
    speedCode: activeResultRecord.speedCode,
    titleEn: activeResultRecord.title,
    titleUr: activeResultRecord.title,
    titlePs: activeResultRecord.title,
    subtitleEn: '',
    subtitleUr: '',
    subtitlePs: '',
    badgeEn: '',
    badgeUr: '',
    badgePs: '',
    iconName: 'Truck',
    accentColor: 'orange',
    borderHover: '',
    bgGradient: '',
    glowColor: '',
  } : null);

  if (!currentStep) return null;

  const isSuccess = !!activeResultRecord;
  const ignitionVal = direction === 'UP' ? 1 : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-700/80 rounded-3xl p-5 sm:p-6 shadow-2xl overflow-hidden">
        {/* Top Close Button */}
        <button
          type="button"
          onClick={onClose}
          disabled={isProcessing}
          className="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Content based on state */}
        {!isSuccess ? (
          /* Confirmation State */
          <div>
            {/* Header Tag */}
            <div className="flex items-center gap-2 mb-3">
              <span className="px-2.5 py-1 rounded-lg bg-orange-500/20 text-orange-300 border border-orange-500/30 text-xs font-black tracking-wider uppercase">
                STEP {currentStep.id} • CONFIRMATION
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 text-xs font-mono font-bold">
                SPEED: {currentStep.speedCode} km/h
              </span>
            </div>

            {/* Step Title in Selected Language */}
            <h3 className="text-xl sm:text-2xl font-black text-white leading-tight">
              {lang === 'ur'
                ? currentStep.titleUr
                : lang === 'ps'
                ? currentStep.titlePs
                : currentStep.titleEn}
            </h3>
            <p className="text-xs sm:text-sm font-semibold text-slate-300 mt-1">
              {lang === 'en' ? currentStep.titleUr : currentStep.titleEn}
            </p>

            {/* Prompt */}
            <p className="text-xs text-slate-400 mt-3">{t.confirmPrompt}</p>

            {/* Telematics Payload Overview Box */}
            <div className="mt-4 p-3.5 bg-slate-950/80 rounded-2xl border border-slate-800 space-y-2.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-400 flex items-center gap-1.5 font-medium">
                  <Radio className="w-3.5 h-3.5 text-orange-400" />
                  Trip Direction:
                </span>
                <span
                  className={`font-bold px-2 py-0.5 rounded flex items-center gap-1 ${
                    direction === 'UP'
                      ? 'bg-orange-500/20 text-orange-300'
                      : 'bg-amber-500/20 text-amber-300'
                  }`}
                >
                  {direction === 'UP' ? (
                    <ArrowUpRight className="w-3 h-3" />
                  ) : (
                    <ArrowDownLeft className="w-3 h-3" />
                  )}
                  {direction} (Ignition Bit = {ignitionVal})
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-400 flex items-center gap-1.5 font-medium">
                  <Clock className="w-3.5 h-3.5 text-orange-400" />
                  Speed Column Code:
                </span>
                <span className="font-mono font-bold text-orange-400">
                  {currentStep.speedCode} km/h (Step #{currentStep.id})
                </span>
              </div>

              <div className="flex items-start justify-between gap-2">
                <span className="text-slate-400 flex items-center gap-1.5 font-medium">
                  <MapPin className="w-3.5 h-3.5 text-orange-400" />
                  Location:
                </span>
                <span className="text-right font-medium text-slate-300 truncate max-w-[240px]">
                  {coords.addressName || `${coords.latitude.toFixed(4)}, ${coords.longitude.toFixed(4)}`}
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="mt-5 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={isProcessing}
                className="py-3 px-4 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-sm transition-colors"
              >
                {t.cancel}
              </button>

              <button
                type="button"
                onClick={onConfirm}
                disabled={isProcessing}
                className="py-3 px-4 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 text-slate-950 font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-orange-500/25 transition-all disabled:opacity-60"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Transmitting...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>{t.confirmAndSend}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        ) : (
          /* Success Receipt State */
          <div>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-orange-500/20 text-orange-400 flex items-center justify-center border border-orange-500/40">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <div>
                <span className="px-2 py-0.5 rounded bg-orange-500/20 text-orange-300 font-black text-[10px] tracking-wider uppercase">
                  CONFIRMED & RECORDED
                </span>
                <h3 className="text-lg sm:text-xl font-extrabold text-white">
                  {t.eventSuccess}
                </h3>
              </div>
            </div>

            {/* Details */}
            <div className="mt-4 p-3.5 bg-slate-950/90 rounded-2xl border border-slate-800 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Step Action:</span>
                <span className="font-bold text-white">
                  Step {activeResultRecord.stepId} - {activeResultRecord.title}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Timestamp:</span>
                <span className="font-mono text-slate-300">
                  {activeResultRecord.formattedDateTime}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Direction & Ignition:</span>
                <span className="font-bold text-orange-400">
                  {activeResultRecord.direction} (Ignition = {activeResultRecord.ignition})
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Transmitted Speed:</span>
                <span className="font-mono font-bold text-orange-400">
                  {activeResultRecord.speedCode} km/h
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Coordinates:</span>
                <span className="font-mono text-slate-300">
                  {activeResultRecord.latitude.toFixed(5)}°, {activeResultRecord.longitude.toFixed(5)}°
                </span>
              </div>

              {/* Raw Hex inspection */}
              {activeResultRecord.txHex && (
                <div className="pt-2 border-t border-slate-800">
                  <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
                    <span className="flex items-center gap-1">
                      <Terminal className="w-3 h-3 text-orange-400" />
                      GT06 Binary Location Frame (0x12):
                    </span>
                    <span className="text-orange-400 font-mono text-[10px]">36 Bytes</span>
                  </div>
                  <div className="font-mono text-[10px] p-2 bg-black/60 rounded-lg text-orange-300 border border-slate-800 break-all select-all">
                    {activeResultRecord.txHex}
                  </div>
                </div>
              )}

              {activeResultRecord.rxHex && (
                <div className="pt-1">
                  <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
                    <span>Server ACK Response (0x01):</span>
                    <span className="text-orange-400 font-mono text-[10px]">10 Bytes</span>
                  </div>
                  <div className="font-mono text-[10px] p-2 bg-black/60 rounded-lg text-amber-300 border border-slate-800 break-all select-all">
                    {activeResultRecord.rxHex}
                  </div>
                </div>
              )}
            </div>

            {/* Done Button */}
            <div className="mt-5">
              <button
                type="button"
                onClick={onClose}
                className="w-full py-3 px-4 rounded-xl bg-orange-500 hover:bg-orange-400 text-slate-950 font-black text-sm transition-colors shadow-lg shadow-orange-500/20"
              >
                {t.close}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
