import React from 'react';
import { DriverProfile, Coordinates, LanguageCode, TripEventRecord } from '../types';
import { UI_TEXT } from '../utils/i18n';
import { validateFleetImei } from '../utils/imei';
import { BatteryStatus } from '../utils/battery';
import { BatteryIndicator } from './BatteryIndicator';
import {
  User,
  Truck,
  MapPin,
  RefreshCw,
  Navigation2,
  Cpu,
  Layers,
  CheckCircle2,
  Lock,
} from 'lucide-react';

interface Props {
  profile: DriverProfile;
  coords: Coordinates;
  isLoadingLocation: boolean;
  onRefreshLocation: () => void;
  onOpenLocationPicker: () => void;
  lang: LanguageCode;
  lastRecord: TripEventRecord | null;
  battery?: BatteryStatus;
}

export const DriverStatusCard: React.FC<Props> = ({
  profile,
  coords,
  isLoadingLocation,
  onRefreshLocation,
  onOpenLocationPicker,
  lang,
  lastRecord,
  battery,
}) => {
  const t = UI_TEXT[lang] || UI_TEXT.en;

  return (
    <div className="bg-slate-900/80 rounded-2xl border border-slate-800 p-4 sm:p-5 shadow-lg relative overflow-hidden">
      {/* Background visual telemetry circuit motif */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-orange-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
        {/* Driver & Unit Info */}
        <div className="md:col-span-5 flex items-center gap-3.5 border-b md:border-b-0 md:border-r border-slate-800 pb-3 md:pb-0 md:pr-4">
          <div className="w-12 h-12 rounded-2xl overflow-hidden border border-orange-500/40 bg-slate-950 flex items-center justify-center shadow-lg shadow-orange-500/20 flex-shrink-0">
            <img
              src="/logo.png"
              alt="LogiStep Logo"
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src = '/icon.svg';
              }}
            />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-base sm:text-lg font-bold text-white truncate">
                  {profile.vehicleNumber || 'TLB-786'}
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-orange-500/15 text-orange-400 border border-orange-500/30 flex-shrink-0">
                  Active Fleet
                </span>
              </div>
              {/* Battery indicator on Driver header */}
              {battery && (
                <div className="sm:hidden flex-shrink-0">
                  <BatteryIndicator battery={battery} compact />
                </div>
              )}
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5 truncate">
              <span className="flex items-center gap-1 font-medium text-slate-300">
                <User className="w-3.5 h-3.5 text-slate-400" />
                {profile.driverName || 'Driver Khan'}
              </span>
              <span>•</span>
              <span className="truncate text-slate-400">{profile.transporter || 'VTP Logistics'}</span>
            </div>
            <div className="text-[11px] text-slate-500 font-mono mt-1 flex items-center gap-1.5 flex-wrap">
              <span>IMEI:</span>
              <span className="text-orange-400 font-bold tracking-wider">
                {validateFleetImei(profile.imei).formattedDisplay}
              </span>
              <span className="text-[9px] font-sans px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-semibold flex items-center gap-1">
                <Lock className="w-2.5 h-2.5 text-emerald-400" />
                <span>Locked</span>
              </span>
              <span className="text-[9px] font-sans px-1.5 py-0.5 rounded bg-orange-500/10 text-orange-300 border border-orange-500/20 font-semibold">
                LogiStep 99003
              </span>
            </div>
          </div>
        </div>

        {/* GPS & Location Hub */}
        <div className="md:col-span-4 flex items-center justify-between gap-3 border-b md:border-b-0 md:border-r border-slate-800 pb-3 md:pb-0 md:pr-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium">
              <MapPin className="w-3.5 h-3.5 text-orange-400" />
              <span>{t.location}</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-400">
                {coords.isRealGps ? 'GPS Fix' : 'Preset'}
              </span>
            </div>
            <div className="text-xs sm:text-sm font-bold text-slate-200 truncate mt-0.5">
              {coords.addressName || 'Karachi Hawksbay Hub'}
            </div>
            <div className="text-[11px] text-slate-400 font-mono mt-0.5 flex items-center gap-2">
              <span>
                {coords.latitude.toFixed(4)}°, {coords.longitude.toFixed(4)}°
              </span>
              <span className="text-slate-500">|</span>
              <span className="text-orange-400 text-[10px]">±{Math.round(coords.accuracy)}m</span>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={onRefreshLocation}
              disabled={isLoadingLocation}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-colors disabled:opacity-50"
              title={t.refreshGps}
            >
              <RefreshCw className={`w-4 h-4 ${isLoadingLocation ? 'animate-spin text-orange-400' : ''}`} />
            </button>
            <button
              type="button"
              onClick={onOpenLocationPicker}
              className="px-2.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-colors text-xs font-semibold flex items-center gap-1"
            >
              <Navigation2 className="w-3.5 h-3.5 text-orange-400" />
              <span className="hidden sm:inline">{t.changeLocation}</span>
            </button>
          </div>
        </div>

        {/* Device Battery & Last Recorded Step Badge */}
        <div className="md:col-span-3 flex flex-col gap-2.5">
          {/* Battery Status Indicator Widget */}
          {battery && (
            <div className="hidden sm:flex items-center justify-between">
              <span className="text-xs text-slate-400 font-medium">
                {t.battery || 'Device Battery'}
              </span>
              <BatteryIndicator
                battery={battery}
                langText={{ battery: t.battery, charging: t.charging }}
                compact={false}
              />
            </div>
          )}

          <div>
            <div className="text-xs text-slate-400 font-medium mb-1 flex items-center justify-between">
              <span>{t.lastRecorded}</span>
              {lastRecord && (
                <span className="text-[10px] text-orange-400 font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  {lastRecord.formattedDateTime.split(' ')[1] || ''}
                </span>
              )}
            </div>
            {lastRecord ? (
              <div className="bg-slate-950/80 p-2.5 rounded-xl border border-slate-800 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-xs font-bold text-white truncate flex items-center gap-1.5">
                    <span className="px-1.5 py-0.2 bg-orange-500/20 text-orange-400 text-[10px] rounded font-black">
                      S{lastRecord.stepId}
                    </span>
                    <span className="truncate">{lastRecord.title}</span>
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5 flex items-center justify-between gap-1">
                    <span>
                      Speed: <span className="text-orange-400 font-bold">{lastRecord.speedCode} km/h</span> • {lastRecord.direction}
                    </span>
                    {lastRecord.batteryLevel !== undefined && (
                      <span className="font-mono text-emerald-400 text-[9px]">
                        ⚡{lastRecord.batteryLevel}%
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-slate-950/60 p-2 rounded-xl border border-dashed border-slate-800 text-center text-xs text-slate-500">
                Trip ready to begin • Step 1
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
