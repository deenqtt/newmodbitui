import { prisma } from "@/lib/prisma";
import { connectMQTTAsync } from "@/lib/mqttClient";

/**
 * MQTT Listener untuk NodeTenantLocation
 * Mendengarkan semua topic dari NodeTenantLocation dan menyimpan payload ke database
 */
class NodeTenantLocationMqttListener {
  private client: any = null;
  private subscribedTopics = new Set<string>();
  private isConnected = false;

  /**
   * Mulai listener MQTT
   */
  async start() {
    try {
      console.log("[NodeTenantLocation MQTT Listener] Starting listener...");

      // Connect ke MQTT broker
      this.client = await connectMQTTAsync();

      // Subscribe ke topic-topic location
      await this.subscribeToLocationTopics();

      // Setup event listeners
      this.client.on("message", this.handleMessage.bind(this));
      this.client.on("connect", this.handleConnect.bind(this));
      this.client.on("disconnect", this.handleDisconnect.bind(this));
      this.client.on("error", this.handleError.bind(this));

      // Auto-reload subscription setiap 30 detik (untuk location baru)
      setInterval(() => {
        this.subscribeToLocationTopics();
      }, 30 * 1000);

      console.log("[NodeTenantLocation MQTT Listener] Listener started successfully");

    } catch (error) {
      console.error("[NodeTenantLocation MQTT Listener] Failed to start listener:", error);
    }
  }

  /**
   * Subscribe ke semua topic dari NodeTenantLocation yang aktif
   */
  private async subscribeToLocationTopics() {
    try {
      // Ambil semua topic dari location yang aktif dan memiliki topic
      const locations = await prisma.nodeTenantLocation.findMany({
        where: {
          topic: { not: null },
          isActive: true,
        },
        select: {
          id: true,
          topic: true,
          name: true,
        },
      });

      // Cek topic baru yang perlu disubscribe
      const currentTopics = new Set(locations.map(loc => loc.topic).filter((topic): topic is string => topic !== null));
      const topicsToSubscribe = Array.from(currentTopics).filter(topic => !this.subscribedTopics.has(topic));
      const topicsToUnsubscribe = Array.from(this.subscribedTopics).filter(topic => !currentTopics.has(topic));

      // Subscribe ke topic baru
      for (const topic of topicsToSubscribe) {
        if (this.client && this.client.connected) {
          this.client.subscribe(topic, { qos: 0 }, (err: any) => {
            if (!err) {
              this.subscribedTopics.add(topic);
              console.log(`[NodeTenantLocation MQTT] Subscribed to topic: ${topic}`);
            } else {
              console.error(`[NodeTenantLocation MQTT] Failed to subscribe to ${topic}:`, err);
            }
          });
        }
      }

      // Unsubscribe dari topic yang tidak lagi digunakan
      for (const topic of topicsToUnsubscribe) {
        if (this.client && this.client.connected) {
          this.client.unsubscribe(topic, (err: any) => {
            if (!err) {
              this.subscribedTopics.delete(topic);
              console.log(`[NodeTenantLocation MQTT] Unsubscribed from topic: ${topic}`);
            } else {
              console.error(`[NodeTenantLocation MQTT] Failed to unsubscribe from ${topic}:`, err);
            }
          });
        }
      }

    } catch (error) {
      console.error("[NodeTenantLocation MQTT] Error updating subscriptions:", error);
    }
  }

  /**
   * Handle MQTT message yang diterima
   */
  private async handleMessage(topic: string, payload: Buffer) {
    try {
      const messagePayload = payload.toString();

      // Cari location yang memiliki topic ini
      const location = await prisma.nodeTenantLocation.findFirst({
        where: {
          topic: topic,
          isActive: true,
        },
        select: {
          id: true,
          name: true,
          topic: true,
        },
      });

      if (!location) {
        console.log(`[NodeTenantLocation MQTT] Received message for unknown topic: ${topic}`);
        return;
      }

      // Parse payload (coba sebagai JSON)
      let jsonPayload: any;
      try {
        jsonPayload = JSON.parse(messagePayload);
      } catch {
        // Jika bukan JSON, buat object sederhana
        jsonPayload = { message: messagePayload };
      }

      // Simpan ke database
      const newPayload = await prisma.nodeLocationMqttPayload.create({
        data: {
          locationId: location.id,
          topic: topic,
          payload: jsonPayload,
        },
      });

      console.log(`[NodeTenantLocation MQTT] ✅ Saved payload for ${location.name} (${location.id}) - Topic: ${topic}`);

      // Log untuk debug (opsional, bisa dimatikan)
      console.log(`[NodeTenantLocation MQTT] Payload received:`, {
        location: location.name,
        topic: topic,
        timestamp: newPayload.receivedAt,
      });

    } catch (error) {
      console.error(`[NodeTenantLocation MQTT] Error handling message for topic ${topic}:`, error);
    }
  }

  /**
   * Handle koneksi MQTT berhasil
   */
  private handleConnect() {
    this.isConnected = true;
    console.log("[NodeTenantLocation MQTT Listener] Connected to MQTT broker");

    // Re-subscribe ke semua topic
    this.subscribeToLocationTopics();
  }

  /**
   * Handle disconnect MQTT
   */
  private handleDisconnect() {
    this.isConnected = false;
    console.log("[NodeTenantLocation MQTT Listener] Disconnected from MQTT broker");
  }

  /**
   * Handle error MQTT
   */
  private handleError(error: Error) {
    console.error("[NodeTenantLocation MQTT Listener] MQTT Error:", error);
  }

  /**
   * Stop listener
   */
  stop() {
    if (this.client) {
      // Unsubscribe dari semua topic
      Array.from(this.subscribedTopics).forEach(topic => {
        this.client.unsubscribe(topic);
      });

      this.client.end();
      this.subscribedTopics.clear();
      this.isConnected = false;

      console.log("[NodeTenantLocation MQTT Listener] Listener stopped");
    }
  }

  /**
   * Get status listener
   */
  getStatus() {
    return {
      isConnected: this.isConnected,
      subscribedTopicsCount: this.subscribedTopics.size,
      subscribedTopics: Array.from(this.subscribedTopics),
    };
  }
}

// Export singleton instance
export const nodeTenantLocationMqttListener = new NodeTenantLocationMqttListener();
