import React, { useState } from 'react';
import { DriverProfile, SocketConfig, LanguageCode } from '../types';
import { UI_TEXT } from '../utils/i18n';
import { Settings, X, Save, Shield, Server, Truck, User } from 'lucide-react';

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
  const [vehicleNumber, setVehicleNumber] = useState(profile.vehicleNumber);
  const [transporter, setTransporter] = useState(profile.transporter);
  const [consignmentNo, setConsignmentNo] = useState(profile.consignmentNo);
  const [imei, setImei] = useState(profile.imei);
  const [tcpHost, setTcpHost] = useState(socketConfig.tcpHost);
  const [tcpPort, setTcpPort] = useState(socketConfig.tcpPort.toString());

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(
      {
        ...profile,
        driverName: driverName.trim(),
        vehicleNumber: vehicleNumber.trim().toUpperCase(),
        transporter: transporter.trim(),
        consignmentNo: consignmentNo.trim(),
        imei: imei.trim(),
      },
      {
        ...socketConfig,
        tcpHost: tcpHost.trim(),
        tcpPort: parseInt(tcpPort, 10) || 5200,
        imei: imei.trim(),
      }
    );
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-700/80 rounded-3xl p-5 sm:p-6 shadow-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-white">
                {t.configTitle}
              </h3>
              <p className="text-xs text-slate-400">
                Driver profile, vehicle unit ID, and AVL gateway endpoint
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

        {/* Form Body */}
        <form onSubmit={handleSave} className="flex-1 overflow-y-auto space-y-4 py-4 pr-1">
          {/* Section: Driver & Vehicle */}
          <div className="space-y-3 bg-slate-950/70 p-4 rounded-2xl border border-slate-800/80">
            <div className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
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
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-sm font-bold text-white focus:outline-none focus:border-amber-500 font-mono"
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
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">
                  {t.transporterLabel}
                </label>
                <input
                  type="text"
                  value={transporter}
                  onChange={(e) => setTransporter(e.target.value)}
                  placeholder="e.g. VTP Logistics Fleet"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-amber-500"
                />
              </div>
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
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-amber-500 font-mono"
              />
            </div>
          </div>

          {/* Section: Telematics IMEI / Protocol */}
          <div className="space-y-3 bg-slate-950/70 p-4 rounded-2xl border border-slate-800/80">
            <div className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5" />
              GT06 Hardware Telematics & IMEI
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">
                {t.imeiLabel}
              </label>
              <input
                type="text"
                value={imei}
                onChange={(e) => setImei(e.target.value)}
                placeholder="990031001045203"
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-sm font-mono font-bold text-amber-300 focus:outline-none focus:border-amber-500"
              />
              <p className="text-[11px] text-slate-500 mt-1">{t.imeiHelp}</p>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <label className="block text-xs font-medium text-slate-400 mb-1">
                  {t.avlHostLabel}
                </label>
                <input
                  type="text"
                  value={tcpHost}
                  onChange={(e) => setTcpHost(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-sm text-slate-300 font-mono focus:outline-none focus:border-amber-500"
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
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-sm text-slate-300 font-mono focus:outline-none focus:border-amber-500"
                />
              </div>
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
              className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition-colors shadow-lg shadow-amber-500/20"
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
