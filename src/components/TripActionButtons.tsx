import React, { useMemo } from 'react';
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
  RotateCcw,
  ChevronRight,
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
  // Only consider Journey step records (stepId 1 to 10)
  const journeyRecords = tripRecords.filter((r) => r.stepId >= 1 && r.stepId <= 10);
  const markedStepIds = new Set(journeyRecords.map((r) => r.stepId));

  // Determine latest journey step completed
  const latestRecord = journeyRecords.length > 0 ? journeyRecords[journeyRecords.length - 1] : null;
  const latestStepId = latestRecord ? latestRecord.stepId : 0;

  // Next recommended step (if 10 completed, loops back to step 1 for new trip!)
  const nextRecommendedStepId = latestStepId === 10 ? 1 : latestStepId < 10 ? latestStepId + 1 : 1;

  // Next active step object
  const activeStep = useMemo(() => {
    return TRIP_STEPS.find((s) => s.id === nextRecommendedStepId) || TRIP_STEPS[0];
  }, [nextRecommendedStepId]);

  // Dynamic Rotating Loop Order (as requested in the audio note):
  // The upcoming/pending steps come FIRST (with activeStep at position 0).
  // Once a step is tapped, it rotates to the bottom of the list with a completed tag!
  const orderedSteps = useMemo(() => {
    const upcoming: StepDefinition[] = [];
    const completed: StepDefinition[] = [];

    // If trip completed (all 10 done), all are in completed, or starting fresh loop
    TRIP_STEPS.forEach((step) => {
      if (step.id === nextRecommendedStepId) {
        upcoming.push(step);
      } else if (step.id > nextRecommendedStepId) {
        upcoming.push(step);
      } else {
        completed.push(step);
      }
    });

    // Upcoming first (activeStep at top), completed rotated to the bottom
    return [...upcoming, ...completed];
  }, [nextRecommendedStepId]);

  const ActiveIcon = STEP_ICONS[activeStep.iconName] || Truck;

  // Active step texts
  let activeTitle = activeStep.titleEn;
  let activeSecTitle = activeStep.titleUr;
  let activeSub = activeStep.subtitleEn;

  if (lang === 'ur') {
    activeTitle = activeStep.titleUr;
    activeSecTitle = activeStep.titleEn;
    activeSub = activeStep.subtitleUr;
  } else if (lang === 'ps') {
    activeTitle = activeStep.titlePs;
    activeSecTitle = activeStep.titleEn;
    activeSub = activeStep.subtitlePs;
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-orange-500 animate-pulse" />
          <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
            <span>
              {lang === 'ur'
                ? 'سفری سرگرمیاں (10 مرحلہ وار سفر)'
                : lang === 'ps'
                ? 'د سفر ۱۰ پړاوونه'
                : '10-Step Fleet Journey'}
            </span>
          </h2>
        </div>
        <div className="text-xs text-slate-400 font-medium hidden sm:block font-mono">
          Auto-Rotating Pipeline • Loop Mode
        </div>
      </div>

      {/* HERO / PRIMARY 1-TAP CARD: "Always tap the first button!" */}
      <div className="relative p-0.5 rounded-3xl bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 shadow-xl shadow-orange-950/40">
        <button
          type="button"
          onClick={() => onSelectStep(activeStep)}
          disabled={isProcessing}
          className="w-full text-left p-4 sm:p-5 rounded-[22px] bg-[#0c1424] hover:bg-[#101b30] transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer active:scale-[0.99] disabled:opacity-75"
        >
          <div className="flex items-start sm:items-center gap-3.5">
            {/* Pulsing Icon Badge */}
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-500/30 to-amber-500/20 border border-orange-500/50 flex items-center justify-center text-orange-400 flex-shrink-0 shadow-lg shadow-orange-950/50 animate-pulse">
              <ActiveIcon className="w-7 h-7" />
            </div>

            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2.5 py-0.5 rounded-md bg-orange-500 text-slate-950 font-black text-xs uppercase tracking-wider shadow-sm">
                  {lang === 'ur' ? `مرحلہ ${activeStep.id}` : `STEP ${activeStep.id}`}
                </span>
                <span className="text-[11px] font-mono font-bold text-orange-300 border border-orange-500/30 px-2 py-0.5 rounded-md bg-orange-500/10">
                  SPEED: {activeStep.speedCode} km/h
                </span>
                <span className="text-[10px] uppercase font-bold text-amber-400 animate-bounce hidden sm:inline">
                  ★ {lang === 'ur' ? 'اگلا مرحلہ' : 'NEXT ACTION'}
                </span>
              </div>

              <h3 className="text-lg sm:text-xl font-black text-white leading-tight">
                {activeTitle}
              </h3>
              <div className="text-xs sm:text-sm font-semibold text-slate-300 mt-0.5">
                {activeSecTitle}
              </div>
              <p className="text-xs text-slate-400 mt-1 line-clamp-1 max-w-xl">
                {activeSub}
              </p>
            </div>
          </div>

          {/* Large Action CTA Pill */}
          <div className="flex items-center gap-2 sm:self-center self-end">
            <div className="px-4 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-400 text-slate-950 font-black text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-md">
              <span>{lang === 'ur' ? 'ابھی دبائیں' : 'TAP TO LOG'}</span>
              <ArrowRight className="w-4 h-4" />
            </div>
          </div>
        </button>
      </div>

      <div className="flex items-center justify-between text-xs text-slate-400 px-1 pt-1">
        <span>
          {lang === 'ur'
            ? 'مرحلہ مکمل ہونے پر بٹن خودکار طور پر نیچے چلا جائے گا اور اگلا بٹن اوپر آ جائے گا'
            : 'Completed steps automatically rotate to the bottom, promoting the next action to the top'}
        </span>
        {latestStepId > 0 && (
          <span className="text-orange-400 font-medium">
            {markedStepIds.size} / 10 {lang === 'ur' ? 'مکمل' : 'Done'}
          </span>
        )}
      </div>

      {/* Rotating Pipeline List of Steps */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-3 sm:gap-3.5">
        {orderedSteps.map((step) => {
          const isMarked = markedStepIds.has(step.id);
          const isCurrentTop = step.id === activeStep.id;
          const isCurrentlyProcessing = isProcessing && processingStepId === step.id;
          const lastRecordForThisStep = journeyRecords
            .slice()
            .reverse()
            .find((r) => r.stepId === step.id);

          const IconComponent = STEP_ICONS[step.iconName] || Truck;

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

          return (
            <button
              key={step.id}
              type="button"
              onClick={() => onSelectStep(step)}
              disabled={isProcessing}
              className={`group relative text-left p-4 rounded-2xl border transition-all duration-200 overflow-hidden flex flex-col justify-between min-h-[130px] active:scale-[0.985] cursor-pointer ${
                isCurrentTop
                  ? 'border-orange-500/80 bg-gradient-to-br from-orange-950/40 via-slate-900/90 to-slate-900 ring-2 ring-orange-500/40 shadow-lg shadow-orange-950/40'
                  : isMarked
                  ? 'border-slate-800/80 bg-slate-950/70 opacity-80 hover:opacity-100 hover:border-slate-700'
                  : 'border-slate-800 bg-slate-900/80 hover:border-slate-700'
              }`}
            >
              {/* Top Row: Step Tag + Speed Code + Icon */}
              <div className="flex items-center justify-between gap-2 w-full">
                <div className="flex items-center gap-2">
                  <span
                    className={`px-2 py-0.5 rounded-md font-black text-xs tracking-wider uppercase ${
                      isCurrentTop
                        ? 'bg-orange-500 text-slate-950'
                        : isMarked
                        ? 'bg-slate-800 text-slate-400'
                        : 'bg-slate-800 text-slate-200'
                    }`}
                  >
                    STEP {step.id}
                  </span>

                  <span className="px-2 py-0.5 rounded-md text-[11px] font-bold border border-slate-700/60 font-mono text-slate-300 bg-slate-900/80">
                    {step.speedCode} km/h
                  </span>

                  {isMarked && (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                      <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                      {lang === 'ur' ? 'مکمل' : 'Logged'}
                    </span>
                  )}

                  {isCurrentTop && (
                    <span className="px-1.5 py-0.5 rounded-md text-[10px] font-black bg-amber-500/20 text-amber-300 border border-amber-500/40">
                      NEXT
                    </span>
                  )}
                </div>

                <div
                  className={`p-2 rounded-xl bg-slate-900 border border-slate-800 transition-transform ${
                    isCurrentTop ? 'text-orange-400 group-hover:scale-110' : 'text-slate-400'
                  }`}
                >
                  <IconComponent className="w-4 h-4" />
                </div>
              </div>

              {/* Middle: Titles */}
              <div className="my-2">
                <h3
                  className={`text-base font-extrabold leading-snug transition-colors ${
                    isCurrentTop ? 'text-white' : isMarked ? 'text-slate-300' : 'text-slate-100'
                  }`}
                >
                  {primaryTitle}
                </h3>
                <div className="text-xs font-semibold text-slate-400 mt-0.5">
                  {secondaryTitle}
                </div>
                <p className="text-[11px] text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                  {subtitle}
                </p>
              </div>

              {/* Bottom Strip */}
              <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between text-xs">
                {lastRecordForThisStep ? (
                  <span className="text-[11px] text-emerald-400 font-medium flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>Logged at {lastRecordForThisStep.formattedDateTime.split(' ')[1]}</span>
                  </span>
                ) : (
                  <span className="text-[11px] text-slate-500 group-hover:text-slate-300 transition-colors flex items-center gap-1">
                    <span>Tap to log</span>
                    <ChevronRight className="w-3 h-3" />
                  </span>
                )}

                {isCurrentlyProcessing && (
                  <span className="text-[11px] text-orange-400 font-bold animate-pulse">
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
