export interface BatteryStatus {
  level: number; // 0 - 100 percentage
  isCharging: boolean;
  chargingTime?: number;
  dischargingTime?: number;
  source: 'NATIVE_ANDROID' | 'WEB_BATTERY_API' | 'FALLBACK';
}

type BatteryListener = (status: BatteryStatus) => void;

let cachedBatteryStatus: BatteryStatus = {
  level: 88,
  isCharging: false,
  source: 'FALLBACK',
};

const listeners = new Set<BatteryListener>();

function notifyListeners() {
  listeners.forEach((listener) => {
    try {
      listener(cachedBatteryStatus);
    } catch (e) {
      console.error('Error in battery status listener:', e);
    }
  });
}

/**
 * Poll or read battery status from Native Android Bridge or standard Web Battery API
 */
export async function getBatteryStatus(): Promise<BatteryStatus> {
  // 1. Check Native Android Bridge
  if (typeof (window as any).AndroidBridge?.getBatteryPercentage === 'function') {
    try {
      const level = (window as any).AndroidBridge.getBatteryPercentage();
      let isCharging = false;
      if (typeof (window as any).AndroidBridge?.isBatteryCharging === 'function') {
        isCharging = (window as any).AndroidBridge.isBatteryCharging();
      }

      if (typeof level === 'number' && !isNaN(level) && level >= 0 && level <= 100) {
        cachedBatteryStatus = {
          level: Math.round(level),
          isCharging,
          source: 'NATIVE_ANDROID',
        };
        notifyListeners();
        return cachedBatteryStatus;
      }
    } catch (e) {
      console.warn('[Battery] Native bridge query failed:', e);
    }
  }

  // 2. Check Modern / Chromium Web Battery Status API (navigator.getBattery)
  if (typeof (navigator as any).getBattery === 'function') {
    try {
      const battery = await (navigator as any).getBattery();
      const level = Math.round(battery.level * 100);
      const isCharging = Boolean(battery.charging);

      cachedBatteryStatus = {
        level,
        isCharging,
        chargingTime: battery.chargingTime,
        dischargingTime: battery.dischargingTime,
        source: 'WEB_BATTERY_API',
      };
      notifyListeners();
      return cachedBatteryStatus;
    } catch (e) {
      console.warn('[Battery] navigator.getBattery() failed:', e);
    }
  }

  return cachedBatteryStatus;
}

/**
 * Subscribe to real-time battery status changes
 */
export function subscribeBatteryStatus(callback: BatteryListener): () => void {
  listeners.add(callback);
  callback(cachedBatteryStatus);

  // Initial read
  getBatteryStatus().then((status) => callback(status));

  // Set up listeners if Web Battery API is supported
  let webBatteryObj: any = null;
  const onLevelChange = () => {
    if (webBatteryObj) {
      cachedBatteryStatus = {
        level: Math.round(webBatteryObj.level * 100),
        isCharging: Boolean(webBatteryObj.charging),
        source: 'WEB_BATTERY_API',
      };
      notifyListeners();
    }
  };

  if (typeof (navigator as any).getBattery === 'function') {
    (navigator as any)
      .getBattery()
      .then((battery: any) => {
        webBatteryObj = battery;
        battery.addEventListener('levelchange', onLevelChange);
        battery.addEventListener('chargingchange', onLevelChange);
      })
      .catch(() => {});
  }

  // Periodic polling interval for Android native bridge / web fallback
  const intervalId = setInterval(() => {
    getBatteryStatus();
  }, 10000);

  return () => {
    listeners.delete(callback);
    clearInterval(intervalId);
    if (webBatteryObj) {
      try {
        webBatteryObj.removeEventListener('levelchange', onLevelChange);
        webBatteryObj.removeEventListener('chargingchange', onLevelChange);
      } catch (_e) {}
    }
  };
}
