import { buildLoginPacket, buildLocationPacket, bytesToHex } from './gt06';

export interface WebSocketTransmitResult {
  success: boolean;
  loginHex: string;
  locationHex: string;
  rxHex?: string;
  error?: string;
}

/**
 * Transmits GT06 binary packets directly over browser WebSocket
 * Matching the exact telematics fleet workflow
 */
export async function transmitOverWebSocket(params: {
  wsUrl: string;
  imei: string;
  speedCode: number;
  isIgnitionOn: boolean;
  latitude: number;
  longitude: number;
  timeoutMs?: number;
}): Promise<WebSocketTransmitResult> {
  const serialNo = Math.floor(Math.random() * 65530) + 1;
  const loginPacket = buildLoginPacket(params.imei, serialNo);
  const locationPacket = buildLocationPacket({
    lat: params.latitude,
    lon: params.longitude,
    isIgnitionOn: params.isIgnitionOn,
    speedKmh: params.speedCode,
    serialNo: (serialNo + 1) % 65535,
  });

  const loginHex = bytesToHex(loginPacket);
  const locationHex = bytesToHex(locationPacket);

  return new Promise((resolve) => {
    let ws: WebSocket;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let resolved = false;

    const cleanup = () => {
      if (timer) clearTimeout(timer);
      if (ws) {
        try {
          ws.close();
        } catch (_e) {
          // ignore
        }
      }
    };

    timer = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        cleanup();
        resolve({
          success: false,
          loginHex,
          locationHex,
          error: `WebSocket timed out after ${params.timeoutMs || 2500}ms`,
        });
      }
    }, params.timeoutMs || 2500);

    try {
      ws = new WebSocket(params.wsUrl);
      ws.binaryType = 'arraybuffer';

      ws.onopen = () => {
        // Send login packet
        ws.send(loginPacket.buffer);
        // Follow up with location packet after short handshake delay
        setTimeout(() => {
          if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(locationPacket.buffer);
          }
        }, 150);
      };

      ws.onmessage = (event) => {
        let rxHex = '';
        if (event.data instanceof ArrayBuffer) {
          rxHex = bytesToHex(new Uint8Array(event.data));
        } else if (typeof event.data === 'string') {
          rxHex = event.data;
        }
        if (!resolved) {
          resolved = true;
          cleanup();
          resolve({
            success: true,
            loginHex,
            locationHex,
            rxHex: rxHex || '78 78 05 01 (ACK)',
          });
        }
      };

      ws.onerror = (err: any) => {
        if (!resolved) {
          resolved = true;
          cleanup();
          resolve({
            success: false,
            loginHex,
            locationHex,
            error: err?.message || 'WebSocket connection error (Mixed content or unreachable)',
          });
        }
      };
    } catch (err: any) {
      if (!resolved) {
        resolved = true;
        cleanup();
        resolve({
          success: false,
          loginHex,
          locationHex,
          error: err?.message || 'WebSocket initialization failed',
        });
      }
    }
  });
}
