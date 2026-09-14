import React from 'react';
import { LocationPreset, Coordinates, LanguageCode } from '../types';
import { PAKISTAN_LOCATIONS } from '../data/stepsData';
import { UI_TEXT } from '../utils/i18n';
import { MapPin, X, Navigation, Check, Compass } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  currentCoords: Coordinates;
  onSelectPreset: (preset: LocationPreset) => void;
  onUseRealGps: () => void;
  lang: LanguageCode;
}

export const LocationPickerModal: React.FC<Props> = ({
  isOpen,
  onClose,
  currentCoords,
  onSelectPreset,
  onUseRealGps,
  lang,
}) => {
  if (!isOpen) return null;
  const t = UI_TEXT[lang] || UI_TEXT.en;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-700/80 rounded-3xl p-5 sm:p-6 shadow-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-orange-500/20 text-orange-400 border border-orange-500/30">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-white">
                {t.selectLocation}
              </h3>
              <p className="text-xs text-slate-400">
                Logistics hubs, terminals, and highway weigh stations
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

        {/* Real GPS Option Button */}
        <div className="my-3">
          <button
            type="button"
            onClick={() => {
              onUseRealGps();
              onClose();
            }}
            className={`w-full flex items-center justify-between p-3.5 rounded-2xl border transition-all ${
              currentCoords.isRealGps
                ? 'bg-orange-950/40 border-orange-500/50 text-orange-300 ring-2 ring-orange-500/20'
                : 'bg-slate-950/80 hover:bg-slate-800/80 border-slate-800 text-slate-300'
            }`}
          >
            <div className="flex items-center gap-3 text-left">
              <div className="p-2 rounded-xl bg-orange-500/20 text-orange-400">
                <Navigation className="w-5 h-5" />
              </div>
              <div>
                <div className="text-sm font-bold text-white flex items-center gap-1.5">
                  <span>{t.realGpsActive}</span>
                  {currentCoords.isRealGps && (
                    <span className="text-[10px] px-1.5 py-0.2 bg-orange-500 text-slate-950 rounded font-black">
                      ACTIVE
                    </span>
                  )}
                </div>
                <div className="text-xs text-slate-400 mt-0.5">
                  Use phone / browser hardware GPS coordinates
                </div>
              </div>
            </div>

            {currentCoords.isRealGps && <Check className="w-5 h-5 text-orange-400" />}
          </button>
        </div>

        {/* Preset Locations List */}
        <div className="text-xs font-bold text-slate-400 mb-2 uppercase tracking-wider">
          Pakistan Logistics Route Hubs (N-5 / M-9 / Terminals)
        </div>

        <div className="flex-1 overflow-y-auto space-y-2 pr-1">
          {PAKISTAN_LOCATIONS.map((preset) => {
            const isSelected =
              !currentCoords.isRealGps &&
              Math.abs(currentCoords.latitude - preset.latitude) < 0.001 &&
              Math.abs(currentCoords.longitude - preset.longitude) < 0.001;

            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => {
                  onSelectPreset(preset);
                  onClose();
                }}
                className={`w-full flex items-center justify-between p-3 rounded-xl border text-left transition-colors ${
                  isSelected
                    ? 'bg-orange-950/40 border-orange-500/60 text-white ring-1 ring-orange-500/30'
                    : 'bg-slate-950/60 hover:bg-slate-800/60 border-slate-800/80 text-slate-300'
                }`}
              >
                <div>
                  <div className="text-sm font-bold text-white flex items-center gap-2">
                    <span>{preset.name}</span>
                    <span className="text-[10px] px-1.5 py-0.2 bg-slate-800 text-slate-400 rounded">
                      {preset.city}
                    </span>
                  </div>
                  <div className="text-xs text-orange-300/80 mt-0.5 font-medium">
                    {preset.nameUrdu}
                  </div>
                  <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                    {preset.latitude.toFixed(4)}°N, {preset.longitude.toFixed(4)}°E
                  </div>
                </div>

                {isSelected && <Check className="w-4 h-4 text-orange-400 flex-shrink-0" />}
              </button>
            );
          })}
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-slate-800 flex justify-end">
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
