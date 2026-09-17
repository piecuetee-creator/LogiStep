/**
 * Fleet App IMEI Pattern & Criteria Utility
 * 
 * Fleet App ID Concept:
 * - App ID 99002: Presence (Attendance) App
 * - App ID 99003: LogiStep (Fleet Progression & Telematics) App
 * 
 * Fleet Criteria Formula:
 * 99003 + Company Code (4 digits) + Employee Code (4 digits) + Server (2 digits)
 * Total: Exactly 15 numeric digits (GT06 standard telematics IMEI)
 * 
 * Breakdown:
 * 1. App ID Prefix: '99003' (5 digits) - LogiStep Fleet Telematics Series
 * 2. Company Code: 4 digits (e.g. '1001')
 * 3. Employee Code: 4 digits (e.g. '0452')
 * 4. Server Code: 2 digits (e.g. '01')
 * 
 * Example:
 * 99003 + 1001 + 0452 + 01 = 990031001045201 (15 digits)
 * GT06 BCD: 09 90 03 10 01 04 52 01 (8 bytes)
 */

export interface ImeiCriteriaCheck {
  isValid: boolean;
  is15Digits: boolean;
  has99Prefix: boolean;
  hasAppIdSeries: boolean;
  appId: '99003' | '99002' | string;
  hasDigitsOnly: boolean;
  series: string;
  companyCode: string;
  employeeCode: string;
  serverCode: string;
  formattedDisplay: string;
  bcdHex: string;
  message: string;
}

/**
 * Builds a 15-digit IMEI according to the Fleet criteria pattern:
 * 99003 + Company Code (4D) + Employee Code (4D) + Server (2D)
 */
export function buildFleetImei(params: {
  companyCode?: string;
  employeeCode?: string;
  serverDigits?: string;
  prefix?: string;
}): string {
  const prefix = (params.prefix || '99003').replace(/\D/g, '').slice(0, 5) || '99003';
  
  // Format company code (4 digits, e.g. '1001')
  const rawCompany = (params.companyCode || '1001').replace(/\D/g, '');
  const companyCode = rawCompany ? rawCompany.padStart(4, '0').slice(-4) : '1001';

  // Format employee code (4 digits, e.g. '0452')
  const rawEmployee = (params.employeeCode || '0452').replace(/\D/g, '');
  const employeeCode = rawEmployee ? rawEmployee.padStart(4, '0').slice(-4) : '0452';

  // Format server digits (2 digits, default: '01')
  const rawServer = (params.serverDigits || '01').replace(/\D/g, '');
  const serverCode = rawServer ? rawServer.padStart(2, '0').slice(-2) : '01';

  // Combine: 5 + 4 + 4 + 2 = 15 digits
  return `${prefix}${companyCode}${employeeCode}${serverCode}`;
}

/**
 * Validates any IMEI string against the Fleet criteria pattern:
 * 99003 (LogiStep) or 99002 (Presence) + Company Code (4D) + Employee Code (4D) + Server (2D)
 */
export function validateFleetImei(imei: string): ImeiCriteriaCheck {
  const clean = (imei || '').trim();
  const digitsOnly = clean.replace(/\D/g, '');

  const hasDigitsOnly = /^\d+$/.test(clean);
  const is15Digits = clean.length === 15 && digitsOnly.length === 15;
  const has99Prefix = clean.startsWith('99');
  const isLogiStep = clean.startsWith('99003');
  const isPresence = clean.startsWith('99002');
  const hasAppIdSeries = isLogiStep || isPresence;

  const series = clean.slice(0, 5);
  const companyCode = clean.length >= 9 ? clean.slice(5, 9) : clean.slice(5);
  const employeeCode = clean.length >= 13 ? clean.slice(9, 13) : clean.slice(9);
  const serverCode = clean.length === 15 ? clean.slice(13, 15) : '';

  // Calculate BCD representation for preview
  const padded = digitsOnly.length % 2 !== 0 ? '0' + digitsOnly : digitsOnly;
  const bcdBytes: string[] = [];
  for (let i = 0; i < padded.length; i += 2) {
    bcdBytes.push(padded.substring(i, i + 2));
  }
  const bcdHex = bcdBytes.join(' ');

  const formattedDisplay = clean.length === 15 
    ? `${clean.slice(0, 5)} ${clean.slice(5, 9)} ${clean.slice(9, 13)} ${clean.slice(13, 15)}`
    : clean;

  let message = 'Valid Fleet IMEI';
  let isValid = true;

  if (!clean) {
    isValid = false;
    message = 'IMEI is required';
  } else if (!hasDigitsOnly) {
    isValid = false;
    message = 'IMEI must contain numbers only';
  } else if (clean.length !== 15) {
    isValid = false;
    message = `IMEI must be exactly 15 digits (currently ${clean.length})`;
  } else if (isLogiStep) {
    isValid = true;
    message = 'LogiStep App ID (99003) • 15 Digits GT06 Valid';
  } else if (isPresence) {
    isValid = true;
    message = 'Presence App ID (99002) • 15 Digits GT06 Valid';
  } else if (has99Prefix) {
    isValid = true;
    message = `15-digit GT06 compliant (Series: ${series})`;
  } else {
    isValid = false;
    message = "IMEI must begin with '99003' series for LogiStep";
  }

  return {
    isValid,
    is15Digits,
    has99Prefix,
    hasAppIdSeries,
    appId: isLogiStep ? '99003' : isPresence ? '99002' : series,
    hasDigitsOnly,
    series,
    companyCode,
    employeeCode,
    serverCode,
    formattedDisplay,
    bcdHex,
    message,
  };
}
