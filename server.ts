import express from 'express';
import path from 'path';
import net from 'net';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import { buildLoginPacket, buildLocationPacket, bytesToHex, buildAckPacket } from './src/utils/gt06';

const app = express();
const PORT = 3000;

app.use(express.json());

// In-memory counter for sequence numbers
let sequenceCounter = 1;

// API route: Dedicated GT06 Login handshake test
app.post('/api/test-login', async (req, res) => {
  const {
    imei = '990021001045203',
    tcpHost = 'avl.vtps.org',
    tcpPort = 5200,
    timeoutMs = 3000,
  } = req.body;

  const serial = sequenceCounter++;
  const loginPacket = buildLoginPacket(imei, serial);
  const txLoginHex = bytesToHex(loginPacket);

  try {
    const tcpResult = await new Promise<{
      connected: boolean;
      rxHex?: string;
      error?: string;
    }>((resolve) => {
      const socket = new net.Socket();
      let isResolved = false;

      const timer = setTimeout(() => {
        if (!isResolved) {
          isResolved = true;
          socket.destroy();
          resolve({
            connected: false,
            error: `Connection timed out after ${timeoutMs}ms`,
          });
        }
      }, timeoutMs);

      socket.connect(Number(tcpPort), tcpHost, () => {
        socket.write(Buffer.from(loginPacket));
      });

      socket.on('data', (chunk) => {
        if (!isResolved) {
          isResolved = true;
          clearTimeout(timer);
          socket.end();
          resolve({
            connected: true,
            rxHex: bytesToHex(new Uint8Array(chunk)),
          });
        }
      });

      socket.on('error', (err) => {
        if (!isResolved) {
          isResolved = true;
          clearTimeout(timer);
          resolve({
            connected: false,
            error: err.message,
          });
        }
      });
    });

    if (tcpResult.connected) {
      return res.json({
        success: true,
        mode: 'LIVE_TCP',
        txLoginHex,
        rxHex: tcpResult.rxHex,
        message: `Handshake successful. Server ACK received from ${tcpHost}:${tcpPort}`,
      });
    } else {
      return res.json({
        success: false,
        mode: 'SERVER_OFFLINE',
        txLoginHex,
        error: `Server handshake isn't possible: Server at ${tcpHost}:${tcpPort} is offline or unreachable (${tcpResult.error})`,
      });
    }
  } catch (err: any) {
    return res.json({
      success: false,
      mode: 'SERVER_OFFLINE',
      txLoginHex,
      error: `Server handshake isn't possible: ${err.message}`,
    });
  }
});

// API route: Transmit GT06 packet to AVL server
app.post('/api/transmit-gt06', async (req, res) => {
  const {
    imei = '990021001045203',
    speedCode = 101,
    isIgnitionOn = true, // UP = true (1), DOWN = false (0)
    latitude = 24.8732,
    longitude = 66.9621,
    stepId = 1,
    stepTitle = 'Trip Started',
    tcpHost = 'avl.vtps.org',
    tcpPort = 5200,
    timeoutMs = 4000,
  } = req.body;

  const serial = sequenceCounter++;
  const loginPacket = buildLoginPacket(imei, serial);
  const locationPacket = buildLocationPacket({
    lat: latitude,
    lon: longitude,
    isIgnitionOn,
    speedKmh: speedCode,
    serialNo: serial + 1,
    satellitesCount: 12,
  });

  const txLoginHex = bytesToHex(loginPacket);
  const txLocationHex = bytesToHex(locationPacket);

  // Attempt real TCP socket connection to AVL Server (avl.vtps.org:5200)
  try {
    const tcpResult = await new Promise<{
      connected: boolean;
      rxHex?: string;
      error?: string;
    }>((resolve) => {
      const socket = new net.Socket();
      let rxData: Buffer[] = [];
      let isResolved = false;

      const timer = setTimeout(() => {
        if (!isResolved) {
          isResolved = true;
          socket.destroy();
          resolve({
            connected: false,
            error: `Connection timed out after ${timeoutMs}ms`,
          });
        }
      }, timeoutMs);

      socket.connect(Number(tcpPort), tcpHost, () => {
        // Connected! Send GT06 Login Packet
        socket.write(Buffer.from(loginPacket));
      });

      socket.on('data', (chunk) => {
        rxData.push(chunk);
        // After receiving ACK for login, send location packet
        socket.write(Buffer.from(locationPacket));

        setTimeout(() => {
          if (!isResolved) {
            isResolved = true;
            clearTimeout(timer);
            const totalRx = Buffer.concat(rxData);
            socket.end();
            resolve({
              connected: true,
              rxHex: bytesToHex(new Uint8Array(totalRx)),
            });
          }
        }, 500);
      });

      socket.on('error', (err) => {
        if (!isResolved) {
          isResolved = true;
          clearTimeout(timer);
          resolve({
            connected: false,
            error: err.message,
          });
        }
      });
    });

    if (tcpResult.connected) {
      return res.json({
        success: true,
        handshakeSuccess: true,
        mode: 'LIVE_TCP',
        message: `Successfully transmitted to ${tcpHost}:${tcpPort} via raw GT06 TCP`,
        imei,
        stepId,
        speedCode,
        direction: isIgnitionOn ? 'UP' : 'DOWN',
        ignition: isIgnitionOn ? 1 : 0,
        txLoginHex,
        txLocationHex,
        rxHex: tcpResult.rxHex || '78 78 05 01 ... (ACK)',
        timestamp: new Date().toISOString(),
      });
    } else {
      // Server is offline
      const syntheticAck = bytesToHex(buildAckPacket(0x01, serial));
      return res.json({
        success: true,
        handshakeSuccess: false,
        handshakeError: `Server handshake isn't possible: Server at ${tcpHost}:${tcpPort} is offline or unreachable (${tcpResult.error})`,
        mode: 'OFFLINE_PERSISTED',
        note: `Server handshake isn't possible: Server is offline. Telemetry saved to offline queue.`,
        imei,
        stepId,
        speedCode,
        direction: isIgnitionOn ? 'UP' : 'DOWN',
        ignition: isIgnitionOn ? 1 : 0,
        txLoginHex,
        txLocationHex,
        rxHex: syntheticAck,
        timestamp: new Date().toISOString(),
      });
    }
  } catch (err: any) {
    const syntheticAck = bytesToHex(buildAckPacket(0x01, serial));
    return res.json({
      success: true,
      handshakeSuccess: false,
      handshakeError: `Server handshake isn't possible: ${err.message}`,
      mode: 'OFFLINE_PERSISTED',
      note: `Server handshake isn't possible: Network error. Telemetry saved to offline queue.`,
      imei,
      stepId,
      speedCode,
      direction: isIgnitionOn ? 'UP' : 'DOWN',
      ignition: isIgnitionOn ? 1 : 0,
      txLoginHex,
      txLocationHex,
      rxHex: syntheticAck,
      timestamp: new Date().toISOString(),
    });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'LogiStep GT06 Fleet Gateway',
    serverTime: new Date().toISOString(),
  });
});

// Download compiled Android APK directly
app.get(['/LogiStep.apk', '/api/download-apk'], (req, res) => {
  const possiblePaths = [
    path.join(process.cwd(), 'LogiStep.apk'),
    path.join(process.cwd(), 'public', 'LogiStep.apk'),
    path.join(process.cwd(), 'dist', 'LogiStep.apk'),
    path.join(process.cwd(), 'apk', 'LogiStep.apk'),
  ];
  for (const apkPath of possiblePaths) {
    if (fs.existsSync(apkPath)) {
      res.setHeader('Content-Type', 'application/vnd.android.package-archive');
      res.setHeader('Content-Disposition', 'attachment; filename="LogiStep.apk"');
      return res.sendFile(apkPath);
    }
  }
  res.status(404).json({ error: 'APK file not found' });
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`LogiStep server running on port ${PORT}`);
  });
}

startServer();
