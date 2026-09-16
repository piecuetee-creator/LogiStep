import React, { useState } from 'react';
import { DriverProfile, SocketConfig, LanguageCode } from '../types';
import { UI_TEXT } from '../utils/i18n';
import { buildFleetImei, validateFleetImei } from '../utils/imei';
import { sendLoginPacket, LoginHandshakeResult } from '../utils/androidBridge';
import {
  Settings,
  X,
  Save,
  Shield,
  Truck,
  Phone,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  Binary,
  Building2,
  BadgeCheck,
  Server,
  Radio,
  Loader2,
  Lock,
} from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  profile: DriverProfile;
  socketConfig: SocketConfig;
  onSave: (profile: DriverProfile, config: SocketConfig) => void;
  lang: LanguageCode;
}

export const SettingsModal: React.FC<Props> = ({
  isOpen,
  onClose,
  profile,
  socketConfig,
  onSave,
  lang,
}) => {
  if (!isOpen) return null;
  const t = UI_TEXT[lang] || UI_TEXT.en;

  const [driverName, setDriverName] = useState(profile.driverName);
  const [driverPhone, setDriverPhone] = useState(profile.driverPhone || '03001045203');
  const [vehicleNumber, setVehicleNumber] = useState(profile.vehicleNumber);
  const [transporter, setTransporter] = useState(profile.transporter);
  const [consignmentNo, setConsignmentNo] = useState(profile.consignmentNo);

  // Fleet formula parameters: 99002 + Company Code (4D) + Employee Code (4D) + Server (2D)
  const [companyCode, setCompanyCode] = useState(profile.companyCode || '1001');
  const [employeeCode, setEmployeeCode] = useState(profile.employeeCode || '0452');
  const [serverDigits, setServerDigits] = useState(profile.serverDigits || '03');

  // IMEI is locked & auto-calculated strictly from 99002 + Company Code + Employee Code + Server Digits
  // (Cannot be manually changed or corrupted once user inserts company code & employee code, matching Presence App)
  const imei = buildFleetImei({
    prefix: '99002',
    companyCode: companyCode || '1001',
    employeeCode: employeeCode || '0452',
    serverDigits: serverDigits || '03',
  });

  const [tcpHost, setTcpHost] = useState(socketConfig.tcpHost);
  const [tcpPort, setTcpPort] = useState(socketConfig.tcpPort.toString());

  // Handshake test state
  const [isTestingHandshake, setIsTestingHandshake] = useState(false);
  const [handshakeResult, setHandshakeResult] = useState<LoginHandshakeResult | null>(null);

  // Real-time IMEI validation against Fleet criteria
  const imeiCheck = validateFleetImei(imei);

  const handleCompanyCodeChange = (val: string) => {
    const clean = val.replace(/\D/g, '').slice(0, 4);
    setCompanyCode(clean);
  };

  const handleEmployeeCodeChange = (val: string) => {
    const clean = val.replace(/\D/g, '').slice(0, 4);
    setEmployeeCode(clean);
  };

  const handleServerDigitsChange = (val: string) => {
    const clean = val.replace(/\D/g, '').slice(0, 2);
    setServerDigits(clean);
  };

  const handleTestLoginPacket = async () => {
    setIsTestingHandshake(true);
    setHandshakeResult(null);
    try {
      const res = await sendLoginPacket({
        imei: imei.trim(),
        tcpHost: tcpHost.trim(),
        tcpPort: parseInt(tcpPort, 10) || 5200,
        timeoutMs: 3500,
      });
      setHandshakeResult(res);
    } catch (e: any) {
      setHandshakeResult({
        success: false,
        txLoginHex: '',
        error: `Server handshake isn't possible: ${e?.message || 'Server offline'}`,
      });
    } finally {
      setIsTestingHandshake(false);
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const finalImei = imei.trim();
    onSave(
      {
        ...profile,
        driverName: driverName.trim(),
        driverPhone: driverPhone.trim(),
        vehicleNumber: vehicleNumber.trim().toUpperCase(),
        transporter: transporter.trim(),
        consignmentNo: consignmentNo.trim(),
        companyCode: companyCode.trim(),
        employeeCode: employeeCode.trim(),
        serverDigits: serverDigits.trim(),
        imei: finalImei,
      },
      {
        ...socketConfig,
        tcpHost: tcpHost.trim(),
        tcpPort: parseInt(tcpPort, 10) || 5200,
        imei: finalImei,
      }
    );
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-700/80 rounded-3xl p-5 sm:p-6 shadow-2xl max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl overflow-hidden border border-orange-500/40 bg-slate-950 flex-shrink-0 shadow-md">
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
              <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                <span>{t.configTitle}</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-orange-500/20 text-orange-400 font-mono font-bold">
                  Series 99002
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Driver profile, Fleet IMEI criteria & AVL gateway
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label={t.close}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave} className="flex-1 overflow-y-auto space-y-4 py-4 pr-1">
          {/* Section: Driver & Vehicle */}
          <div className="space-y-3 bg-slate-950/70 p-4 rounded-2xl border border-slate-800/80">
            <div className="text-xs font-bold text-orange-400 uppercase tracking-wider flex items-center gap-1.5">
              <Truck className="w-3.5 h-3.5" />
              Fleet & Driver Identity
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">
                {t.vehicleNo}
              </label>
              <input
                type="text"
                value={vehicleNumber}
                onChange={(e) => setVehicleNumber(e.target.value)}
                placeholder="e.g. TLB-786"
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-sm font-bold text-white focus:outline-none focus:border-orange-500 font-mono"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">
                  {t.driverNameLabel}
                </label>
                <input
                  type="text"
                  value={driverName}
                  onChange={(e) => setDriverName(e.target.value)}
                  placeholder="e.g. Khan Muhammad"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-orange-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1 flex items-center gap-1">
                  <Phone className="w-3 h-3 text-orange-400" />
                  {t.driverPhoneLabel}
                </label>
                <input
                  type="text"
                  value={driverPhone}
                  onChange={(e) => setDriverPhone(e.target.value)}
                  placeholder="e.g. 03001045203"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-sm font-mono text-white focus:outline-none focus:border-orange-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">
                  {t.transporterLabel}
                </label>
                <input
                  type="text"
                  value={transporter}
                  onChange={(e) => setTransporter(e.target.value)}
                  placeholder="e.g. VTP Logistics Fleet"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-orange-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">
                  {t.consignment}
                </label>
                <input
                  type="text"
                  value={consignmentNo}
                  onChange={(e) => setConsignmentNo(e.target.value)}
                  placeholder="e.g. BILTY-99201"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-orange-500 font-mono"
                />
              </div>
            </div>
          </div>

          {/* Section: Telematics IMEI / Fleet Criteria (99002 + Company + Employee + Server) */}
          <div className="space-y-3 bg-slate-950/70 p-4 rounded-2xl border border-slate-800/80">
            <div className="flex items-center justify-between">
              <div className="text-xs font-bold text-orange-400 uppercase tracking-wider flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5" />
                Fleet IMEI Formula (99002 Series)
              </div>
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-400 bg-emerald-950/40 border border-emerald-500/30 px-2.5 py-1 rounded-lg">
                <Lock className="w-3 h-3" />
                <span>Auto-Locked to Codes</span>
              </div>
            </div>

            {/* Formula Banner */}
            <div className="px-3 py-2 rounded-xl bg-orange-950/40 border border-orange-500/30 text-[11px] text-orange-300 flex items-center justify-between">
              <span className="font-mono font-semibold">
                Formula: <span className="text-orange-400 font-bold">99002</span> (5D) + Company (4D) + Employee (4D) + Server (2D)
              </span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-orange-500/20 text-orange-300 font-bold">
                15 Digits
              </span>
            </div>

            {/* Criteria Breakdown Pillars */}
            <div className="grid grid-cols-4 gap-2 bg-slate-900/90 p-2.5 rounded-xl border border-slate-800 text-center font-mono">
              {/* Pillar 1: Prefix 99002 */}
              <div className="p-1.5 rounded-lg bg-slate-950 border border-orange-500/30">
                <span className="block text-[10px] text-orange-400 font-sans font-semibold">Series (5D)</span>
                <span className="text-xs font-bold text-orange-400">99002</span>
              </div>

              {/* Pillar 2: Company Code (4 digits) */}
              <div className="p-1.5 rounded-lg bg-slate-950 border border-slate-800">
                <span className="block text-[10px] text-slate-400 font-sans flex items-center justify-center gap-0.5">
                  <Building2 className="w-2.5 h-2.5 text-cyan-400" />
                  Co. Code (4D)
                </span>
                <input
                  type="text"
                  value={companyCode}
                  onChange={(e) => handleCompanyCodeChange(e.target.value)}
                  maxLength={4}
                  className="w-full text-center bg-transparent text-xs font-bold text-cyan-400 focus:outline-none"
                  placeholder="1001"
                  title="Company Code (4 digits, e.g. 1001)"
                />
              </div>

              {/* Pillar 3: Employee Code (4 digits) */}
              <div className="p-1.5 rounded-lg bg-slate-950 border border-slate-800">
                <span className="block text-[10px] text-slate-400 font-sans flex items-center justify-center gap-0.5">
                  <BadgeCheck className="w-2.5 h-2.5 text-amber-400" />
                  Emp. Code (4D)
                </span>
                <input
                  type="text"
                  value={employeeCode}
                  onChange={(e) => handleEmployeeCodeChange(e.target.value)}
                  maxLength={4}
                  className="w-full text-center bg-transparent text-xs font-bold text-amber-400 focus:outline-none"
                  placeholder="0452"
                  title="Employee Code (4 digits, e.g. 0452)"
                />
              </div>

              {/* Pillar 4: Server Code (2 digits) */}
              <div className="p-1.5 rounded-lg bg-slate-950 border border-slate-800">
                <span className="block text-[10px] text-slate-400 font-sans flex items-center justify-center gap-0.5">
                  <Server className="w-2.5 h-2.5 text-purple-400" />
                  Server (2D)
                </span>
                <input
                  type="text"
                  value={serverDigits}
                  onChange={(e) => handleServerDigitsChange(e.target.value)}
                  maxLength={2}
                  className="w-full text-center bg-transparent text-xs font-bold text-purple-400 focus:outline-none"
                  placeholder="03"
                  title="Server Code digits (2 digits, e.g. 03)"
                />
              </div>
            </div>

            {/* Main IMEI Field (Locked / Read-Only, strictly bound to Company Code & Employee Code) */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-medium text-slate-400">
                  {t.imeiLabel} (15 Digits)
                </label>
                <div className="flex items-center gap-1.5 text-[11px] text-emerald-400 font-semibold">
                  <Lock className="w-3 h-3 text-emerald-400" />
                  <span>Locked (Auto-generated from Codes)</span>
                </div>
              </div>

              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-400 pointer-events-none">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={imei}
                  readOnly
                  tabIndex={-1}
                  placeholder="990021001045203"
                  className="w-full pl-9 pr-24 py-2.5 bg-slate-950/90 border border-emerald-500/40 rounded-xl text-sm font-mono font-bold text-orange-300 select-all cursor-not-allowed tracking-wider shadow-inner"
                  title="IMEI is locked and automatically generated from 99002 + Company Code + Employee Code + Server Code"
                />
                <div className="absolute right-2.5 top-1/2 -translate-y-1/2">
                  <span className="text-[10px] px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-bold uppercase tracking-wider">
                    Locked
                  </span>
                </div>
              </div>

              {/* Color Segments Visualizer */}
              {imei.length === 15 && (
                <div className="mt-1.5 flex items-center justify-between px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 text-[11px] font-mono">
                  <span className="text-orange-400 font-bold" title="Series Prefix (5 digits)">
                    {imei.slice(0, 5)}
                  </span>
                  <span className="text-slate-600">+</span>
                  <span className="text-cyan-400 font-bold" title="Company Code (4 digits)">
                    {imei.slice(5, 9)}
                  </span>
                  <span className="text-slate-600">+</span>
                  <span className="text-amber-400 font-bold" title="Employee Code (4 digits)">
                    {imei.slice(9, 13)}
                  </span>
                  <span className="text-slate-600">+</span>
                  <span className="text-purple-400 font-bold" title="Server Code (2 digits)">
                    {imei.slice(13, 15)}
                  </span>
                  <span className="text-slate-500 text-[10px] font-sans">
                    (15 digits)
                  </span>
                </div>
              )}

              {/* Validation & BCD Preview Banner */}
              <div className="mt-2 p-2.5 rounded-xl bg-slate-900 border border-slate-800 space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs">
                    {imeiCheck.isValid ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-orange-400" />
                    ) : (
                      <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
                    )}
                    <span
                      className={`font-semibold ${
                        imeiCheck.isValid ? 'text-orange-400' : 'text-red-400'
                      }`}
                    >
                      {imeiCheck.message}
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-slate-500">
                    {imei.length}/15 digits
                  </span>
                </div>

                {/* BCD Hex Byte Representation */}
                <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 pt-1 border-t border-slate-800/80">
                  <span className="flex items-center gap-1 text-slate-500">
                    <Binary className="w-3 h-3" />
                    GT06 BCD:
                  </span>
                  <span className="text-orange-400/90 font-bold">{imeiCheck.bcdHex}</span>
                </div>
              </div>
            </div>

            {/* Gateway TCP Host & Port */}
            <div className="grid grid-cols-3 gap-3 pt-1">
              <div className="col-span-2">
                <label className="block text-xs font-medium text-slate-400 mb-1">
                  {t.avlHostLabel}
                </label>
                <input
                  type="text"
                  value={tcpHost}
                  onChange={(e) => setTcpHost(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-sm text-slate-300 font-mono focus:outline-none focus:border-orange-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">
                  {t.avlPortLabel}
                </label>
                <input
                  type="text"
                  value={tcpPort}
                  onChange={(e) => setTcpPort(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-sm text-slate-300 font-mono focus:outline-none focus:border-orange-500"
                />
              </div>
            </div>

            {/* Send Login Packet & Verify Server Handshake Test */}
            <div className="pt-2 border-t border-slate-800/80">
              <div className="flex items-center justify-between gap-2">
                <div className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <Radio className="w-3.5 h-3.5 text-orange-400" />
                  <span>Test Login Handshake (GT06 0x01)</span>
                </div>
                <button
                  type="button"
                  onClick={handleTestLoginPacket}
                  disabled={isTestingHandshake || !imeiCheck.isValid}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-orange-500/15 hover:bg-orange-500/25 border border-orange-500/30 text-orange-400 hover:text-orange-300 font-bold text-xs transition-colors disabled:opacity-50"
                >
                  {isTestingHandshake ? (
                    <>
                      <Loader2 className="w-3 h-3 animate-spin" />
                      <span>Sending...</span>
                    </>
                  ) : (
                    <span>Send Login Packet</span>
                  )}
                </button>
              </div>

              {/* Handshake Result Alert */}
              {handshakeResult && (
                <div
                  className={`mt-2.5 p-3 rounded-xl border text-xs ${
                    handshakeResult.success
                      ? 'bg-orange-950/40 border-orange-500/40 text-orange-200'
                      : 'bg-red-950/50 border-red-500/50 text-red-200'
                  }`}
                >
                  <div className="font-bold flex items-center gap-1.5">
                    {handshakeResult.success ? (
                      <>
                        <CheckCircle2 className="w-4 h-4 text-orange-400 flex-shrink-0" />
                        <span>{handshakeResult.message || 'Server handshake successful!'}</span>
                      </>
                    ) : (
                      <>
                        <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
                        <span>{handshakeResult.error || "Server handshake isn't possible: Server is offline"}</span>
                      </>
                    )}
                  </div>
                  {handshakeResult.txLoginHex && (
                    <div className="mt-2 text-[10px] font-mono text-slate-400 bg-slate-950/80 p-1.5 rounded border border-slate-800 break-all">
                      <span className="text-slate-500">TX Login: </span>
                      {handshakeResult.txLoginHex}
                      {handshakeResult.rxHex && (
                        <>
                          <br />
                          <span className="text-orange-400">RX ACK: </span>
                          {handshakeResult.rxHex}
                        </>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Action buttons */}
          <div className="pt-2 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-700 bg-slate-800 text-slate-300 font-bold text-xs hover:bg-slate-700 transition-colors"
            >
              {t.cancel}
            </button>
            <button
              type="submit"
              disabled={!imeiCheck.isValid}
              className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-400 disabled:opacity-50 disabled:cursor-not-allowed text-slate-950 font-black text-xs transition-colors shadow-lg shadow-orange-500/20"
            >
              <Save className="w-4 h-4" />
              <span>{t.saveConfig}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
