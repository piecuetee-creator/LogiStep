import React, { useState } from 'react';
import { LanguageCode } from '../types';
import { UI_TEXT } from '../utils/i18n';
import { triggerHapticFeedback, showAndroidToast } from '../utils/androidBridge';
import {
  Phone,
  Building2,
  BadgeCheck,
  User,
  Truck,
  ShieldCheck,
  LogIn,
  AlertCircle,
  Sparkles,
} from 'lucide-react';

interface LoginCredentials {
  mobile: string;
  companyCode: string;
  employeeCode: string;
  driverName?: string;
  vehicleNumber?: string;
}

interface Props {
  onLogin: (credentials: LoginCredentials) => void;
  lang: LanguageCode;
  onLangChange: (lang: LanguageCode) => void;
  initialValues?: {
    mobile?: string;
    companyCode?: string;
    employeeCode?: string;
    driverName?: string;
    vehicleNumber?: string;
  };
}

export const LoginPage: React.FC<Props> = ({
  onLogin,
  lang,
  onLangChange,
  initialValues,
}) => {
  const t = UI_TEXT[lang] || UI_TEXT.en;
  const isRtl = lang === 'ur' || lang === 'ps';

  const [mobile, setMobile] = useState(initialValues?.mobile || '03001045203');
  const [companyCode, setCompanyCode] = useState(initialValues?.companyCode || '1001');
  const [employeeCode, setEmployeeCode] = useState(initialValues?.employeeCode || '0452');
  const [driverName, setDriverName] = useState(initialValues?.driverName || 'Khan Muhammad');
  const [vehicleNumber, setVehicleNumber] = useState(initialValues?.vehicleNumber || 'TLB-786');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleMobileChange = (val: string) => {
    const clean = val.replace(/\D/g, '').slice(0, 11);
    setMobile(clean);
    if (errorMsg) setErrorMsg(null);
  };

  const handleCompanyCodeChange = (val: string) => {
    const clean = val.replace(/\D/g, '').slice(0, 4);
    setCompanyCode(clean);
    if (errorMsg) setErrorMsg(null);
  };

  const handleEmployeeCodeChange = (val: string) => {
    const clean = val.replace(/\D/g, '').slice(0, 4);
    setEmployeeCode(clean);
    if (errorMsg) setErrorMsg(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    triggerHapticFeedback();

    if (!mobile || mobile.length < 10) {
      setErrorMsg(lang === 'ur' ? 'براہ کرم درست 11 ہندسوں کا موبائل نمبر درج کریں' : 'Please enter a valid mobile number (10-11 digits)');
      return;
    }
    if (!companyCode || companyCode.length !== 4) {
      setErrorMsg(lang === 'ur' ? 'کمپنی کوڈ 4 ہندسوں پر مشتمل ہونا چاہیے' : 'Company code must be exactly 4 digits');
      return;
    }
    if (!employeeCode || employeeCode.length !== 4) {
      setErrorMsg(lang === 'ur' ? 'ایمپلائی کوڈ 4 ہندسوں پر مشتمل ہونا چاہیے' : 'Employee code must be exactly 4 digits');
      return;
    }

    showAndroidToast('Welcome to LogiStep Fleet');
    onLogin({
      mobile: mobile.trim(),
      companyCode: companyCode.trim(),
      employeeCode: employeeCode.trim(),
      driverName: driverName.trim() || 'Driver',
      vehicleNumber: vehicleNumber.trim() || 'TLB-786',
    });
  };

  return (
    <div
      className={`min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between p-4 sm:p-6 ${
        isRtl ? 'rtl' : 'ltr'
      }`}
    >
      {/* Top Bar: Brand & Language Switcher */}
      <div className="max-w-md w-full mx-auto flex items-center justify-between py-2">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl overflow-hidden border border-amber-500/40 bg-slate-900 flex-shrink-0 shadow-md">
            <img
              src="/logo.png"
              alt="LogiStep"
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src = '/icon.svg';
              }}
            />
          </div>
          <div>
            <div className="text-base font-black tracking-tight text-white leading-tight">
              Logi<span className="text-orange-400">Step</span>
            </div>
            <div className="text-[10px] text-slate-400 font-medium">
              VTP Logistics Fleet
            </div>
          </div>
        </div>

        {/* Language Switcher */}
        <div className="flex items-center bg-slate-900/90 p-1 rounded-xl border border-slate-800 text-xs font-semibold">
          <button
            type="button"
            onClick={() => onLangChange('en')}
            className={`px-2 py-1 rounded-lg transition-all ${
              lang === 'en'
                ? 'bg-orange-500 text-slate-950 font-bold shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            EN
          </button>
          <button
            type="button"
            onClick={() => onLangChange('ur')}
            className={`px-2 py-1 rounded-lg transition-all ${
              lang === 'ur'
                ? 'bg-orange-500 text-slate-950 font-bold shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            اردو
          </button>
          <button
            type="button"
            onClick={() => onLangChange('ps')}
            className={`px-2 py-1 rounded-lg transition-all ${
              lang === 'ps'
                ? 'bg-orange-500 text-slate-950 font-bold shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            پښتو
          </button>
        </div>
      </div>

      {/* Main Login Card */}
      <div className="max-w-md w-full mx-auto my-auto py-4">
        <div className="bg-slate-900/95 border border-slate-800/90 rounded-3xl p-6 shadow-2xl shadow-black/80">
          {/* Header Banner */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-500/20 to-amber-500/10 border border-orange-500/30 text-orange-400 mb-3 shadow-inner">
              <ShieldCheck className="w-7 h-7 text-orange-400" />
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              {lang === 'ur'
                ? 'ڈرائیور اور عملہ لاگ ان'
                : lang === 'ps'
                ? 'د چلوونکي او کارکوونکي ننوتل'
                : 'Driver & Fleet Sign In'}
            </h2>
            <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
              {lang === 'ur'
                ? 'فلیٹ ٹریکنگ اور ٹیلی میٹکس تک رسائی کے لیے اپنی اسناد درج کریں'
                : lang === 'ps'
                ? 'د سفر پرمختګ تعقیب لپاره خپل اسناد دننه کړئ'
                : 'Enter your credentials to connect your vehicle and start shift'}
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {errorMsg && (
              <div className="p-3 rounded-xl bg-red-950/60 border border-red-500/40 text-red-300 text-xs flex items-center gap-2 animate-shake">
                <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-400" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Mobile Number */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-orange-400" />
                  {lang === 'ur' ? 'موبائل نمبر' : lang === 'ps' ? 'د موبایل شمېره' : 'Mobile Number'}
                </span>
                <span className="text-[10px] text-slate-500 font-mono">11 Digits</span>
              </label>
              <div className="relative">
                <input
                  type="tel"
                  required
                  value={mobile}
                  onChange={(e) => handleMobileChange(e.target.value)}
                  placeholder="03001045203"
                  maxLength={11}
                  className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-sm font-mono font-bold text-white placeholder-slate-600 focus:outline-none focus:border-orange-500 transition-colors"
                />
              </div>
            </div>

            {/* Two Column: Company Code & Employee Code */}
            <div className="grid grid-cols-2 gap-3">
              {/* Company Code */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <Building2 className="w-3.5 h-3.5 text-cyan-400" />
                    {lang === 'ur' ? 'کمپنی کوڈ' : lang === 'ps' ? 'د شرکت کوډ' : 'Company Code'}
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono">4D</span>
                </label>
                <input
                  type="text"
                  required
                  value={companyCode}
                  onChange={(e) => handleCompanyCodeChange(e.target.value)}
                  placeholder="1001"
                  maxLength={4}
                  className="w-full px-3 py-3 text-center bg-slate-950 border border-slate-800 rounded-xl text-sm font-mono font-bold text-cyan-400 placeholder-slate-600 focus:outline-none focus:border-cyan-400 transition-colors"
                />
              </div>

              {/* Employee Code */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <BadgeCheck className="w-3.5 h-3.5 text-amber-400" />
                    {lang === 'ur' ? 'ایمپلائی کوڈ' : lang === 'ps' ? 'د کارمند کوډ' : 'Employee Code'}
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono">4D</span>
                </label>
                <input
                  type="text"
                  required
                  value={employeeCode}
                  onChange={(e) => handleEmployeeCodeChange(e.target.value)}
                  placeholder="0452"
                  maxLength={4}
                  className="w-full px-3 py-3 text-center bg-slate-950 border border-slate-800 rounded-xl text-sm font-mono font-bold text-amber-400 placeholder-slate-600 focus:outline-none focus:border-amber-400 transition-colors"
                />
              </div>
            </div>

            {/* Optional Additional Metadata: Driver Name & Vehicle No */}
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1">
                  <User className="w-3.5 h-3.5 text-slate-400" />
                  {lang === 'ur' ? 'ڈرائیور کا نام' : lang === 'ps' ? 'د چلوونکي نوم' : 'Driver Name'}
                </label>
                <input
                  type="text"
                  value={driverName}
                  onChange={(e) => setDriverName(e.target.value)}
                  placeholder="Khan Muhammad"
                  className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:border-orange-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1">
                  <Truck className="w-3.5 h-3.5 text-slate-400" />
                  {lang === 'ur' ? 'گاڑی نمبر' : lang === 'ps' ? 'د موټر شمېره' : 'Vehicle Number'}
                </label>
                <input
                  type="text"
                  value={vehicleNumber}
                  onChange={(e) => setVehicleNumber(e.target.value)}
                  placeholder="TLB-786"
                  className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-white placeholder-slate-600 focus:outline-none focus:border-orange-500 transition-colors"
                />
              </div>
            </div>

            {/* Secure Note (No formula exposed!) */}
            <div className="px-3.5 py-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-[11px] text-slate-400 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <span>
                {lang === 'ur'
                  ? 'ٹرمینل ٹیلی میٹکس آپ کی کمپنی اور ایمپلائی آئی ڈی کے ساتھ خودکار منسلک ہوگی'
                  : 'Terminal telemetry is securely bound to your company and employee ID'}
              </span>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-slate-950 font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-orange-500/25 transition-all transform active:scale-[0.98] cursor-pointer mt-2"
            >
              <LogIn className="w-4 h-4" />
              <span>
                {lang === 'ur'
                  ? 'لاگ ان کریں اور سفر شروع کریں'
                  : lang === 'ps'
                  ? 'ننوتل او پیل کول'
                  : 'Sign In & Start Shift'}
              </span>
            </button>
          </form>
        </div>
      </div>

      {/* Footer */}
      <div className="max-w-md w-full mx-auto text-center py-2 text-[11px] text-slate-600">
        LogiStep GT06 Telematics v1.0.8 • VTP Fleet Management
      </div>
    </div>
  );
};
