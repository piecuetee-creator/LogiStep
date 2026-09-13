export type TripDirection = 'UP' | 'DOWN';

export type LanguageCode = 'en' | 'ur' | 'ps';

export type ConnectionStatus =
  | 'IDLE'
  | 'CONNECTING'
  | 'CONNECTED'
  | 'SENDING_LOGIN'
  | 'LOGIN_ACK'
  | 'SENDING_LOCATION'
  | 'SUCCESS'
  | 'ERROR';

export type LogDirection = 'INFO' | 'TX' | 'RX' | 'ERROR';

export interface SocketLogEntry {
  id: string;
  timestamp: string;
  direction: LogDirection;
  message: string;
  hexData?: string | null;
}

export interface StepDefinition {
  id: number; // 1 to 10
  speedCode: number; // 101 to 110
  titleEn: string;
  titleUr: string;
  titlePs: string;
  subtitleEn: string;
  subtitleUr: string;
  subtitlePs: string;
  badgeEn: string;
  badgeUr: string;
  badgePs: string;
  iconName: string;
  accentColor: string; // Tailwind color token
  borderHover: string;
  bgGradient: string;
  glowColor: string;
}

export interface DriverProfile {
  driverName: string;
  driverPhone?: string;
  vehicleNumber: string;
  transporter: string;
  consignmentNo: string;
  companyCode?: string;
  employeeCode?: string;
  serverDigits: string;
  imei: string;
}

export interface SocketConfig {
  tcpHost: string;
  tcpPort: number;
  wsUrl: string;
  imei: string;
  useWebSocket: boolean;
  timeoutMs: number;
}

export interface Coordinates {
  latitude: number;
  longitude: number;
  accuracy: number;
  speedKmh: number;
  bearing: number;
  satellites: number;
  altitudeMeters: number;
  addressName: string;
  isRealGps: boolean;
  timestamp: number;
}

export interface TripEventRecord {
  id: string;
  stepId: number;
  speedCode: number;
  title: string;
  direction: TripDirection;
  ignition: number; // 1 for UP, 0 for DOWN
  timestamp: number;
  formattedDateTime: string;
  latitude: number;
  longitude: number;
  locationName: string;
  imei: string;
  driverName: string;
  vehicleNumber: string;
  txHex?: string;
  rxHex?: string;
  status: 'SUCCESS' | 'FAILED';
  errorDetails?: string;
}

export interface LocationPreset {
  id: string;
  name: string;
  nameUrdu: string;
  city: string;
  latitude: number;
  longitude: number;
  category: 'port' | 'depot' | 'highway' | 'destination';
}
