import React, { useState } from 'react';
import { DriverProfile, SocketConfig, LanguageCode } from '../types';
import { UI_TEXT } from '../utils/i18n';
import { buildFleetImei, validateFleetImei } from '../utils/imei';
import { sendLoginPacket, LoginHandshakeResult } from '../utils/androidBridge';
import {
  Settings,
  X,
  Save,
  Phone,
  CheckCircle2,
  AlertTriangle,
  Building2,
  BadgeCheck,
  Server,
  Radio,
  Loader2,
  Lock,
  LogOut,
  User,
  Truck,
  Smartphone,
  Check,
} from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  profile: DriverProfile;
  socketConfig: SocketConfig;
  onSave: (profile: DriverProfile, config: SocketConfig) => void;
  lang: LanguageCode;
  onLogout?: () => void;
}

export const SettingsModal: React.FC<Props> = ({
  isOpen,
  onClose,
  profile,
  socketConfig,
  onSave,
  lang,
  onLogout,
}) => {
  if (!isOpen) return null;
  const t = UI_TEXT[lang] || UI_TEXT.en;

  const [driverName, setDriverName] = useState(profile.driverName);
  const [driverPhone, setDriverPhone] = useState(profile.driverPhone || '03001045203');
  const [vehicleNumber, setVehicleNumber] = useState(profile.vehicleNumber);
  const [transporter, setTransporter] = useState(profile.transporter);
  const [consignmentNo, setConsignmentNo] = useState(profile.consignmentNo);

  // Active Company Code and Employee Code from profile
  const [companyCode, setCompanyCode] = useState(profile.companyCode || '1001');
  const [employeeCode, setEmployeeCode] = useState(profile.employeeCode || '0452');
  const [serverDigits, setServerDigits] = useState(profile.serverDigits || '01');

  // Gateway config
  const [wsUrl, setWsUrl] = useState(socketConfig.wsUrl || 'ws://avl.vtps.org:5200');
  const [tcpHost, setTcpHost] = useState(socketConfig.tcpHost || 'avl.vtps.org');
  const [tcpPort, setTcpPort] = useState(socketConfig.tcpPort ? socketConfig.tcpPort.toString() : '5200');

  // IMEI is locked & auto-calculated strictly from 99002 + Company Code + Employee Code + Server Digits
  // Matches Presence App pattern (No formula breakdown shown to user)
  const imei = buildFleetImei({
    prefix: '99002',
    companyCode: companyCode || '1001',
    employeeCode: employeeCode || '0452',
    serverDigits: serverDigits || '01',
  });

  // Handshake test state
  const [isTestingHandshake, setIsTestingHandshake] = useState(false);
  const [handshakeResult, setHandshakeResult] = useState<LoginHandshakeResult | null>(null);

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
        serverDigits: serverDigits.trim() || '01',
        imei: finalImei,
      },
      {
        ...socketConfig,
        wsUrl: wsUrl.trim(),
        tcpHost: tcpHost.trim(),
        tcpPort: parseInt(tcpPort, 10) || 5200,
        imei: finalImei,
      }
    );
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-[#0e1626] border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-2xl max-h-[94vh] flex flex-col">
        {/* Top Handle Bar for clean sheet aesthetic */}
        <div className="w-12 h-1 rounded-full bg-slate-700 mx-auto mb-3 opacity-60"></div>

        {/* Header - Matches Presence App: Settings & Protocol */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <Settings className="w-5 h-5 text-orange-500" />
            <h3 className="text-lg font-bold text-white tracking-tight">
              Settings & Protocol
            </h3>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label={t.close}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSave} className="flex-1 overflow-y-auto space-y-4 py-4 pr-1">
          {/* Active Driver Card & Logout */}
          <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-orange-500/15 border border-orange-500/30 flex items-center justify-center text-orange-400 font-bold text-sm">
                {driverName.charAt(0) || 'D'}
              </div>
              <div>
                <div className="text-sm font-bold text-white flex items-center gap-2">
                  <span>{driverName}</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 font-mono">
                    {vehicleNumber}
                  </span>
                </div>
                <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                  <span>{driverPhone}</span>
                  <span>•</span>
                  <span>Co: {companyCode}</span>
                  <span>•</span>
                  <span>Emp: {employeeCode}</span>
                </div>
              </div>
            </div>

            {onLogout && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onLogout();
                }}
                className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-red-950/60 border border-slate-700 hover:border-red-500/50 text-slate-300 hover:text-red-400 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                title="Switch User / Logout"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Switch</span>
              </button>
            )}
          </div>

          {/* WebSocket URL (ws://) - Exact match to Presence App screenshot */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">
              WebSocket URL (ws://)
            </label>
            <input
              type="text"
              value={wsUrl}
              onChange={(e) => setWsUrl(e.target.value)}
              placeholder="ws://avl.vtps.org:5200"
              className="w-full px-3.5 py-2.5 bg-slate-950/90 border border-slate-800 rounded-xl text-sm font-mono text-slate-200 focus:outline-none focus:border-orange-500 transition-colors"
            />
          </div>

          {/* Server Code (2 digits) - Exact match to Presence App screenshot */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">
              Server Code (2 digits)
            </label>
            <div className="relative flex items-center">
              <div className="absolute left-3 text-orange-400">
                <Server className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={serverDigits}
                onChange={(e) => handleServerDigitsChange(e.target.value)}
                maxLength={2}
                placeholder="01"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-950/90 border border-slate-800 rounded-xl text-sm font-mono font-bold text-white focus:outline-none focus:border-orange-500 transition-colors"
              />
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Protocol server code (default: 01). Automatically updates terminal IMEI.
            </p>
          </div>

          {/* TERMINAL IMEI & PROTOCOL Card - Exact match to Presence App screenshot */}
          <div className="p-4 rounded-2xl bg-[#0b1120] border border-slate-800/90 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-orange-500 uppercase tracking-wider">
                <Smartphone className="w-4 h-4 text-orange-500" />
                <span>TERMINAL IMEI & PROTOCOL</span>
              </div>
              <span className="text-[11px] px-2 py-0.5 rounded bg-orange-950/60 text-orange-400 border border-orange-500/30 font-bold">
                15 Digits
              </span>
            </div>

            {/* Inner display box with IMEI and LOCKED badge */}
            <div className="px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
              <span className="text-base sm:text-lg font-mono font-bold text-orange-400 tracking-wider">
                {imei}
              </span>
              <div className="flex items-center gap-1 px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[10px] font-black uppercase tracking-wider">
                <Lock className="w-3 h-3 text-amber-400" />
                <span>LOCKED</span>
              </div>
            </div>

            {/* Explanatory notes */}
            <div className="text-[11px] space-y-1 leading-relaxed">
              <p className="text-slate-400">
                Terminal IMEI is securely generated with active user credentials.
              </p>
              <p className="text-orange-400/90 font-medium">
                Active Server Code: {serverDigits || '01'} (adjustable in Server Configuration above)
              </p>
            </div>
          </div>

          {/* TCP Gateway & Live Handshake Test */}
          <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800/80 space-y-3">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-400">
              <span className="flex items-center gap-1.5">
                <Radio className="w-3.5 h-3.5 text-slate-400" />
                TCP Gateway Connection
              </span>
              <button
                type="button"
                onClick={handleTestLoginPacket}
                disabled={isTestingHandshake}
                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-semibold flex items-center gap-1 transition-colors"
              >
                {isTestingHandshake ? (
                  <Loader2 className="w-3 h-3 animate-spin text-orange-400" />
                ) : (
                  <Radio className="w-3 h-3 text-orange-400" />
                )}
                <span>Test Login (0x01)</span>
              </button>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-2">
                <input
                  type="text"
                  value={tcpHost}
                  onChange={(e) => setTcpHost(e.target.value)}
                  placeholder="avl.vtps.org"
                  className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs font-mono text-slate-300 focus:outline-none focus:border-orange-500"
                />
              </div>
              <div>
                <input
                  type="text"
                  value={tcpPort}
                  onChange={(e) => setTcpPort(e.target.value)}
                  placeholder="5200"
                  className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs font-mono text-slate-300 focus:outline-none focus:border-orange-500"
                />
              </div>
            </div>

            {handshakeResult && (
              <div
                className={`p-2 rounded-lg text-[11px] font-mono border ${
                  handshakeResult.success
                    ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                    : 'bg-amber-950/40 border-amber-500/40 text-amber-300'
                }`}
              >
                {handshakeResult.success
                  ? `ACK (0x01) Received from server!`
                  : handshakeResult.error}
              </div>
            )}
          </div>

          {/* Big Orange Save Configuration Button - Exact match to Presence App screenshot */}
          <button
            type="submit"
            className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-orange-500/25 transition-all transform active:scale-[0.98] cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>Save Configuration</span>
          </button>
        </form>
      </div>
    </div>
  );
};
