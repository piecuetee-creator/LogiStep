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
import { TRIP_STEPS, DUTY_ACTIVITIES, PAKISTAN_LOCATIONS } from './data/stepsData';
import { LogiStepHeader } from './components/LogiStepHeader';
import { DriverStatusCard } from './components/DriverStatusCard';
import { TripActionButtons } from './components/TripActionButtons';
import { DutyActionButtons } from './components/DutyActionButtons';
import { StepConfirmDialog } from './components/StepConfirmDialog';
import { TripHistoryModal } from './components/TripHistoryModal';
import { SocketLogsModal } from './components/SocketLogsModal';
import { LocationPickerModal } from './components/LocationPickerModal';
import { SettingsModal } from './components/SettingsModal';
import { LoginPage } from './components/LoginPage';
import { playSuccessChime, playAlertTone } from './utils/audio';
import { UI_TEXT } from './utils/i18n';
import { buildLoginPacket, buildLocationPacket, bytesToHex } from './utils/gt06';
import { buildFleetImei } from './utils/imei';
import { transmitOverWebSocket } from './utils/websocket';
import {
  enqueuePacket,
  getPendingPackets,
  getPendingCount,
  markPacketSynced,
  markPacketFailed,
  syncAllPendingPackets,
} from './utils/offlineQueue';
import {
  transmitGt06Packet,
  triggerHapticFeedback,
  showAndroidToast,
  isNativeAndroidApp,
} from './utils/androidBridge';
import { AndroidNavBar } from './components/AndroidNavBar';
import { AndroidToast } from './components/AndroidToast';
import {
  ArrowUpRight,
  ArrowDownLeft,
  Shield,
  Radio,
  CheckCircle2,
  CloudUpload,
  RefreshCw,
  Clock,
  Compass,
  Briefcase,
  Layers,
} from 'lucide-react';
import { DutyActivityDefinition } from './types';

const DEFAULT_PROFILE: DriverProfile = {
  driverName: 'Khan Muhammad',
  driverPhone: '03001045203',
  vehicleNumber: 'TLB-786',
  transporter: 'VTP Logistics Fleet',
  consignmentNo: 'CN-884920',
  companyCode: '1001',
  employeeCode: '0452',
  serverDigits: '01',
  imei: '990031001045201', // LogiStep App ID: 99003 (5D) + company code (4D: 1001) + employee code (4D: 0452) + server (2D: 01)
};

const DEFAULT_SOCKET_CONFIG: SocketConfig = {
  tcpHost: 'avl.vtps.org',
  tcpPort: 5200,
  wsUrl: 'ws://avl.vtps.org:5200',
  imei: '990031001045201',
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

  // State: Authentication / Login Status
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(() => {
    return localStorage.getItem('logistep_is_logged_in') === 'true';
  });

  // State: Driver profile & Socket config
  const [profile, setProfile] = useState<DriverProfile>(() => {
    const saved = localStorage.getItem('logistep_profile');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (!parsed.companyCode || parsed.companyCode.length !== 4) parsed.companyCode = '1001';
        if (!parsed.employeeCode || parsed.employeeCode.length !== 4) parsed.employeeCode = '0452';
        if (!parsed.serverDigits || parsed.serverDigits.length !== 2) parsed.serverDigits = '01';
        // Always enforce locked IMEI matching 99003 (LogiStep App ID) + companyCode + employeeCode + serverDigits
        parsed.imei = buildFleetImei({
          prefix: '99003',
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
            prefix: '99003',
            companyCode: parsedProf.companyCode || '1001',
            employeeCode: parsedProf.employeeCode || '0452',
            serverDigits: parsedProf.serverDigits || '01',
          });
        }
        return parsed;
      } catch {
        return DEFAULT_SOCKET_CONFIG;
      }
    }
    return DEFAULT_SOCKET_CONFIG;
  });

  // Dual Activity Tabs: 'journey' (10-Step Fleet Progression) vs 'duty' (Everyday Routine Activities)
  const [activityTab, setActivityTab] = useState<'journey' | 'duty'>('journey');

  // Offline Store-and-Forward Telematics Queue state
  const [pendingCount, setPendingCount] = useState<number>(() => getPendingCount());
  const [isSyncingQueue, setIsSyncingQueue] = useState(false);

  // Active Duty Action state (for confirmation / logging)
  const [activeConfirmDuty, setActiveConfirmDuty] = useState<DutyActivityDefinition | null>(null);
  const [processingDutyId, setProcessingDutyId] = useState<number | null>(null);

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
    // Enforce locked IMEI strictly computed from LogiStep App ID 99003 + companyCode + employeeCode + serverDigits
    const lockedImei = buildFleetImei({
      prefix: '99003',
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

  const handleLogin = (credentials: {
    mobile: string;
    companyCode: string;
    employeeCode: string;
    driverName?: string;
    vehicleNumber?: string;
  }) => {
    const activeServerDigits = profile.serverDigits || '01';
    const computedImei = buildFleetImei({
      prefix: '99003',
      companyCode: credentials.companyCode,
      employeeCode: credentials.employeeCode,
      serverDigits: activeServerDigits,
    });

    const updatedProfile: DriverProfile = {
      ...profile,
      driverPhone: credentials.mobile,
      companyCode: credentials.companyCode,
      employeeCode: credentials.employeeCode,
      driverName: credentials.driverName || profile.driverName,
      vehicleNumber: credentials.vehicleNumber || profile.vehicleNumber,
      serverDigits: activeServerDigits,
      imei: computedImei,
    };

    const updatedSocketConfig: SocketConfig = {
      ...socketConfig,
      imei: computedImei,
    };

    setProfile(updatedProfile);
    setSocketConfig(updatedSocketConfig);
    setIsLoggedIn(true);

    localStorage.setItem('logistep_profile', JSON.stringify(updatedProfile));
    localStorage.setItem('logistep_config', JSON.stringify(updatedSocketConfig));
    localStorage.setItem('logistep_is_logged_in', 'true');

    addLog('INFO', `Driver logged in. Mobile: ${credentials.mobile}, Co: ${credentials.companyCode}, Emp: ${credentials.employeeCode}`);
    showAndroidToast(`Welcome ${updatedProfile.driverName}`);
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    localStorage.removeItem('logistep_is_logged_in');
    showAndroidToast('Signed out');
    addLog('INFO', 'Driver signed out.');
  };

  // Sync all pending packets in device buffer
  const handleSyncQueue = async () => {
    if (isSyncingQueue) return;
    setIsSyncingQueue(true);
    addLog('INFO', `Initiating Store-and-Forward sync for buffered packets...`);

    try {
      const result = await syncAllPendingPackets({
        tcpHost: socketConfig.tcpHost,
        tcpPort: socketConfig.tcpPort,
        onPacketSuccess: (packet, rxHex) => {
          addLog('TX', `Buffered ${packet.title} [${packet.speedCode} km/h] Synced:`, packet.txLocationHex);
          addLog('RX', `Server ACK Received:`, rxHex);
        },
        onPacketError: (packet, err) => {
          addLog('ERROR', `Sync error for ${packet.title}: ${err}`);
        },
      });

      setPendingCount(getPendingCount());
      if (result.synced > 0) {
        playSuccessChime();
        triggerHapticFeedback(40);
        showAndroidToast(`Successfully synced ${result.synced} packets to server`);
      } else {
        showAndroidToast(result.total === 0 ? 'Buffer is already up to date' : 'Server still offline. Packets kept safely in device buffer.');
      }
    } catch (e: any) {
      addLog('ERROR', `Queue sync exception: ${e?.message}`);
    } finally {
      setIsSyncingQueue(false);
    }
  };

  // Auto-sync listener when internet connection is restored (e.g. driver reaches city after remote highway)
  useEffect(() => {
    const handleOnline = () => {
      addLog('INFO', 'Network connection detected. Triggering auto-sync for buffered telematics...');
      handleSyncQueue();
    };
    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [socketConfig]);

  // Transmit Trip Action Step
  const handleConfirmStep = async () => {
    if (!activeConfirmStep) return;

    const step = activeConfirmStep;
    setIsProcessing(true);
    setProcessingStepId(step.id);
    setConnectionStatus('CONNECTING');

    const isIgnitionOn = direction === 'UP';
    const speedCode = step.speedCode; // 101 to 110 as dictated by boss!

    // Generate binary GT06 frames
    const serialNo = Math.floor(Math.random() * 65530) + 1;
    const loginPacket = buildLoginPacket(profile.imei, serialNo);
    const locPacket = buildLocationPacket({
      lat: coords.latitude,
      lon: coords.longitude,
      isIgnitionOn,
      speedKmh: speedCode,
      serialNo: (serialNo + 1) % 65535,
      satellitesCount: 14,
    });
    const txLoginHex = bytesToHex(loginPacket);
    const txLocationHex = bytesToHex(locPacket);

    // 1. Stage in offline persistent queue immediately (Store-and-Forward Job 2)
    const stagedPacket = enqueuePacket({
      timestamp: Date.now(),
      formattedDateTime: new Date().toLocaleDateString() + ' ' + new Date().toLocaleTimeString(),
      activityType: 'JOURNEY',
      stepId: step.id,
      title: lang === 'ur' ? step.titleUr : lang === 'ps' ? step.titlePs : step.titleEn,
      speedCode,
      direction,
      ignition: isIgnitionOn ? 1 : 0,
      latitude: coords.latitude,
      longitude: coords.longitude,
      locationName: coords.addressName || 'Karachi Depot',
      imei: profile.imei,
      txLoginHex,
      txLocationHex,
    });
    setPendingCount(getPendingCount());

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

      // If transmission succeeded live, mark buffered packet synced
      if (data.success && data.mode !== 'OFFLINE_SAVED') {
        markPacketSynced(stagedPacket.id, data.rxHex);
      }
      setPendingCount(getPendingCount());

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

  // Handle logging a recurring Duty Activity (Meal, Fuel, Namaz, etc.)
  const handleSelectDuty = async (duty: DutyActivityDefinition) => {
    setIsProcessing(true);
    setProcessingDutyId(duty.id);
    setConnectionStatus('CONNECTING');

    const isIgnitionOn = direction === 'UP';
    const speedCode = duty.speedCode; // 121 to 128

    const serialNo = Math.floor(Math.random() * 65530) + 1;
    const loginPacket = buildLoginPacket(profile.imei, serialNo);
    const locPacket = buildLocationPacket({
      lat: coords.latitude,
      lon: coords.longitude,
      isIgnitionOn,
      speedKmh: speedCode,
      serialNo: (serialNo + 1) % 65535,
      satellitesCount: 14,
    });
    const txLoginHex = bytesToHex(loginPacket);
    const txLocationHex = bytesToHex(locPacket);

    // 1. Stage in offline persistent queue
    const stagedPacket = enqueuePacket({
      timestamp: Date.now(),
      formattedDateTime: new Date().toLocaleDateString() + ' ' + new Date().toLocaleTimeString(),
      activityType: 'DUTY',
      stepId: duty.id,
      title: lang === 'ur' ? duty.titleUr : lang === 'ps' ? duty.titlePs : duty.titleEn,
      speedCode,
      direction,
      ignition: isIgnitionOn ? 1 : 0,
      latitude: coords.latitude,
      longitude: coords.longitude,
      locationName: coords.addressName || 'Highway Stop',
      imei: profile.imei,
      txLoginHex,
      txLocationHex,
    });
    setPendingCount(getPendingCount());

    addLog(
      'INFO',
      `Duty Activity Recorded: "${duty.titleEn}" (Speed: ${speedCode} km/h, Ignition: ${isIgnitionOn ? 1 : 0})`
    );

    try {
      // 2. Direct Native Android TCP Socket or Web proxy
      const data = await transmitGt06Packet({
        imei: profile.imei,
        speedCode,
        isIgnitionOn,
        latitude: coords.latitude,
        longitude: coords.longitude,
        stepId: duty.id,
        stepTitle: duty.titleEn,
        tcpHost: socketConfig.tcpHost,
        tcpPort: socketConfig.tcpPort,
        timeoutMs: 3000,
      });

      if (data.txLoginHex) addLog('TX', `GT06 Login Packet 0x01:`, data.txLoginHex);
      if (data.rxHex) addLog('RX', `GT06 Server ACK Received:`, data.rxHex);
      if (data.txLocationHex) addLog('TX', `GT06 Location Packet 0x12 [Duty ${speedCode} km/h]:`, data.txLocationHex);

      if (data.success && data.mode !== 'OFFLINE_SAVED') {
        markPacketSynced(stagedPacket.id, data.rxHex);
      }
      setPendingCount(getPendingCount());

      // Create record
      const now = new Date();
      const formattedDateTime = now.toLocaleDateString() + ' ' + now.toLocaleTimeString();

      const newRecord: TripEventRecord = {
        id: 'duty-' + Date.now(),
        stepId: duty.id,
        speedCode,
        title: lang === 'ur' ? duty.titleUr : lang === 'ps' ? duty.titlePs : duty.titleEn,
        direction,
        ignition: isIgnitionOn ? 1 : 0,
        timestamp: Date.now(),
        formattedDateTime,
        latitude: coords.latitude,
        longitude: coords.longitude,
        locationName: coords.addressName || 'Duty Stop',
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

      playSuccessChime();
      triggerHapticFeedback(45);
      showAndroidToast(
        lang === 'ur'
          ? `${duty.titleUr} کا اندراج ہو گیا`
          : `${duty.titleEn} logged successfully`
      );
    } catch (e: any) {
      playAlertTone();
      addLog('ERROR', `Duty log exception: ${e?.message}`);
      showAndroidToast('Recorded in offline device storage');
    } finally {
      setIsProcessing(false);
      setProcessingDutyId(null);
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

  // Show Login Page if driver / employee is not signed in
  if (!isLoggedIn) {
    return (
      <LoginPage
        onLogin={handleLogin}
        lang={lang}
        onLangChange={handleLangChange}
        initialValues={{
          mobile: profile.driverPhone,
          companyCode: profile.companyCode,
          employeeCode: profile.employeeCode,
          driverName: profile.driverName,
          vehicleNumber: profile.vehicleNumber,
        }}
      />
    );
  }

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
        onLogout={handleLogout}
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

        {/* Offline Store-and-Forward Telematics Buffer Strip */}
        <div className="bg-slate-900/90 rounded-2xl border border-slate-800 p-3 sm:p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md">
          <div className="flex items-center gap-2.5">
            <div
              className={`p-2 rounded-xl flex items-center justify-center ${
                pendingCount > 0
                  ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30 animate-pulse'
                  : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
              }`}
            >
              {pendingCount > 0 ? (
                <CloudUpload className="w-4 h-4" />
              ) : (
                <CheckCircle2 className="w-4 h-4" />
              )}
            </div>

            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-white">
                  {lang === 'ur'
                    ? 'آف لائن بفر اور محفوظ ترسیل'
                    : lang === 'ps'
                    ? 'آفلاین زېرمه او همغږي'
                    : 'Store-and-Forward Telematics Engine'}
                </span>
                <span
                  className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-md border ${
                    pendingCount > 0
                      ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                      : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                  }`}
                >
                  {pendingCount > 0
                    ? `${pendingCount} Queued Offline`
                    : 'Online • All Packets Synced'}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {pendingCount > 0
                  ? lang === 'ur'
                    ? 'سفر کی سرگرمیاں ڈیوائس میں محفوظ ہیں۔ انٹرنیٹ ملتے ہی خودکار طور پر سرور پر منتقل ہو جائیں گی۔'
                    : 'Packets stored safely on device. Will auto-sync to server as soon as connection is detected.'
                  : lang === 'ur'
                  ? 'تمام سرگرمیاں تاریخ اور وقت کے ساتھ سرور پر کامیابی سے موصول ہو چکی ہیں۔'
                  : 'All GPS coordinates and GT06 telemetry events delivered with original timestamps.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:self-center self-end">
            <button
              type="button"
              onClick={handleSyncQueue}
              disabled={isSyncingQueue || pendingCount === 0}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                pendingCount > 0
                  ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-md shadow-amber-950/40 cursor-pointer active:scale-95'
                  : 'bg-slate-800 text-slate-500 border border-slate-700/50 cursor-not-allowed opacity-60'
              }`}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncingQueue ? 'animate-spin' : ''}`} />
              <span>
                {isSyncingQueue
                  ? 'Syncing...'
                  : pendingCount > 0
                  ? `Sync Now (${pendingCount})`
                  : 'Up to Date'}
              </span>
            </button>
          </div>
        </div>

        {/* Dual Activity Segmented Switcher (Journey vs Duty) */}
        <div className="bg-slate-900/90 p-1.5 rounded-2xl border border-slate-800 flex items-center gap-1.5 shadow-lg">
          <button
            type="button"
            onClick={() => setActivityTab('journey')}
            className={`flex-1 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-black flex items-center justify-center gap-2 transition-all cursor-pointer ${
              activityTab === 'journey'
                ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-slate-950 shadow-md shadow-orange-950/40'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Compass className="w-4 h-4" />
            <span>
              {lang === 'ur'
                ? 'سفری سرگرمیاں (10 مراحل)'
                : lang === 'ps'
                ? 'د سفر ۱۰ پړاوونه'
                : 'Journey Activities (10 Steps)'}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActivityTab('duty')}
            className={`flex-1 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-black flex items-center justify-center gap-2 transition-all cursor-pointer ${
              activityTab === 'duty'
                ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 shadow-md shadow-emerald-950/40'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Briefcase className="w-4 h-4" />
            <span>
              {lang === 'ur'
                ? 'ڈیوٹی معمولات (کھانا، ڈیزل، نماز)'
                : lang === 'ps'
                ? 'د دندې چارې (ډوډۍ، تېل، لمونځ)'
                : 'Duty Activities (Meal, Fuel, Namaz)'}
            </span>
          </button>
        </div>

        {/* Dynamic Activity Panels based on selected tab */}
        {activityTab === 'journey' ? (
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
        ) : (
          <DutyActionButtons
            onSelectDuty={handleSelectDuty}
            lang={lang}
            tripRecords={tripRecords}
            isProcessing={isProcessing}
            processingDutyId={processingDutyId}
          />
        )}
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
        onLogout={handleLogout}
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
