import React from 'react';
import { DutyActivityDefinition, LanguageCode, TripEventRecord } from '../types';
import { DUTY_ACTIVITIES } from '../data/stepsData';
import {
  Utensils,
  Coffee,
  Fuel,
  Moon,
  Disc,
  Wrench,
  ShieldAlert,
  Bed,
  CheckCircle2,
  Clock,
  Sparkles,
} from 'lucide-react';

interface Props {
  onSelectDuty: (duty: DutyActivityDefinition) => void;
  lang: LanguageCode;
  tripRecords: TripEventRecord[];
  isProcessing: boolean;
  processingDutyId: number | null;
}

const DUTY_ICONS: Record<string, React.FC<{ className?: string }>> = {
  Utensils,
  Coffee,
  Fuel,
  Moon,
  Disc,
  Wrench,
  ShieldAlert,
  Bed,
};

export const DutyActionButtons: React.FC<Props> = ({
  onSelectDuty,
  lang,
  tripRecords,
  isProcessing,
  processingDutyId,
}) => {
  // Count how many times each duty activity has been logged
  const dutyCounts: Record<number, number> = {};
  tripRecords.forEach((r) => {
    if (r.stepId >= 21 && r.stepId <= 28) {
      dutyCounts[r.stepId] = (dutyCounts[r.stepId] || 0) + 1;
    }
  });

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
          <h2 className="text-base sm:text-lg font-bold text-white">
            {lang === 'ur'
              ? 'ڈیوٹی معمولات (کھانا، ڈیزل، نماز، آرام)'
              : lang === 'ps'
              ? 'د دندې معمول چارې (ډوډۍ، تېل، لمونځ، آرام)'
              : 'Routine Duty Activities'}
          </h2>
        </div>
        <div className="text-xs text-slate-400 font-medium hidden sm:block font-mono">
          Speed Codes: 121 - 128 km/h • Multi-Log
        </div>
      </div>

      <div className="p-3 rounded-2xl bg-slate-900/60 border border-slate-800 text-xs text-slate-300 leading-relaxed">
        {lang === 'ur'
          ? 'یہ معمول کی سرگرمیاں ہیں جو سفر کے دوران کسی بھی وقت بار بار پیش آ سکتی ہیں (جیسے دن میں 2-3 بار کھانا، 4 بار نماز، یا 2 بار ڈیزل بھروانا)۔ کلک کر کے فوری اندراج کریں۔'
          : lang === 'ps'
          ? 'دا هغه ورځني کارونه دي چې د سفر په اوږدو کې څو ځله پېښېږي (لکه د ورځې ۲ ځله ډوډۍ، ۴ ځله لمونځ، تېل). د ثبت لپاره یې وټاکئ.'
          : 'Recurring daily activities that can occur multiple times during a trip (e.g. 2-3 meals, 4-5 prayers, multiple refueling halts). Tap to log at any time.'}
      </div>

      {/* Grid of 8 Duty Action Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-3 sm:gap-3.5">
        {DUTY_ACTIVITIES.map((duty) => {
          const count = dutyCounts[duty.id] || 0;
          const isCurrentlyProcessing = isProcessing && processingDutyId === duty.id;
          const IconComponent = DUTY_ICONS[duty.iconName] || Coffee;

          let primaryTitle = duty.titleEn;
          let secondaryTitle = duty.titleUr;
          let subtitle = duty.subtitleEn;

          if (lang === 'ur') {
            primaryTitle = duty.titleUr;
            secondaryTitle = duty.titleEn;
            subtitle = duty.subtitleUr;
          } else if (lang === 'ps') {
            primaryTitle = duty.titlePs;
            secondaryTitle = duty.titleEn;
            subtitle = duty.subtitlePs;
          }

          // Last record for this duty
          const lastRecord = tripRecords
            .slice()
            .reverse()
            .find((r) => r.stepId === duty.id);

          return (
            <button
              key={duty.id}
              type="button"
              onClick={() => onSelectDuty(duty)}
              disabled={isProcessing}
              className="group relative text-left p-4 rounded-2xl border border-slate-800/90 hover:border-emerald-500/50 bg-gradient-to-br from-slate-900/95 via-slate-900/80 to-[#0c1424] transition-all duration-200 overflow-hidden flex flex-col justify-between min-h-[125px] active:scale-[0.985] hover:shadow-lg disabled:opacity-60 cursor-pointer"
            >
              {/* Top Row: Speed Code + Count Badge + Icon */}
              <div className="flex items-center justify-between gap-2 w-full">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-md text-[11px] font-bold border border-emerald-500/30 bg-emerald-500/15 text-emerald-300 font-mono">
                    SPEED: {duty.speedCode} km/h
                  </span>

                  {count > 0 && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 font-mono">
                      <CheckCircle2 className="w-3 h-3 text-amber-400" />
                      Logged {count}x
                    </span>
                  )}
                </div>

                <div className="p-2 rounded-xl bg-slate-900/90 border border-slate-800 text-emerald-400 group-hover:scale-110 group-hover:border-emerald-500/40 transition-all">
                  <IconComponent className="w-5 h-5" />
                </div>
              </div>

              {/* Middle: Title & Bilingual Subtitle */}
              <div className="my-2">
                <h3 className="text-base font-extrabold text-white leading-snug group-hover:text-emerald-300 transition-colors">
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
                {lastRecord ? (
                  <span className="text-[11px] text-emerald-400/90 font-medium flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    <span>Last logged: {lastRecord.formattedDateTime.split(' ')[1]}</span>
                  </span>
                ) : (
                  <span className="text-[11px] text-slate-500 group-hover:text-slate-300 transition-colors">
                    Tap to record this duty halt
                  </span>
                )}

                {isCurrentlyProcessing && (
                  <span className="text-[11px] text-emerald-400 font-bold animate-pulse">
                    Logging...
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
