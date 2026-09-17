/**
 * Offline Telematics Store-and-Forward Engine
 * 
 * 3 Core Functional Jobs:
 * 1. FOTA / Static Configuration Lock (IMEI, Server Port, Protocol).
 * 2. Instant Packet Creation & Staging:
 *    - Captures GPS, speed code, ignition bit, IMEI, timestamp.
 *    - Generates 0x01 Login and 0x12 Location GT06 binary frames.
 *    - Saves packet into durable device memory buffer (localStorage).
 * 3. Network Opportunistic Synchronization:
 *    - When mobile cellular / Wi-Fi network is detected (even 18-20 days later after remote travel),
 *      transmits queued packets in FIFO chronological order to preserve exact event timeline on server!
 */

import { BufferedPacket } from '../types';
import { transmitGt06Packet } from './androidBridge';

const STORAGE_KEY = 'logistep_packet_queue';

export function loadPacketQueue(): BufferedPacket[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to load packet queue from storage:', e);
    return [];
  }
}

export function savePacketQueue(queue: BufferedPacket[]) {
  try {
    // Keep max 500 packets in device storage
    const trimmed = queue.slice(-500);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  } catch (e) {
    console.error('Failed to persist packet queue to storage:', e);
  }
}

export function enqueuePacket(packet: Omit<BufferedPacket, 'id' | 'status' | 'retryCount'>): BufferedPacket {
  const queue = loadPacketQueue();
  const newPacket: BufferedPacket = {
    ...packet,
    id: 'pkt-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5),
    status: 'PENDING',
    retryCount: 0,
  };
  queue.push(newPacket);
  savePacketQueue(queue);
  return newPacket;
}

export function getPendingPackets(): BufferedPacket[] {
  const queue = loadPacketQueue();
  return queue.filter((p) => p.status === 'PENDING');
}

export function getPendingCount(): number {
  return getPendingPackets().length;
}

export function markPacketSynced(id: string, rxHex?: string) {
  const queue = loadPacketQueue();
  const idx = queue.findIndex((p) => p.id === id);
  if (idx !== -1) {
    queue[idx].status = 'SYNCED';
    queue[idx].syncedAt = new Date().toLocaleDateString() + ' ' + new Date().toLocaleTimeString();
    if (rxHex) queue[idx].rxHex = rxHex;
    savePacketQueue(queue);
  }
}

export function markPacketFailed(id: string, error?: string) {
  const queue = loadPacketQueue();
  const idx = queue.findIndex((p) => p.id === id);
  if (idx !== -1) {
    queue[idx].retryCount = (queue[idx].retryCount || 0) + 1;
    if (error) queue[idx].error = error;
    savePacketQueue(queue);
  }
}

export function clearSyncedPackets() {
  const queue = loadPacketQueue();
  const pendingOnly = queue.filter((p) => p.status === 'PENDING');
  savePacketQueue(pendingOnly);
}

/**
 * Flush and synchronize all pending packets to server in sequential order
 */
export async function syncAllPendingPackets(params: {
  tcpHost: string;
  tcpPort: number;
  onPacketSuccess?: (packet: BufferedPacket, rxHex: string) => void;
  onPacketError?: (packet: BufferedPacket, err: string) => void;
}): Promise<{ total: number; synced: number; failed: number }> {
  const pending = getPendingPackets();
  if (pending.length === 0) {
    return { total: 0, synced: 0, failed: 0 };
  }

  let syncedCount = 0;
  let failedCount = 0;

  for (const packet of pending) {
    try {
      const res = await transmitGt06Packet({
        imei: packet.imei,
        speedCode: packet.speedCode,
        isIgnitionOn: packet.ignition === 1,
        latitude: packet.latitude,
        longitude: packet.longitude,
        stepId: packet.stepId,
        stepTitle: packet.title,
        tcpHost: params.tcpHost,
        tcpPort: params.tcpPort,
        timeoutMs: 3000,
      });

      if (res.success && res.mode !== 'OFFLINE_SAVED') {
        markPacketSynced(packet.id, res.rxHex);
        syncedCount++;
        params.onPacketSuccess?.(packet, res.rxHex);
      } else {
        markPacketFailed(packet.id, res.note || 'Offline');
        failedCount++;
        params.onPacketError?.(packet, res.note || 'Server unreachable');
      }
    } catch (e: any) {
      markPacketFailed(packet.id, e?.message || 'Network error');
      failedCount++;
      params.onPacketError?.(packet, e?.message || 'Transmission error');
    }
  }

  return { total: pending.length, synced: syncedCount, failed: failedCount };
}
