import { prisma } from "@/lib/prisma";

/**
 * Cek apakah field topic pada NodeTenantLocation berisi payload MQTT
 * Fungsi ini memeriksa apakah ada payload MQTT yang diterima di tabel NodeLocationMqttPayload
 *
 * @param locationId - ID dari NodeTenantLocation
 * @returns Promise<boolean> - true jika ada payload MQTT, false jika tidak ada
 */
export async function checkNodeTenantLocationTopicPayload(locationId: string): Promise<boolean> {
  try {
    // Cari payload MQTT terakhir untuk location dengan ID tertentu
    const latestPayload = await prisma.nodeLocationMqttPayload.findFirst({
      where: {
        locationId: locationId,
      },
      orderBy: {
        receivedAt: 'desc', // Ambil yang terakhir
      },
      select: {
        id: true,
        receivedAt: true,
      },
    });

    // Return true jika ada payload record
    return latestPayload !== null;

  } catch (error) {
    console.error(`Error checking MQTT payload for location ${locationId}:`, error);
    return false;
  }
}

/**
 * Cek multiple locations sekaligus apakah topic-nya berisi payload MQTT
 *
 * @param locationIds - Array ID dari NodeTenantLocation
 * @returns Promise<Record<string, boolean>> - Objek dengan locationId sebagai key dan boolean sebagai value
 */
export async function checkMultipleNodeTenantLocationTopicPayloads(locationIds: string[]): Promise<Record<string, boolean>> {
  const results: Record<string, boolean> = {};

  try {
    // Cek masing-masing location ada payload atau tidak secara individual
    for (const locationId of locationIds) {
      try {
        const hasPayload = await checkNodeTenantLocationTopicPayload(locationId);
        results[locationId] = hasPayload;
      } catch (error) {
        console.error(`Error checking payload for location ${locationId}:`, error);
        results[locationId] = false;
      }
    }

  } catch (error) {
    console.error('Error checking multiple MQTT payloads:', error);
    // Set semua ke false jika ada error
    locationIds.forEach(id => {
      results[id] = false;
    });
  }

  return results;
}

/**
 * Get detail informasi payload MQTT untuk topic dari NodeTenantLocation
 *
 * @param locationId - ID dari NodeTenantLocation
 * @returns Promise<{
 *   hasPayload: boolean,
 *   topic: string | null,
 *   deviceCount: number,
 *   lastUpdate?: Date
 * }> - Detail informasi payload
 */
export async function getNodeTenantLocationTopicPayloadInfo(locationId: string): Promise<{
  hasPayload: boolean;
  topic: string | null;
  deviceCount: number;
  lastUpdate?: Date;
}> {
  try {
    // Ambil location info
    const location = await prisma.nodeTenantLocation.findUnique({
      where: { id: locationId },
      select: { topic: true },
    });

    if (!location) {
      return {
        hasPayload: false,
        topic: null,
        deviceCount: 0,
      };
    }

    // Ambil payload terakhir
    const latestPayload = await prisma.nodeLocationMqttPayload.findFirst({
      where: {
        locationId: locationId,
      },
      orderBy: {
        receivedAt: 'desc',
      },
      select: {
        receivedAt: true,
      },
    });

    return {
      hasPayload: latestPayload !== null,
      topic: location.topic,
      deviceCount: latestPayload ? 1 : 0, // Simplified - 1 jika ada payload, 0 jika tidak
      lastUpdate: latestPayload?.receivedAt,
    };

  } catch (error) {
    console.error(`Error getting payload info for location ${locationId}:`, error);
    return {
      hasPayload: false,
      topic: null,
      deviceCount: 0,
    };
  }
}

/**
 * Update status NodeTenantLocation berdasarkan payload MQTT
 * Jika ada payload dalam 1 menit terakhir -> status = true
 * Jika tidak ada payload selama 1 menit atau lebih -> status = false
 *
 * @param locationId - ID lokasi yang akan diupdate
 * @returns Promise<{ updated: boolean, newStatus: boolean, reason: string }>
 */
export async function updateNodeTenantLocationStatusBasedOnPayload(
  locationId: string
): Promise<{ updated: boolean; newStatus: boolean; reason: string }> {
  try {
    // Ambil data lokasi dengan info payload
    const payloadInfo = await getNodeTenantLocationTopicPayloadInfo(locationId);

    // Ambil lokasi saat ini
    const currentLocation = await prisma.nodeTenantLocation.findUnique({
      where: { id: locationId },
      select: { id: true, status: true, topic: true },
    });

    if (!currentLocation) {
      return {
        updated: false,
        newStatus: false,
        reason: 'Location not found',
      };
    }

    // Jika tidak ada topic, status selalu false
    if (!currentLocation.topic) {
      if (currentLocation.status !== false) {
        await prisma.nodeTenantLocation.update({
          where: { id: locationId },
          data: { status: false },
        });
        return {
          updated: true,
          newStatus: false,
          reason: 'No topic configured, status set to false',
        };
      }
      return {
        updated: false,
        newStatus: false,
        reason: 'No topic configured, status already false',
      };
    }

    // Cek apakah ada payload dalam 1 menit terakhir
    const now = new Date();
    const oneMinuteAgo = new Date(now.getTime() - 60 * 1000); // 1 menit yang lalu
    const hasRecentPayload = payloadInfo.hasPayload &&
                            payloadInfo.lastUpdate &&
                            payloadInfo.lastUpdate > oneMinuteAgo;

    if (hasRecentPayload) {
      // Ada payload dalam 1 menit terakhir - status harus true
      if (currentLocation.status !== true) {
        await prisma.nodeTenantLocation.update({
          where: { id: locationId },
          data: { status: true },
        });
        return {
          updated: true,
          newStatus: true,
          reason: 'Recent MQTT payload detected (within 1 min), status set to true',
        };
      } else {
        return {
          updated: false,
          newStatus: true,
          reason: 'Recent MQTT payload detected, status already true',
        };
      }
    } else {
      // Tidak ada atau tidak ada yang recent (1+ menit) - status harus false
      if (currentLocation.status !== false) {
        await prisma.nodeTenantLocation.update({
          where: { id: locationId },
          data: { status: false },
        });
        return {
          updated: true,
          newStatus: false,
          reason: payloadInfo.hasPayload ?
            'No recent MQTT payload (>1 min), status set to false' :
            'No MQTT payload ever received, status set to false',
        };
      } else {
        return {
          updated: false,
          newStatus: false,
          reason: 'No recent payload, status already false',
        };
      }
    }

  } catch (error) {
    console.error(`Error updating status for location ${locationId}:`, error);
    return {
      updated: false,
      newStatus: false,
      reason: `Error: ${error}`,
    };
  }
}

/**
 * Otomatis update status semua NodeTenantLocation berdasarkan payload MQTT
 * Fungsi ini dipanggil secara berkala (misalnya setiap menit via cron)
 *
 * @returns Promise<{
 *   totalChecked: number,
 *   updatedToTrue: string[],
 *   updatedToFalse: string[],
 *   errors: string[]
 * }>
 */
export async function autoUpdateAllNodeTenantLocationStatus(): Promise<{
  totalChecked: number;
  updatedToTrue: string[];
  updatedToFalse: string[];
  errors: string[];
}> {
  const result = {
    totalChecked: 0,
    updatedToTrue: [] as string[],
    updatedToFalse: [] as string[],
    errors: [] as string[],
  };

  try {
    // Ambil semua lokasi yang memiliki topic dan aktif
    const locations = await prisma.nodeTenantLocation.findMany({
      where: {
        topic: { not: null },
        isActive: true,
      },
      select: { id: true, name: true, topic: true, status: true },
    });

    result.totalChecked = locations.length;

    console.log(`[${new Date().toISOString()}] Starting auto-update for ${locations.length} locations...`);

    // Proses setiap lokasi
    for (const location of locations) {
      try {
        const updateResult = await updateNodeTenantLocationStatusBasedOnPayload(location.id);

        if (updateResult.updated) {
          const logMessage = `${location.name} (${location.id}): ${updateResult.reason}`;

          if (updateResult.newStatus) {
            result.updatedToTrue.push(logMessage);
            console.log(`[${new Date().toISOString()}] ✅ Status TRUE: ${logMessage}`);
          } else {
            result.updatedToFalse.push(logMessage);
            console.log(`[${new Date().toISOString()}] ❌ Status FALSE: ${logMessage}`);
          }
        }

      } catch (error) {
        const errorMsg = `Failed to update location ${location.name} (${location.id}): ${error}`;
        result.errors.push(errorMsg);
        console.error(`[${new Date().toISOString()}] Error: ${errorMsg}`);
      }
    }

    const summary = `Checked: ${result.totalChecked}, TRUE: ${result.updatedToTrue.length}, FALSE: ${result.updatedToFalse.length}, Errors: ${result.errors.length}`;
    console.log(`[${new Date().toISOString()}] Auto-update completed. ${summary}`);

  } catch (error) {
    console.error(`[${new Date().toISOString()}] Critical error in autoUpdateAllNodeTenantLocationStatus:`, error);
    result.errors.push(`Critical error: ${error}`);
  }

  return result;
}

/**
 * Fungsi scheduler untuk monitoring otomatis
 * Fungsi ini akan berjalan setiap interval tertentu
 */
class NodeLocationStatusScheduler {
  private intervalId: NodeJS.Timeout | null = null;
  private isRunning = false;
  private intervalMinutes = 1; // Default 1 menit

  /**
   * Mulai monitoring otomatis
   * @param intervalMinutes Interval dalam menit (default: 1)
   */
  start(intervalMinutes: number = 1) {
    if (this.isRunning) {
      console.log('Scheduler already running');
      return;
    }

    this.intervalMinutes = intervalMinutes;
    this.isRunning = true;

    console.log(`[${new Date().toISOString()}] Starting NodeLocationStatusScheduler with ${intervalMinutes} minute intervals`);

    // Jalankan sekali langsung saat start
    this.runUpdate();

    // Set interval
    this.intervalId = setInterval(() => {
      this.runUpdate();
    }, intervalMinutes * 60 * 1000);
  }

  /**
   * Stop monitoring otomatis
   */
  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isRunning = false;
    console.log(`[${new Date().toISOString()}] NodeLocationStatusScheduler stopped`);
  }

  /**
   * Jalankan update sekali (Simplified logging)
   */
  async runUpdate() {
    try {
      if (!this.isRunning) return;

      const result = await autoUpdateAllNodeTenantLocationStatus();
      schedulerStats.totalUpdates++;
      schedulerStats.trueCount += result.updatedToTrue.length;
      schedulerStats.falseCount += result.updatedToFalse.length;
      schedulerStats.errorCount += result.errors.length;

      // Log each status change only if there are changes (reduced verbosity)
      if (result.updatedToTrue.length > 0) {
        result.updatedToTrue.forEach(msg => {
          console.log(`📍 [LOCATION] Status TRUE: ${msg.split(':')[0]}`);
        });
      }

      if (result.updatedToFalse.length > 0) {
        result.updatedToFalse.forEach(msg => {
          console.log(`📍 [LOCATION] Status FALSE: ${msg.split(':')[0]}`);
        });
      }

      // Periodic summary every 10 minutes instead of every minute
      const now = Date.now();
      if (now - lastSchedulerSummary > 10 * 60 * 1000) { // 10 minutes
        console.log(`📈 [SCHEDULER] ${schedulerStats.totalUpdates} updates - TRUE: ${schedulerStats.trueCount}, FALSE: ${schedulerStats.falseCount}, ERRORS: ${schedulerStats.errorCount}`);

        // Reset stats
        schedulerStats = { totalUpdates: 0, trueCount: 0, falseCount: 0, errorCount: 0 };
        lastSchedulerSummary = now;
      }

    } catch (error) {
      console.error(`🚨 [SCHEDULER] Critical error:`, error);
    }
  }

  /**
   * Get status scheduler
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      intervalMinutes: this.intervalMinutes,
      startedAt: this.isRunning ? (this as any).startTime : null,
    };
  }
}

// Export singleton instance
export const nodeLocationStatusScheduler = new NodeLocationStatusScheduler();

let lastSchedulerSummary = Date.now();
let schedulerStats = { totalUpdates: 0, trueCount: 0, falseCount: 0, errorCount: 0 };
