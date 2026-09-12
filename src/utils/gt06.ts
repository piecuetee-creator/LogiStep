// Precomputed CRC-16 / X-25 (ITU-T V.41 HDLC FCS) lookup table (polynomial 0x8408 reflected)
const CRC_TABLE = [
  0x0000, 0x1189, 0x2312, 0x329b, 0x4624, 0x57ad, 0x6536, 0x74bf,
  0x8c48, 0x9dc1, 0xaf5a, 0xbed3, 0xca6c, 0xdbe5, 0xe97e, 0xf8f7,
  0x1081, 0x0108, 0x3393, 0x221a, 0x56a5, 0x472c, 0x75b7, 0x643e,
  0x9cc9, 0x8d40, 0xbfdb, 0xae52, 0xdaed, 0xcb64, 0xf9ff, 0xe876,
  0x2102, 0x308b, 0x0210, 0x1399, 0x6726, 0x76af, 0x4434, 0x55bd,
  0xad4a, 0xbcc3, 0x8e58, 0x9fd1, 0xeb6e, 0xfae7, 0xc87c, 0xd9f5,
  0x3183, 0x200a, 0x1291, 0x0318, 0x77a7, 0x662e, 0x54b5, 0x453c,
  0xbdcb, 0xac42, 0x9ed9, 0x8f50, 0xfbef, 0xea66, 0xd8fd, 0xc974,
  0x4204, 0x538d, 0x6116, 0x709f, 0x0420, 0x15a9, 0x2732, 0x36bb,
  0xce4c, 0xdfc5, 0xed5e, 0xfcd7, 0x8868, 0x99e1, 0xab7a, 0xbaf3,
  0x5285, 0x430c, 0x7197, 0x601e, 0x14a1, 0x0528, 0x37b3, 0x263a,
  0xdecd, 0xcf44, 0xfddf, 0xec56, 0x98e9, 0x8960, 0xbbfb, 0xaa72,
  0x6306, 0x728f, 0x4014, 0x519d, 0x2522, 0x34ab, 0x0630, 0x17b9,
  0xef4e, 0xfec7, 0xcc5c, 0xddd5, 0xa96a, 0xb8e3, 0x8a78, 0x9bf1,
  0x7387, 0x620e, 0x5095, 0x411c, 0x35a3, 0x242a, 0x16b1, 0x0738,
  0xffcf, 0xee46, 0xdcdd, 0xcd54, 0xb9eb, 0xa862, 0x9af9, 0x8b70,
  0x8408, 0x9581, 0xa71a, 0xb693, 0xc22c, 0xd3a5, 0xe13e, 0xf0b7,
  0x0840, 0x19c9, 0x2b52, 0x3adb, 0x4e64, 0x5fed, 0x6d76, 0x7cff,
  0x9489, 0x8500, 0xb79b, 0xa612, 0xd2ad, 0xc324, 0xf1bf, 0xe036,
  0x18c1, 0x0948, 0x3bd3, 0x2a5a, 0x5ee5, 0x4f6c, 0x7df7, 0x6c7e,
  0xa50a, 0xb483, 0x8618, 0x9791, 0xe32e, 0xf2a7, 0xc03c, 0xd1b5,
  0x2942, 0x38cb, 0x0a50, 0x1bd9, 0x6f66, 0x7eef, 0x4c74, 0x5dfd,
  0xb58b, 0xa402, 0x9699, 0x8710, 0xf3a9, 0xe220, 0xd0bb, 0xc132,
  0x39c3, 0x284a, 0x1ad1, 0x0b58, 0x7fe7, 0x6e6e, 0x5cf5, 0x4d7c,
  0xc60c, 0xd785, 0xe51e, 0xf497, 0x8028, 0x91a1, 0xa33a, 0xb2b3,
  0x4a44, 0x5bcd, 0x6956, 0x78df, 0x0c60, 0x1de9, 0x2f72, 0x3efb,
  0xd68d, 0xc704, 0xf59f, 0xe416, 0x90a9, 0x8120, 0xb3bb, 0xa232,
  0x5ac5, 0x4b4c, 0x79d7, 0x685e, 0x1ce1, 0x0d68, 0x3ff3, 0x2e7a,
  0xe70e, 0xf687, 0xc41c, 0xd595, 0xa12a, 0xb0a3, 0x8238, 0x93b1,
  0x6b46, 0x7acf, 0x4854, 0x59dd, 0x2d62, 0x3ceb, 0x0e70, 0x1ff9,
  0xf78f, 0xe606, 0xd49d, 0xc514, 0xb1ab, 0xa022, 0x92b9, 0x8330,
  0x7bc7, 0x6a4e, 0x58d5, 0x495c, 0x3de3, 0x2c6a, 0x1ef1, 0x0f78,
];

export function crc16(data: Uint8Array, offset: number, length: number): number {
  let fcs = 0xffff;
  for (let i = offset; i < offset + length; i++) {
    const b = data[i] & 0xff;
    fcs = (fcs >>> 8) ^ CRC_TABLE[(fcs ^ b) & 0xff];
  }
  return (fcs ^ 0xffff) & 0xffff;
}

export function imeiToBcd(imei: string): Uint8Array {
  const cleanImei = imei.replace(/\D/g, '');
  const padded = cleanImei.length % 2 !== 0 ? '0' + cleanImei : cleanImei;
  const bcd = new Uint8Array(8);
  for (let i = 0; i < 8; i++) {
    const start = i * 2;
    if (start + 2 <= padded.length) {
      const hexStr = padded.substring(start, start + 2);
      bcd[i] = parseInt(hexStr, 16) || 0;
    } else {
      bcd[i] = 0;
    }
  }
  return bcd;
}

export function buildLoginPacket(imei: string, serialNo: number): Uint8Array {
  const packet = new Uint8Array(18);
  // Start bits
  packet[0] = 0x78;
  packet[1] = 0x78;
  // Length (0x0D = 13 bytes)
  packet[2] = 0x0d;
  // Protocol: 0x01 (Login)
  packet[3] = 0x01;
  // 8 bytes BCD IMEI
  const bcdImei = imeiToBcd(imei);
  packet.set(bcdImei, 4);
  // Serial number (2 bytes)
  packet[12] = (serialNo >>> 8) & 0xff;
  packet[13] = serialNo & 0xff;
  // CRC-16
  const crc = crc16(packet, 2, 12);
  packet[14] = (crc >>> 8) & 0xff;
  packet[15] = crc & 0xff;
  // Stop bits
  packet[16] = 0x0d;
  packet[17] = 0x0a;
  return packet;
}

export function buildLocationPacket(params: {
  lat: number;
  lon: number;
  isIgnitionOn: boolean; // true for UP, false for DOWN
  speedKmh: number; // 101 to 110 (hijacked speed column for trip step)
  courseAngle?: number;
  satellitesCount?: number;
  altitudeMeters?: number;
  serialNo: number;
  timestampMs?: number;
}): Uint8Array {
  const {
    lat,
    lon,
    isIgnitionOn,
    speedKmh,
    courseAngle = 45,
    satellitesCount = 12,
    serialNo,
    timestampMs = Date.now(),
  } = params;

  const packet = new Uint8Array(36);
  // Start bits
  packet[0] = 0x78;
  packet[1] = 0x78;
  // Packet length: 31 bytes (0x1F)
  packet[2] = 0x1f;
  // Protocol: 0x12 (Location)
  packet[3] = 0x12;

  // UTC Date Time (6 bytes)
  const date = new Date(timestampMs);
  packet[4] = date.getUTCFullYear() % 100;
  packet[5] = date.getUTCMonth() + 1;
  packet[6] = date.getUTCDate();
  packet[7] = date.getUTCHours();
  packet[8] = date.getUTCMinutes();
  packet[9] = date.getUTCSeconds();

  // Satellites
  const sats = Math.max(1, Math.min(15, satellitesCount));
  packet[10] = 0xc0 | (sats & 0x0f);

  // Latitude (4 bytes big-endian: degrees * 1,800,000)
  const latUnits = Math.round(Math.abs(lat) * 1800000);
  packet[11] = (latUnits >>> 24) & 0xff;
  packet[12] = (latUnits >>> 16) & 0xff;
  packet[13] = (latUnits >>> 8) & 0xff;
  packet[14] = latUnits & 0xff;

  // Longitude (4 bytes big-endian: degrees * 1,800,000)
  const lonUnits = Math.round(Math.abs(lon) * 1800000);
  packet[15] = (lonUnits >>> 24) & 0xff;
  packet[16] = (lonUnits >>> 16) & 0xff;
  packet[17] = (lonUnits >>> 8) & 0xff;
  packet[18] = lonUnits & 0xff;

  // Speed in km/h (1 byte: 101 to 110 for LogiStep)
  const clampedSpeed = Math.max(0, Math.min(255, Math.round(speedKmh)));
  packet[19] = clampedSpeed & 0xff;

  // Course & Status flags (2 bytes)
  // Bit 14: GPS tracked (1)
  // Bit 12: GPS valid (1)
  // Bit 11: 1 if West, 0 if East
  // Bit 10: 1 if North, 0 if South
  // Bit 9..0: Course angle
  let statusFlags = 0x5400; // Tracked (0x4000) + Valid (0x1000) + North (0x0400)
  if (lon < 0) statusFlags |= 0x0800; // West
  if (lat < 0) statusFlags &= ~0x0400; // South
  // ACC / Ignition is also recorded in status flags or status packet
  if (isIgnitionOn) {
    statusFlags |= 0x0400; // Bit flag for ACC High
  }

  const clampedAngle = Math.round(courseAngle % 360) & 0x03ff;
  const courseFlags = (statusFlags & 0xfc00) | clampedAngle;
  packet[20] = (courseFlags >>> 8) & 0xff;
  packet[21] = courseFlags & 0xff;

  // LBS information (8 bytes cell tower info)
  packet[22] = 0x01; // MCC high
  packet[23] = 0xcc; // MCC low (410 / 424)
  packet[24] = 0x01; // MNC
  packet[25] = 0x27; // LAC high
  packet[26] = 0x23; // LAC low
  packet[27] = 0x00; // Cell ID byte 1
  packet[28] = 0x1a; // Cell ID byte 2
  packet[29] = 0x6e; // Cell ID byte 3

  // Serial number (2 bytes)
  packet[30] = (serialNo >>> 8) & 0xff;
  packet[31] = serialNo & 0xff;

  // CRC-16 (bytes 2 to 31)
  const crc = crc16(packet, 2, 30);
  packet[32] = (crc >>> 8) & 0xff;
  packet[33] = crc & 0xff;

  // Stop bits
  packet[34] = 0x0d;
  packet[35] = 0x0a;

  return packet;
}

export function bytesToHex(bytes: Uint8Array | number[]): string {
  const arr = Array.from(bytes);
  return arr.map((b) => (b & 0xff).toString(16).padStart(2, '0').toUpperCase()).join(' ');
}

export function buildAckPacket(protocol: number, serialNo: number): Uint8Array {
  const packet = new Uint8Array(10);
  packet[0] = 0x78;
  packet[1] = 0x78;
  packet[2] = 0x05;
  packet[3] = protocol & 0xff;
  packet[4] = (serialNo >>> 8) & 0xff;
  packet[5] = serialNo & 0xff;
  const crc = crc16(packet, 2, 4);
  packet[6] = (crc >>> 8) & 0xff;
  packet[7] = crc & 0xff;
  packet[8] = 0x0d;
  packet[9] = 0x0a;
  return packet;
}
