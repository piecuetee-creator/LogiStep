import React from 'react';
import { Battery, BatteryCharging, BatteryWarning, BatteryMedium, BatteryLow } from 'lucide-react';
import { BatteryStatus } from '../utils/battery';

interface Props {
  battery: BatteryStatus;
  langText?: {
    battery?: string;
    charging?: string;
  };
  compact?: boolean;
}

export const BatteryIndicator: React.FC<Props> = ({
  battery,
  langText,
  compact = false,
}) => {
  const level = Math.min(100, Math.max(0, battery.level));
  const isCharging = battery.isCharging;

  // Determine color theme based on battery health
  let colorClass = 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10';
  let barColor = 'bg-emerald-500';
  if (level <= 20) {
    colorClass = 'text-rose-400 border-rose-500/30 bg-rose-500/10';
    barColor = 'bg-rose-500';
  } else if (level <= 45) {
    colorClass = 'text-amber-400 border-amber-500/30 bg-amber-500/10';
    barColor = 'bg-amber-500';
  }

  // Choose icon
  const renderIcon = () => {
    if (isCharging) {
      return <BatteryCharging className="w-4 h-4 text-emerald-400 animate-pulse flex-shrink-0" />;
    }
    if (level <= 20) {
      return <BatteryLow className="w-4 h-4 text-rose-400 flex-shrink-0" />;
    }
    if (level <= 50) {
      return <BatteryMedium className="w-4 h-4 text-amber-400 flex-shrink-0" />;
    }
    return <Battery className="w-4 h-4 text-emerald-400 flex-shrink-0" />;
  };

  if (compact) {
    return (
      <div
        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg border text-xs font-mono font-bold select-none ${colorClass}`}
        title={`Device Battery: ${level}% ${isCharging ? '(Charging)' : ''}`}
      >
        {renderIcon()}
        <span>{level}%</span>
        {isCharging && (
          <span className="text-[9px] uppercase font-sans font-extrabold text-emerald-300">
            CHG
          </span>
        )}
      </div>
    );
  }

  return (
    <div
      className={`flex items-center gap-2 px-2.5 py-1.5 rounded-xl border text-xs font-medium select-none ${colorClass}`}
      title={`Device Battery: ${level}% ${isCharging ? '(Charging)' : ''}`}
    >
      <div className="relative flex items-center">
        {renderIcon()}
      </div>

      <div className="flex flex-col">
        <div className="flex items-center gap-1.5">
          <span className="font-mono font-black text-sm tracking-tight text-white">
            {level}%
          </span>
          {isCharging && (
            <span className="text-[10px] font-bold text-emerald-300 bg-emerald-950/80 px-1.5 py-0.2 rounded border border-emerald-500/30">
              {langText?.charging || 'Charging'}
            </span>
          )}
        </div>

        {/* Visual Battery Bar */}
        <div className="w-16 sm:w-20 h-1.5 bg-slate-800 rounded-full overflow-hidden mt-0.5 border border-slate-700/50">
          <div
            className={`h-full rounded-full transition-all duration-500 ${barColor}`}
            style={{ width: `${level}%` }}
          />
        </div>
      </div>
    </div>
  );
};
