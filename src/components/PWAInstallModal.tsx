import React, { useState } from 'react';
import { usePWAInstall } from '../utils/usePWAInstall';
import { Download, Smartphone, CheckCircle, ExternalLink, X, QrCode } from 'lucide-react';
import { LanguageCode } from '../types';

interface Props {
  lang: LanguageCode;
}

export const PWAInstallModal: React.FC<Props> = ({ lang }) => {
  const { isInstallable, isInstalled, isIOS, isAndroid, install } = usePWAInstall();
  const [isOpen, setIsOpen] = useState(false);
  const isRtl = lang === 'ur' || lang === 'ps';

  React.useEffect(() => {
    const handleOpen = () => setIsOpen(true);
    window.addEventListener('open-pwa-install', handleOpen);
    return () => window.removeEventListener('open-pwa-install', handleOpen);
  }, []);

  const currentUrl = typeof window !== 'undefined' ? window.location.href : '';

  return (
    <>
      {/* Trigger Button in Header */}
      <button
        type="button"
        onClick={() => {
          if (isInstallable) {
            install();
          } else {
            setIsOpen(true);
          }
        }}
        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl font-bold text-xs transition-all shadow-md ${
          isInstalled
            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 hover:bg-emerald-500/30'
            : 'bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 shadow-emerald-500/20'
        }`}
        title={isInstalled ? 'App Installed' : 'Download / Install Android APK & PWA'}
      >
        {isInstalled ? (
          <>
            <CheckCircle className="w-4 h-4 text-emerald-400" />
            <span className="hidden md:inline">Installed</span>
          </>
        ) : (
          <>
            <Smartphone className="w-4 h-4" />
            <span className="font-mono">APK / App</span>
            <Download className="w-3.5 h-3.5 hidden sm:inline" />
          </>
        )}
      </button>

      {/* Guide Dialog for Android APK, PWA & Direct Installation */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div
            className={`w-full max-w-md rounded-2xl bg-slate-900 border border-slate-700/80 shadow-2xl p-5 text-slate-100 flex flex-col gap-4 ${
              isRtl ? 'font-urdu text-right' : ''
            }`}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl overflow-hidden border border-emerald-500/40 bg-slate-950 flex-shrink-0 shadow-lg shadow-emerald-500/20">
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
                  <h3 className="text-base font-bold text-white flex items-center gap-1.5">
                    LogiStep Android APK & App
                  </h3>
                  <p className="text-xs text-slate-400">Install onto any Android smartphone or tablet</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Direct Instant Action */}
            {isInstallable ? (
              <div className="p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-500/40 flex flex-col gap-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-300">Ready for Instant Install</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-mono">
                    Android Native
                  </span>
                </div>
                <p className="text-xs text-slate-300">
                  Click the button below to install LogiStep directly to your Android home screen as an independent app.
                </p>
                <button
                  type="button"
                  onClick={async () => {
                    await install();
                    setIsOpen(false);
                  }}
                  className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/25 transition-all"
                >
                  <Download className="w-4 h-4" />
                  Install App Now
                </button>
              </div>
            ) : null}

            {/* Direct APK Download Button */}
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <span className="text-xs font-bold text-white flex items-center gap-1.5 truncate">
                  <Download className="w-3.5 h-3.5 text-amber-400" />
                  Direct APK Package
                </span>
                <p className="text-[11px] text-slate-400 font-mono truncate">apk/LogiStep-release.apk</p>
              </div>
              <a
                href="/apk/LogiStep-release.apk"
                download="LogiStep-release.apk"
                className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-all shadow-md flex-shrink-0"
              >
                <Download className="w-3.5 h-3.5" />
                Download APK
              </a>
            </div>

            {/* Android Chrome 2-Step APK / WebApp Instructions */}
            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex flex-col gap-2">
              <span className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                <Smartphone className="w-4 h-4" />
                {isAndroid ? 'Android Chrome Steps:' : 'How to install on Android:'}
              </span>
              <ol className="text-xs text-slate-300 space-y-1.5 list-decimal list-inside leading-relaxed">
                <li>
                  Open this link in <strong>Chrome</strong> on your Android phone.
                </li>
                <li>
                  Tap the <strong>three dots (⋮)</strong> menu in the top right.
                </li>
                <li>
                  Select <strong>"Install app"</strong> or <strong>"Add to Home Screen"</strong>.
                </li>
                <li>The LogiStep APK icon will appear on your phone screen with full offline support.</li>
              </ol>
            </div>

            {/* iOS Safari Fallback */}
            {isIOS && (
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 space-y-1">
                <span className="font-bold text-cyan-400 block">Apple iOS (iPhone/iPad):</span>
                <p>1. Tap the Share button (box with upward arrow) in Safari.</p>
                <p>2. Scroll down and tap <strong>"Add to Home Screen"</strong>.</p>
              </div>
            )}

            {/* Quick URL & Standalone link */}
            <div className="flex items-center justify-between text-[11px] text-slate-400 bg-slate-950/70 px-3 py-2 rounded-xl border border-slate-800">
              <span className="truncate max-w-[240px] font-mono">{currentUrl}</span>
              <a
                href={currentUrl}
                target="_blank"
                rel="noreferrer"
                className="text-amber-400 hover:underline flex items-center gap-1 flex-shrink-0"
              >
                Open in New Tab <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            {/* Close */}
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="w-full py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
};
