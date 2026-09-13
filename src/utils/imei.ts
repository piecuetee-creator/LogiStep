/**
 * Presence App IMEI Pattern & Criteria Utility
 * 
 * Presence Criteria Formula:
 * 99002 + Company Code (4 digits) + Employee Code (4 digits) + Server (2 digits)
 * Total: Exactly 15 numeric digits (GT06 standard telematics IMEI)
 * 
 * Breakdown:
 * 1. Prefix: '99002' (5 digits) - Virtual telematics series ID
 * 2. Company Code: 4 digits (e.g. '1001')
 * 3. Employee Code: 4 digits (e.g. '0452')
 * 4. Server Code: 2 digits (e.g. '03')
 * 
 * Example:
 * 99002 + 1001 + 0452 + 03 = 990021001045203 (15 digits)
 * GT06 BCD: 09 90 02 10 01 04 52 03 (8 bytes)
 */

export interface ImeiCriteriaCheck {
  isValid: boolean;
  is15Digits: boolean;
  has99Prefix: boolean;
  has99002Series: boolean;
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
 * Builds a 15-digit IMEI according to the Presence criteria pattern:
 * 99002 + Company Code (4D) + Employee Code (4D) + Server (2D)
 */
export function buildPresenceImei(params: {
  companyCode?: string;
  employeeCode?: string;
  serverDigits?: string;
  prefix?: string;
}): string {
  const prefix = (params.prefix || '99002').replace(/\D/g, '').slice(0, 5) || '99002';
  
  // Format company code (4 digits, e.g. '1001')
  const rawCompany = (params.companyCode || '1001').replace(/\D/g, '');
  const companyCode = rawCompany ? rawCompany.padStart(4, '0').slice(-4) : '1001';

  // Format employee code (4 digits, e.g. '0452')
  const rawEmployee = (params.employeeCode || '0452').replace(/\D/g, '');
  const employeeCode = rawEmployee ? rawEmployee.padStart(4, '0').slice(-4) : '0452';

  // Format server digits (2 digits, e.g. '03')
  const rawServer = (params.serverDigits || '03').replace(/\D/g, '');
  const serverCode = rawServer ? rawServer.padStart(2, '0').slice(-2) : '03';

  // Combine: 5 + 4 + 4 + 2 = 15 digits
  return `${prefix}${companyCode}${employeeCode}${serverCode}`;
}

/**
 * Validates any IMEI string against the Presence criteria pattern:
 * 99002 + Company Code (4D) + Employee Code (4D) + Server (2D)
 */
export function validatePresenceImei(imei: string): ImeiCriteriaCheck {
  const clean = (imei || '').trim();
  const digitsOnly = clean.replace(/\D/g, '');

  const hasDigitsOnly = /^\d+$/.test(clean);
  const is15Digits = clean.length === 15 && digitsOnly.length === 15;
  const has99Prefix = clean.startsWith('99');
  const has99002Series = clean.startsWith('99002');

  const series = clean.slice(0, 5);
  // Default slices if 15 digits:
  // [0..5]   = 99002 (5 digits)
  // [5..9]   = Company Code (4 digits)
  // [9..13]  = Employee Code (4 digits)
  // [13..15] = Server (2 digits)
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

  let message = 'Valid Presence IMEI';
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
  } else if (!has99002Series) {
    if (clean.startsWith('99003')) {
      isValid = false;
      message = 'Using obsolete 99003! Update to 99002 series pattern.';
    } else if (clean.startsWith('99')) {
      isValid = true;
      message = `15-digit GT06 compliant (Series: ${series})`;
    } else {
      isValid = false;
      message = "IMEI must begin with Presence '99002' series";
    }
  } else {
    isValid = true;
    message = 'Presence Criteria Met: 99002 + Company (4D) + Employee (4D) + Server (2D)';
  }

  return {
    isValid,
    is15Digits,
    has99Prefix,
    has99002Series,
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
