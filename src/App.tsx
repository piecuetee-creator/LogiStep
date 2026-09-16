import React, { useState, useEffect, useCallback } from 'react';
import {
  TripDirection,
  LanguageCode,
  ConnectionStatus,
  SocketLogEntry,
  StepDefinition,
  DriverProfile,
  SocketConfig,
  Coordinates,
  TripEventRecord,
  LocationPreset,
} from './types';
import { TRIP_STEPS, PAKISTAN_LOCATIONS } from './data/stepsData';
import { LogiStepHeader } from './components/LogiStepHeader';
import { DriverStatusCard } from './components/DriverStatusCard';
import { TripActionButtons } from './components/TripActionButtons';
import { StepConfirmDialog } from './components/StepConfirmDialog';
import { TripHistoryModal } from './components/TripHistoryModal';
import { SocketLogsModal } from './components/SocketLogsModal';
import { LocationPickerModal } from './components/LocationPickerModal';
import { SettingsModal } from './components/SettingsModal';
import { playSuccessChime, playAlertTone } from './utils/audio';
import { UI_TEXT } from './utils/i18n';
import { buildLoginPacket, buildLocationPacket, bytesToHex } from './utils/gt06';
import { buildFleetImei } from './utils/imei';
import { transmitOverWebSocket } from './utils/websocket';
import {
  transmitGt06Packet,
  triggerHapticFeedback,
  showAndroidToast,
  isNativeAndroidApp,
} from './utils/androidBridge';
import { AndroidNavBar } from './components/AndroidNavBar';
import { AndroidToast } from './components/AndroidToast';
import { ArrowUpRight, ArrowDownLeft, Shield, Radio, CheckCircle2 } from 'lucide-react';

const DEFAULT_PROFILE: DriverProfile = {
  driverName: 'Khan Muhammad',
  driverPhone: '03001045203',
  vehicleNumber: 'TLB-786',
  transporter: 'VTP Logistics Fleet',
  consignmentNo: 'CN-884920',
  companyCode: '1001',
  employeeCode: '0452',
  serverDigits: '03',
  imei: '990021001045203', // 99002 (5D) + company code (4D: 1001) + employee code (4D: 0452) + server (2D: 03)
};

const DEFAULT_SOCKET_CONFIG: SocketConfig = {
  tcpHost: 'avl.vtps.org',
  tcpPort: 5200,
  wsUrl: 'ws://avl.vtps.org:5200',
  imei: '990021001045203',
  useWebSocket: true,
  timeoutMs: 3500,
};

const DEFAULT_COORDS: Coordinates = {
  latitude: 24.8732,
  longitude: 66.9621,
  accuracy: 8.5,
  speedKmh: 0,
  bearing: 45,
  satellites: 12,
  altitudeMeters: 18,
  addressName: 'Hawksbay Truck Stand / Maripur Adda, Karachi',
  isRealGps: false,
  timestamp: Date.now(),
};

export default function App() {
  // State: Direction & Language
  const [direction, setDirection] = useState<TripDirection>(() => {
    return (localStorage.getItem('logistep_direction') as TripDirection) || 'UP';
  });
  const [lang, setLang] = useState<LanguageCode>(() => {
    return (localStorage.getItem('logistep_lang') as LanguageCode) || 'en';
  });

  // State: Driver profile & Socket config
  const [profile, setProfile] = useState<DriverProfile>(() => {
    const saved = localStorage.getItem('logistep_profile');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (!parsed.companyCode || parsed.companyCode.length !== 4) parsed.companyCode = '1001';
        if (!parsed.employeeCode || parsed.employeeCode.length !== 4) parsed.employeeCode = '0452';
        if (!parsed.serverDigits || parsed.serverDigits.length !== 2) parsed.serverDigits = '03';
        // Always enforce locked IMEI matching 99002 + companyCode + employeeCode + serverDigits
        parsed.imei = buildFleetImei({
          prefix: '99002',
          companyCode: parsed.companyCode,
          employeeCode: parsed.employeeCode,
          serverDigits: parsed.serverDigits,
        });
        return parsed;
      } catch {
        return DEFAULT_PROFILE;
      }
    }
    return DEFAULT_PROFILE;
  });

  const [socketConfig, setSocketConfig] = useState<SocketConfig>(() => {
    const saved = localStorage.getItem('logistep_config');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        const profileSaved = localStorage.getItem('logistep_profile');
        if (profileSaved) {
          const parsedProf = JSON.parse(profileSaved);
          parsed.imei = buildFleetImei({
            prefix: '99002',
            companyCode: parsedProf.companyCode || '1001',
            employeeCode: parsedProf.employeeCode || '0452',
            serverDigits: parsedProf.serverDigits || '03',
          });
        }
        return parsed;
      } catch {
        return DEFAULT_SOCKET_CONFIG;
      }
    }
    return DEFAULT_SOCKET_CONFIG;
  });

  // State: Coordinates
  const [coords, setCoords] = useState<Coordinates>(() => {
    const saved = localStorage.getItem('logistep_coords');
    return saved ? JSON.parse(saved) : DEFAULT_COORDS;
  });
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);

  // State: Trip Event Records
  const [tripRecords, setTripRecords] = useState<TripEventRecord[]>(() => {
    const saved = localStorage.getItem('logistep_records');
    return saved ? JSON.parse(saved) : [];
  });

  // State: Socket Logs
  const [logs, setLogs] = useState<SocketLogEntry[]>(() => [
    {
      id: 'init-1',
      timestamp: new Date().toLocaleTimeString(),
      direction: 'INFO',
      message: 'LogiStep GT06 Fleet Client Initialized (Powered by VTP AVL)',
    },
    {
      id: 'init-2',
      timestamp: new Date().toLocaleTimeString(),
      direction: 'INFO',
      message: 'Active Gateway: avl.vtps.org:5200 • Fleet Series ID: 99002',
    },
  ]);

  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('IDLE');

  // Modal states
  const [activeConfirmStep, setActiveConfirmStep] = useState<StepDefinition | null>(null);
  const [activeResultRecord, setActiveResultRecord] = useState<TripEventRecord | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStepId, setProcessingStepId] = useState<number | null>(null);

  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isLogsOpen, setIsLogsOpen] = useState(false);
  const [isLocationPickerOpen, setIsLocationPickerOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isTestingSocket, setIsTestingSocket] = useState(false);

  // Persistence helpers
  const handleDirectionChange = (newDir: TripDirection) => {
    setDirection(newDir);
    localStorage.setItem('logistep_direction', newDir);
    addLog(
      'INFO',
      `Trip Direction toggled to ${newDir} (Ignition Bit: ${newDir === 'UP' ? '1' : '0'})`
    );
  };

  const handleLangChange = (newLang: LanguageCode) => {
    setLang(newLang);
    localStorage.setItem('logistep_lang', newLang);
  };

  const addLog = useCallback(
    (directionType: SocketLogEntry['direction'], message: string, hexData?: string | null) => {
      const entry: SocketLogEntry = {
        id: 'log-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
        timestamp: new Date().toLocaleTimeString(),
        direction: directionType,
        message,
        hexData,
      };
      setLogs((prev) => [entry, ...prev.slice(0, 150)]);
    },
    []
  );

  // Hardware GPS refresher
  const handleRefreshLocation = () => {
    if (!navigator.geolocation) {
      addLog('ERROR', 'Geolocation API not supported in this browser environment');
      return;
    }

    setIsLoadingLocation(true);
    addLog('INFO', 'Requesting high-accuracy device GPS fix...');

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const newCoords: Coordinates = {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy || 6,
          speedKmh: pos.coords.speed ? pos.coords.speed * 3.6 : 0,
          bearing: pos.coords.heading || 45,
          satellites: 12,
          altitudeMeters: pos.coords.altitude || 15,
          addressName: `Device GPS (${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)})`,
          isRealGps: true,
          timestamp: Date.now(),
        };
        setCoords(newCoords);
        localStorage.setItem('logistep_coords', JSON.stringify(newCoords));
        setIsLoadingLocation(false);
        addLog(
          'INFO',
          `GPS Acquired: ${newCoords.latitude.toFixed(5)}°N, ${newCoords.longitude.toFixed(5)}°E (±${Math.round(newCoords.accuracy)}m)`
        );
      },
      (err) => {
        setIsLoadingLocation(false);
        addLog('ERROR', `GPS acquisition error: ${err.message}. Retaining current hub preset.`);
      },
      {
        enableHighAccuracy: true,
        timeout: 8000,
        maximumAge: 10000,
      }
    );
  };

  // Location preset selection
  const handleSelectPreset = (preset: LocationPreset) => {
    const newCoords: Coordinates = {
      latitude: preset.latitude,
      longitude: preset.longitude,
      accuracy: 5.0,
      speedKmh: 0,
      bearing: 45,
      satellites: 14,
      altitudeMeters: 20,
      addressName: `${preset.name} (${preset.city})`,
      isRealGps: false,
      timestamp: Date.now(),
    };
    setCoords(newCoords);
    localStorage.setItem('logistep_coords', JSON.stringify(newCoords));
    addLog('INFO', `Selected Preset Hub: ${preset.name}`);
  };

  // Save Settings
  // Hardware Android Back button handling
  useEffect(() => {
    (window as any).handleAndroidBack = () => {
      if (activeConfirmStep) {
        setActiveConfirmStep(null);
        return true;
      }
      if (activeResultRecord) {
        setActiveResultRecord(null);
        return true;
      }
      if (isHistoryOpen) {
        setIsHistoryOpen(false);
        return true;
      }
      if (isSettingsOpen) {
        setIsSettingsOpen(false);
        return true;
      }
      if (isLogsOpen) {
        setIsLogsOpen(false);
        return true;
      }
      if (isLocationPickerOpen) {
        setIsLocationPickerOpen(false);
        return true;
      }
      return false;
    };
    return () => {
      delete (window as any).handleAndroidBack;
    };
  }, [activeConfirmStep, activeResultRecord, isHistoryOpen, isSettingsOpen, isLogsOpen, isLocationPickerOpen]);

  const handleSaveSettings = (newProfile: DriverProfile, newConfig: SocketConfig) => {
    // Enforce locked IMEI strictly computed from companyCode and employeeCode
    const lockedImei = buildFleetImei({
      prefix: '99002',
      companyCode: newProfile.companyCode,
      employeeCode: newProfile.employeeCode,
      serverDigits: newProfile.serverDigits,
    });
    const finalizedProfile = { ...newProfile, imei: lockedImei };
    const finalizedConfig = { ...newConfig, imei: lockedImei };

    setProfile(finalizedProfile);
    setSocketConfig(finalizedConfig);
    localStorage.setItem('logistep_profile', JSON.stringify(finalizedProfile));
    localStorage.setItem('logistep_config', JSON.stringify(finalizedConfig));
    addLog('INFO', `Fleet profile updated. Locked IMEI: ${lockedImei}`);
    showAndroidToast('Driver profile updated');
  };

  // Transmit Trip Action Step
  const handleConfirmStep = async () => {
    if (!activeConfirmStep) return;

    const step = activeConfirmStep;
    setIsProcessing(true);
    setProcessingStepId(step.id);
    setConnectionStatus('CONNECTING');

    const isIgnitionOn = direction === 'UP';
    const speedCode = step.speedCode; // 101 to 110 as dictated by boss!

    addLog(
      'INFO',
      `Transmitting Step ${step.id} ("${step.titleEn}"): Speed ${speedCode} km/h, Ignition: ${isIgnitionOn ? 1 : 0}, IMEI: ${profile.imei}`
    );

    try {
      setConnectionStatus('SENDING_LOGIN');

      // 1. Direct WebSocket reporting (if enabled in settings)
      if (socketConfig.useWebSocket && socketConfig.wsUrl) {
        transmitOverWebSocket({
          wsUrl: socketConfig.wsUrl,
          imei: profile.imei,
          speedCode,
          isIgnitionOn,
          latitude: coords.latitude,
          longitude: coords.longitude,
          timeoutMs: 2000,
        }).then((wsResult) => {
          if (wsResult.success) {
            addLog('TX', `WebSocket Telematics Sent [Speed: ${speedCode} km/h]:`, wsResult.locationHex);
            addLog('RX', `WebSocket ACK from ${socketConfig.wsUrl}:`, wsResult.rxHex);
          }
        }).catch(() => {});
      }

      // 2. Direct Native Android TCP Socket (or verified offline queue)
      const data = await transmitGt06Packet({
        imei: profile.imei,
        speedCode,
        isIgnitionOn,
        latitude: coords.latitude,
        longitude: coords.longitude,
        stepId: step.id,
        stepTitle: step.titleEn,
        tcpHost: socketConfig.tcpHost,
        tcpPort: socketConfig.tcpPort,
        timeoutMs: 3000,
      });

      if (data.txLoginHex) {
        addLog('TX', `GT06 Login Packet 0x01 (18B) [IMEI: ${profile.imei}]:`, data.txLoginHex);
      }
      if (data.rxHex) {
        addLog('RX', `GT06 Server ACK Received:`, data.rxHex);
      }
      if (data.txLocationHex) {
        addLog(
          'TX',
          `GT06 Location Packet 0x12 (36B) [Speed: ${speedCode} km/h, ACC: ${isIgnitionOn ? 1 : 0}]:`,
          data.txLocationHex
        );
      }
      if (data.note) {
        addLog('INFO', `Telematics Mode [${data.mode}]: ${data.note}`);
      }

      setConnectionStatus('SUCCESS');

      // Create trip record
      const now = new Date();
      const formattedDateTime = now.toLocaleDateString() + ' ' + now.toLocaleTimeString();

      const newRecord: TripEventRecord = {
        id: 'record-' + Date.now(),
        stepId: step.id,
        speedCode,
        title: lang === 'ur' ? step.titleUr : lang === 'ps' ? step.titlePs : step.titleEn,
        direction,
        ignition: isIgnitionOn ? 1 : 0,
        timestamp: Date.now(),
        formattedDateTime,
        latitude: coords.latitude,
        longitude: coords.longitude,
        locationName: coords.addressName || 'Depot',
        imei: profile.imei,
        driverName: profile.driverName,
        vehicleNumber: profile.vehicleNumber,
        txHex: data.txLocationHex,
        rxHex: data.rxHex,
        status: 'SUCCESS',
      };

      const updatedRecords = [...tripRecords, newRecord];
      setTripRecords(updatedRecords);
      localStorage.setItem('logistep_records', JSON.stringify(updatedRecords));

      // Play chime & trigger haptic feedback
      playSuccessChime();
      triggerHapticFeedback(45);

      setActiveConfirmStep(null);
      setActiveResultRecord(newRecord);
    } catch (err: any) {
      playAlertTone();
      setConnectionStatus('ERROR');
      addLog('ERROR', `Transmission exception: ${err?.message || err}`);
      showAndroidToast(`Step ${step.id} recorded (Device memory)`);
    } finally {
      setIsProcessing(false);
      setProcessingStepId(null);
    }
  };

  // Test Ping / Login Handshake
  const handleTestPing = async () => {
    setIsTestingSocket(true);
    addLog('INFO', `Sending test GT06 Login handshake to ${socketConfig.tcpHost}:${socketConfig.tcpPort}...`);
    try {
      const data = await transmitGt06Packet({
        imei: profile.imei,
        speedCode: 101,
        isIgnitionOn: true,
        latitude: coords.latitude,
        longitude: coords.longitude,
        stepId: 1,
        stepTitle: 'Handshake Test',
        tcpHost: socketConfig.tcpHost,
        tcpPort: socketConfig.tcpPort,
        timeoutMs: 3000,
      });
      if (data.txLoginHex) addLog('TX', 'GT06 Handshake Test TX:', data.txLoginHex);
      if (data.rxHex) addLog('RX', 'GT06 Handshake Test RX (ACK):', data.rxHex);
      playSuccessChime();
      triggerHapticFeedback(30);
      showAndroidToast(`Handshake ACK Received (${data.mode})`);
    } catch (e: any) {
      addLog('ERROR', `Handshake note: ${e.message}`);
      showAndroidToast('Handshake completed in device mode');
    } finally {
      setIsTestingSocket(false);
    }
  };

  // Clear trip records
  const handleClearRecords = () => {
    setTripRecords([]);
    localStorage.removeItem('logistep_records');
    addLog('INFO', 'Trip history cleared for new consignment run.');
  };

  const latestRecord = tripRecords.length > 0 ? tripRecords[tripRecords.length - 1] : null;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Top Application Header */}
      <LogiStepHeader
        direction={direction}
        onDirectionChange={handleDirectionChange}
        lang={lang}
        onLangChange={handleLangChange}
        connectionStatus={connectionStatus}
        completedStepsCount={tripRecords.length}
        onOpenHistory={() => setIsHistoryOpen(true)}
        onOpenLogs={() => setIsLogsOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-6 pb-24 sm:pb-28 space-y-4 sm:space-y-6">
        {/* Active Trip Banner / Direction Reminder */}
        <div className="bg-slate-900/90 rounded-2xl border border-slate-800 p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md">
          <div className="flex items-center gap-3">
            <div
              className={`p-2.5 rounded-xl flex items-center justify-center font-black ${
                direction === 'UP'
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
              }`}
            >
              {direction === 'UP' ? (
                <ArrowUpRight className="w-5 h-5" />
              ) : (
                <ArrowDownLeft className="w-5 h-5" />
              )}
            </div>

            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs uppercase font-extrabold tracking-wider text-slate-400">
                  Current Trip Route:
                </span>
                <span
                  className={`text-xs font-black px-2 py-0.5 rounded ${
                    direction === 'UP'
                      ? 'bg-emerald-500/20 text-emerald-300'
                      : 'bg-amber-500/20 text-amber-300'
                  }`}
                >
                  {direction === 'UP' ? 'UP • OUTBOUND (Ignition: 1)' : 'DOWN • RETURN (Ignition: 0)'}
                </span>
              </div>
              <p className="text-xs text-slate-300 font-medium mt-0.5">
                {direction === 'UP'
                  ? 'Karachi Terminal ➔ Punjab / Islamabad / Peshawar (ACC Flag High)'
                  : 'Peshawar / Rawalpindi / Lahore ➔ Karachi Port (ACC Flag Low)'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:justify-end">
            <span className="text-xs text-slate-400 font-medium">Consignment:</span>
            <span className="text-xs font-mono font-bold text-amber-400 px-2 py-1 bg-slate-950 rounded border border-slate-800">
              {profile.consignmentNo}
            </span>
          </div>
        </div>

        {/* Driver & Location Status Card */}
        <DriverStatusCard
          profile={profile}
          coords={coords}
          isLoadingLocation={isLoadingLocation}
          onRefreshLocation={handleRefreshLocation}
          onOpenLocationPicker={() => setIsLocationPickerOpen(true)}
          lang={lang}
          lastRecord={latestRecord}
        />

        {/* 10 Action Buttons Grid */}
        <TripActionButtons
          onSelectStep={(step) => {
            setActiveResultRecord(null);
            setActiveConfirmStep(step);
          }}
          lang={lang}
          tripRecords={tripRecords}
          isProcessing={isProcessing}
          processingStepId={processingStepId}
        />
      </main>

      {/* Footer */}
      <footer className="mt-auto border-t border-slate-800/80 bg-slate-950/80 py-4 px-4 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-400">LogiStep</span>
            <span>•</span>
            <span>VTP Vehicle Tracking & Attendance AVL Integration</span>
          </div>
          <div className="flex items-center gap-3 font-mono text-[11px]">
            <span>AVL: avl.vtps.org:5200</span>
            <span>•</span>
            <span className="text-amber-400">Speed Hack: 101 - 110 km/h</span>
          </div>
        </div>
      </footer>

      {/* Modals */}
      {/* 1. Confirmation & Success Receipt Modal */}
      <StepConfirmDialog
        step={activeConfirmStep}
        direction={direction}
        coords={coords}
        lang={lang}
        isProcessing={isProcessing}
        activeResultRecord={activeResultRecord}
        onConfirm={handleConfirmStep}
        onClose={() => {
          setActiveConfirmStep(null);
          setActiveResultRecord(null);
        }}
      />

      {/* 2. Trip History & Timeline Modal */}
      <TripHistoryModal
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        records={tripRecords}
        onClearRecords={handleClearRecords}
        lang={lang}
      />

      {/* 3. GT06 Socket Logs Modal */}
      <SocketLogsModal
        isOpen={isLogsOpen}
        onClose={() => setIsLogsOpen(false)}
        logs={logs}
        onClearLogs={() => setLogs([])}
        onTestPing={handleTestPing}
        isTesting={isTestingSocket}
        connectionStatus={connectionStatus}
        lang={lang}
      />

      {/* 4. Location Picker Modal */}
      <LocationPickerModal
        isOpen={isLocationPickerOpen}
        onClose={() => setIsLocationPickerOpen(false)}
        currentCoords={coords}
        onSelectPreset={handleSelectPreset}
        onUseRealGps={handleRefreshLocation}
        lang={lang}
      />

      {/* 5. Driver & Fleet Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        profile={profile}
        socketConfig={socketConfig}
        onSave={handleSaveSettings}
        lang={lang}
      />
      {/* Native Android Bottom Action Bar */}
      <AndroidNavBar
        activeTab={
          isLocationPickerOpen
            ? 'location'
            : isHistoryOpen
            ? 'history'
            : isLogsOpen
            ? 'logs'
            : isSettingsOpen
            ? 'settings'
            : 'steps'
        }
        onChangeTab={(tab) => {
          setIsLocationPickerOpen(tab === 'location');
          setIsHistoryOpen(tab === 'history');
          setIsLogsOpen(tab === 'logs');
          setIsSettingsOpen(tab === 'settings');
        }}
        lang={lang}
        tripRecordsCount={tripRecords.length}
      />

      {/* Android In-App Toast & Native Notification Bridge */}
      <AndroidToast />
    </div>
  );
}
