import React from 'react';
import { StepDefinition, LanguageCode, TripEventRecord } from '../types';
import { TRIP_STEPS } from '../data/stepsData';
import {
  Truck,
  Building2,
  LogIn,
  Boxes,
  CheckCircle2,
  Clock,
  Navigation,
  Coffee,
  MapPin,
  Flag,
  ArrowRight,
  Sparkles,
} from 'lucide-react';

interface Props {
  onSelectStep: (step: StepDefinition) => void;
  lang: LanguageCode;
  tripRecords: TripEventRecord[];
  isProcessing: boolean;
  processingStepId: number | null;
}

const STEP_ICONS: Record<string, React.FC<{ className?: string }>> = {
  Truck,
  Building2,
  LogIn,
  Boxes,
  CheckCircle2,
  Clock,
  Navigation,
  Coffee,
  MapPin,
  Flag,
};

export const TripActionButtons: React.FC<Props> = ({
  onSelectStep,
  lang,
  tripRecords,
  isProcessing,
  processingStepId,
}) => {
  // Find highest step marked so far
  const markedStepIds = new Set(tripRecords.map((r) => r.stepId));
  const latestStepId = tripRecords.length > 0 ? tripRecords[tripRecords.length - 1].stepId : 0;
  const nextRecommendedStepId = latestStepId < 10 ? latestStepId + 1 : 10;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
            <span>10-Step Fleet Progression Journey</span>
          </h2>
        </div>
        <div className="text-xs text-slate-400 font-medium hidden sm:block">
          Speed column hijacked for GT06 telematics (101 - 110 km/h)
        </div>
      </div>

      {/* Grid of 10 Action Buttons */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-3 sm:gap-3.5">
        {TRIP_STEPS.map((step) => {
          const isMarked = markedStepIds.has(step.id);
          const isNext = step.id === nextRecommendedStepId && !isMarked;
          const isCurrentlyProcessing = isProcessing && processingStepId === step.id;
          const lastRecordForThisStep = tripRecords
            .slice()
            .reverse()
            .find((r) => r.stepId === step.id);

          const IconComponent = STEP_ICONS[step.iconName] || Truck;

          // Multilingual strings
          let primaryTitle = step.titleEn;
          let secondaryTitle = step.titleUr;
          let subtitle = step.subtitleEn;

          if (lang === 'ur') {
            primaryTitle = step.titleUr;
            secondaryTitle = step.titleEn;
            subtitle = step.subtitleUr;
          } else if (lang === 'ps') {
            primaryTitle = step.titlePs;
            secondaryTitle = step.titleEn;
            subtitle = step.subtitlePs;
          }

          // Step specific color themes
          const colorStyles: Record<
            number,
            {
              border: string;
              activeBg: string;
              numBadge: string;
              speedBadge: string;
              accentText: string;
            }
          > = {
            1: {
              border: 'border-orange-500/40 hover:border-orange-400',
              activeBg: 'from-orange-950/50 via-slate-900/90 to-slate-900',
              numBadge: 'bg-orange-500 text-slate-950 font-black',
              speedBadge: 'bg-orange-500/15 text-orange-300 border-orange-500/30',
              accentText: 'text-orange-400',
            },
            2: {
              border: 'border-teal-500/40 hover:border-teal-400',
              activeBg: 'from-teal-950/50 via-slate-900/90 to-slate-900',
              numBadge: 'bg-teal-500 text-slate-950',
              speedBadge: 'bg-teal-500/15 text-teal-300 border-teal-500/30',
              accentText: 'text-teal-400',
            },
            3: {
              border: 'border-cyan-500/40 hover:border-cyan-400',
              activeBg: 'from-cyan-950/50 via-slate-900/90 to-slate-900',
              numBadge: 'bg-cyan-500 text-slate-950',
              speedBadge: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30',
              accentText: 'text-cyan-400',
            },
            4: {
              border: 'border-amber-500/40 hover:border-amber-400',
              activeBg: 'from-amber-950/50 via-slate-900/90 to-slate-900',
              numBadge: 'bg-amber-500 text-slate-950',
              speedBadge: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
              accentText: 'text-amber-400',
            },
            5: {
              border: 'border-blue-500/40 hover:border-blue-400',
              activeBg: 'from-blue-950/50 via-slate-900/90 to-slate-900',
              numBadge: 'bg-blue-500 text-slate-950',
              speedBadge: 'bg-blue-500/15 text-blue-300 border-blue-500/30',
              accentText: 'text-blue-400',
            },
            6: {
              border: 'border-purple-500/40 hover:border-purple-400',
              activeBg: 'from-purple-950/50 via-slate-900/90 to-slate-900',
              numBadge: 'bg-purple-500 text-slate-950',
              speedBadge: 'bg-purple-500/15 text-purple-300 border-purple-500/30',
              accentText: 'text-purple-400',
            },
            7: {
              border: 'border-indigo-500/40 hover:border-indigo-400',
              activeBg: 'from-indigo-950/50 via-slate-900/90 to-slate-900',
              numBadge: 'bg-indigo-500 text-slate-950',
              speedBadge: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30',
              accentText: 'text-indigo-400',
            },
            8: {
              border: 'border-rose-500/40 hover:border-rose-400',
              activeBg: 'from-rose-950/50 via-slate-900/90 to-slate-900',
              numBadge: 'bg-rose-500 text-slate-950',
              speedBadge: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
              accentText: 'text-rose-400',
            },
            9: {
              border: 'border-orange-500/40 hover:border-orange-400',
              activeBg: 'from-orange-950/50 via-slate-900/90 to-slate-900',
              numBadge: 'bg-orange-500 text-slate-950',
              speedBadge: 'bg-orange-500/15 text-orange-300 border-orange-500/30',
              accentText: 'text-orange-400',
            },
            10: {
              border: 'border-orange-400 hover:border-orange-300',
              activeBg: 'from-orange-950/70 via-slate-900/90 to-slate-900',
              numBadge: 'bg-orange-400 text-slate-950 font-black',
              speedBadge: 'bg-orange-400/20 text-orange-300 border-orange-400/40',
              accentText: 'text-orange-400',
            },
          };

          const style = colorStyles[step.id];

          return (
            <button
              key={step.id}
              type="button"
              onClick={() => onSelectStep(step)}
              disabled={isProcessing}
              className={`group relative text-left p-4 sm:p-4.5 rounded-2xl border transition-all duration-200 overflow-hidden flex flex-col justify-between min-h-[135px] active:scale-[0.985] ${
                style.border
              } bg-gradient-to-br ${style.activeBg} ${
                isMarked
                  ? 'ring-2 ring-orange-500/40 shadow-lg shadow-orange-950/30'
                  : isNext
                  ? 'ring-2 ring-amber-400/60 shadow-xl shadow-amber-950/40 animate-pulse'
                  : 'hover:shadow-lg'
              } disabled:opacity-60`}
            >
              {/* Top Row: Step Tag + Speed Code + Icon */}
              <div className="flex items-center justify-between gap-2 w-full">
                <div className="flex items-center gap-2">
                  <span
                    className={`px-2 py-0.5 rounded-md font-black text-xs tracking-wider uppercase shadow-sm ${style.numBadge}`}
                  >
                    STEP {step.id}
                  </span>

                  <span
                    className={`px-2 py-0.5 rounded-md text-[11px] font-bold border font-mono ${style.speedBadge}`}
                  >
                    SPEED: {step.speedCode} km/h
                  </span>

                  {isMarked && (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-orange-500/20 text-orange-400 border border-orange-500/30">
                      <CheckCircle2 className="w-3 h-3" />
                      Marked
                    </span>
                  )}
                </div>

                <div
                  className={`p-2 rounded-xl bg-slate-900/90 border border-slate-800 ${style.accentText} group-hover:scale-110 transition-transform`}
                >
                  <IconComponent className="w-5 h-5" />
                </div>
              </div>

              {/* Middle: Primary Title & Bilingual Subtitle */}
              <div className="my-2">
                <h3 className="text-base sm:text-lg font-extrabold text-white leading-snug group-hover:text-amber-200 transition-colors">
                  {primaryTitle}
                </h3>
                <div className="text-xs sm:text-sm font-semibold text-slate-300/90 mt-0.5">
                  {secondaryTitle}
                </div>
                <p className="text-[11px] text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                  {subtitle}
                </p>
              </div>

              {/* Bottom: Action Status Strip */}
              <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between text-xs">
                {lastRecordForThisStep ? (
                  <span className="text-[11px] text-orange-400 font-medium flex items-center gap-1">
                    <span>Logged at {lastRecordForThisStep.formattedDateTime.split(' ')[1]}</span>
                    <span>({lastRecordForThisStep.direction})</span>
                  </span>
                ) : (
                  <span className="text-[11px] text-slate-500 group-hover:text-slate-300 transition-colors flex items-center gap-1">
                    <span>Tap to log & transmit</span>
                    <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                  </span>
                )}

                {isCurrentlyProcessing && (
                  <span className="text-[11px] text-amber-400 font-bold animate-pulse">
                    Transmitting...
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
