// File: /lib/services/zkteco-service.ts
import {
  PrismaClient,
  ZkTecoDevice,
  ZkTecoDeviceStatus,
  ZkTecoUser,
} from "@prisma/client";
import { Prisma } from "@prisma/client";
import mqtt from "mqtt";

class ZkTecoService {
  private prisma: PrismaClient;
  private mqttClient: mqtt.MqttClient | null = null;
  private activeDevices: ZkTecoDevice[] = [];
  private heartbeatTimeouts: Map<string, NodeJS.Timeout> = new Map();

  // --- BARU: Properti untuk menangani koneksi async ---
  private mqttReadyPromise: Promise<void>;
  private resolveMqttReady!: () => void; // Akan di-init di constructor

  constructor() {
    this.prisma = new PrismaClient();
    // --- BARU: Inisialisasi Promise di constructor ---
    this.mqttReadyPromise = new Promise((resolve) => {
      this.resolveMqttReady = resolve;
    });
  }

  public async start() {
    console.log("✅ [ZKTECO SERVICE] Starting ZKTeco Service...");
    this.connectToMqtt();
    await this.refreshConfigurations();

    if ((global as any).zkTecoInterval) {
      clearInterval((global as any).zkTecoInterval);
    }
    (global as any).zkTecoInterval = setInterval(
      () => this.refreshConfigurations(),
      60 * 1000
    );
  }

  private async refreshConfigurations() {
    console.log("[ZKTECO SERVICE] Refreshing ZKTeco device configurations...");
    this.activeDevices = await this.prisma.zkTecoDevice.findMany();
    console.log(
      `[ZKTECO SERVICE] Found ${this.activeDevices.length} active devices.`
    );

    const topicsToSubscribe = new Set<string>();
    for (const device of this.activeDevices) {
      if (device.topicIdentifier) {
        const deviceTopicKey = device.topicIdentifier.toLowerCase();
        topicsToSubscribe.add(`acs_${deviceTopicKey}_status`);
        topicsToSubscribe.add(`acs_${deviceTopicKey}_attendance`);
      }
    }

    if (this.mqttClient?.connected && topicsToSubscribe.size > 0) {
      console.log(
        `[ZKTECO SERVICE] Subscribing to dynamic topics:`,
        Array.from(topicsToSubscribe)
      );
      this.mqttClient.subscribe(Array.from(topicsToSubscribe));
    }
  }

  private connectToMqtt() {
    if ((global as any).zkTecoMqttClient) {
      (global as any).zkTecoMqttClient.end(true);
    }
    const brokerHost = process.env.NEXT_PUBLIC_MQTT_HOST_ZKTECO || "localhost";
    const brokerPort = 1883;
    const brokerUrl = `mqtt://${brokerHost}:${brokerPort}`;
    const options = {
      protocolVersion: 4,
      clientId: `zkteco-service-${Math.random().toString(16).slice(2, 10)}`,
    };
    this.mqttClient = mqtt.connect(brokerUrl, options);
    (global as any).zkTecoMqttClient = this.mqttClient;

    this.mqttClient.on("connect", () => {
      console.log(`[ZKTECO SERVICE] Terhubung ke Broker MQTT di ${brokerUrl}`);
      // --- BARU: Penuhi "janji" bahwa koneksi sudah siap ---
      this.resolveMqttReady();
      this.refreshConfigurations();
    });
    this.mqttClient.on("message", (topic, payload) =>
      this.handleMqttMessage(topic, payload.toString())
    );
    this.mqttClient.on("error", (error) => {
      console.error("[ZKTECO SERVICE] MQTT Error:", error);
    });
    this.mqttClient.on("close", () => {
      console.warn("[ZKTECO SERVICE] MQTT connection closed.");
    });
    this.mqttClient.on("offline", () => {
      console.warn("[ZKTECO SERVICE] MQTT client went offline.");
    });
  }

  private async handleMqttMessage(topic: string, payloadStr: string) {
    console.log(`[ZKTECO SERVICE] Message on ${topic}: ${payloadStr}`);

    const topicParts = topic.split("_");
    if (topicParts.length < 2) return;
    const topicIdentifierFromMqtt = topicParts[1];

    const device = this.activeDevices.find(
      (d) => d.topicIdentifier.toLowerCase() === topicIdentifierFromMqtt
    );
    if (!device) {
      console.warn(
        `[ZKTECO SERVICE] Received message for unknown device topic '${topicIdentifierFromMqtt}'.`
      );
      return;
    }

    if (this.heartbeatTimeouts.has(device.id)) {
      clearTimeout(this.heartbeatTimeouts.get(device.id)!);
    }
    if (device.status !== "CONNECTED") {
      await this.prisma.zkTecoDevice.update({
        where: { id: device.id },
        data: { status: "CONNECTED" },
      });
      device.status = "CONNECTED";
      console.log(
        `[ZKTECO SERVICE] Heartbeat received. Status for ${device.name} updated to CONNECTED.`
      );
    }
    const timeout = setTimeout(async () => {
      console.log(
        `[ZKTECO SERVICE] No heartbeat from ${device.name} for 30s. Setting status to DISCONNECTED.`
      );
      await this.prisma.zkTecoDevice.update({
        where: { id: device.id },
        data: { status: "DISCONNECTED" },
      });
      this.heartbeatTimeouts.delete(device.id);
    }, 30000);
    this.heartbeatTimeouts.set(device.id, timeout);

    try {
      const parsed = JSON.parse(payloadStr);
      const { Mode, Status, Data } = parsed;

      // --- LOGIKA SINKRONISASI DATA PENGGUNA ---
      if (Mode === "create_user" && Status === "success") {
        await this.prisma.zkTecoUser.upsert({
          where: {
            zkTecoDeviceId_uid: { zkTecoDeviceId: device.id, uid: Data.UID },
          },
          // --- MODIFIKASI: Menggunakan bracket untuk handle spasi ---
          update: { name: Data["user_name "], password: Data.user_pass },
          create: {
            uid: Data.UID,
            name: Data["user_name "],
            password: Data.user_pass,
            zkTecoDeviceId: device.id,
          },
        });
        console.log(
          `[ZKTECO SERVICE] Synced: Upserted user UID ${Data.UID} for ${device.name}`
        );
      } else if (Mode === "delete_user" && Status === "success") {
        await this.prisma.zkTecoUser.deleteMany({
          where: { uid: Data.UID, zkTecoDeviceId: device.id },
        });
        console.log(
          `[ZKTECO SERVICE] Synced: Deleted user UID ${Data.UID} from ${device.name}`
        );
      } else if (Mode === "register_card" && Status === "success") {
        await this.prisma.zkTecoUser.updateMany({
          where: { uid: Data.uid, zkTecoDeviceId: device.id },
          data: { card: String(Data.card) },
        });
        console.log(
          `[ZKTECO SERVICE] Synced: Registered card for UID ${Data.uid} on ${device.name}`
        );
      } else if (Mode === "delete_card" && Status === "success") {
        await this.prisma.zkTecoUser.updateMany({
          where: { uid: Data.uid, zkTecoDeviceId: device.id },
          data: { card: null },
        });
        console.log(
          `[ZKTECO SERVICE] Synced: Deleted card for UID ${Data.uid} on ${device.name}`
        );
      } else if (Mode === "register_fp" && Status === "success") {
        const user = await this.prisma.zkTecoUser.findUnique({
          where: {
            zkTecoDeviceId_uid: { zkTecoDeviceId: device.id, uid: Data.uid },
          },
        });
        if (user) {
          const existingFingers = (user.fingerprints as Prisma.JsonArray) || [];
          const newFinger = {
            fid: Data.fid,
            size: Data.size,
            template: Data.template,
          };
          const updatedFingers = existingFingers.filter(
            (f: any) => f.fid !== Data.fid
          );
          updatedFingers.push(newFinger);

          await this.prisma.zkTecoUser.update({
            where: { id: user.id },
            data: { fingerprints: updatedFingers },
          });
          console.log(
            `[ZKTECO SERVICE] Synced: Registered fingerprint FID ${Data.fid} for UID ${Data.uid} on ${device.name}`
          );
        }
      } else if (Mode === "delete_fp" && Status === "success") {
        const user = await this.prisma.zkTecoUser.findUnique({
          where: {
            zkTecoDeviceId_uid: { zkTecoDeviceId: device.id, uid: Data.uid },
          },
        });
        if (user && user.fingerprints) {
          const existingFingers = (user.fingerprints as Prisma.JsonArray) || [];
          const updatedFingers = existingFingers.filter(
            (f: any) => f.fid !== Data.fid
          );

          await this.prisma.zkTecoUser.update({
            where: { id: user.id },
            data: { fingerprints: updatedFingers },
          });
          console.log(
            `[ZKTECO SERVICE] Synced: Deleted fingerprint FID ${Data.fid} for UID ${Data.uid} on ${device.name}`
          );
        }
      } else if (Status && Status.toLowerCase().includes("error")) {
        console.error(
          `[ZKTECO SERVICE] Device responded with error for Mode '${Mode}': ${Status}. Data:`,
          Data
        );
      }
    } catch (error) {
      console.error(
        `[ZKTECO SERVICE] Failed to parse or process MQTT payload: ${payloadStr}`,
        error
      );
    }
  }

  // --- MODIFIKASI: Fungsi ini sekarang async dan menunggu koneksi ---
  public async sendCommand(deviceName: string, command: string) {
    // --- BARU: Menunggu promise koneksi selesai ---
    await this.mqttReadyPromise;

    const device = this.activeDevices.find((d) => d.name === deviceName);
    if (!device || !device.topicIdentifier) {
      console.error(
        `[ZKTECO SERVICE] Device '${deviceName}' not found or missing topicIdentifier. Active devices:`,
        this.activeDevices.map((d) => d.name)
      );
      return;
    }

    const deviceTopicKey = device.topicIdentifier.toLowerCase();
    const topic = `acs_${deviceTopicKey}_command`;
    console.log(`[ZKTECO SERVICE] PUBLISHING to ${topic}: ${command}`);
    try {
      this.mqttClient!.publish(topic, command, (err) => {
        if (err) {
          console.error(`[ZKTECO SERVICE] Error publishing to ${topic}:`, err);
        } else {
          console.log(
            `[ZKTECO SERVICE] Successfully published command to ${topic}.`
          );
        }
      });
    } catch (e) {
      console.error(`[ZKTECO SERVICE] Exception during MQTT publish:`, e);
    }
  }
}

// --- Singleton Pattern (Tidak ada perubahan) ---
const zkTecoServiceInstance = new ZkTecoService();
let isZkTecoServiceStarted = false;
export const getZkTecoService = () => {
  if (!isZkTecoServiceStarted) {
    zkTecoServiceInstance.start();
    isZkTecoServiceStarted = true;
  }
  return zkTecoServiceInstance;
};
export { zkTecoServiceInstance };
