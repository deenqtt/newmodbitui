// File: lib/services/alarm-monitor.ts
// Deskripsi: Layanan ini FOKUS HANYA untuk memantau dan mencatat log alarm.

import { PrismaClient } from "@prisma/client";
import mqtt from "mqtt";
import {
  AlarmConfiguration,
  AlarmBitConfiguration,
  DeviceExternal,
  AlarmLogStatus,
} from "@prisma/client";

type FullAlarmConfig = AlarmConfiguration & {
  device: DeviceExternal;
  bits: AlarmBitConfiguration[];
};

class AlarmMonitorService {
  private prisma: PrismaClient;
  private mqttClient: mqtt.MqttClient | null = null;
  private alarmConfigs: Map<string, FullAlarmConfig[]> = new Map();
  private alarmStates: Map<string, { active: boolean | boolean[] }> = new Map();

  constructor() {
    this.prisma = new PrismaClient();
  }

  public async start() {
    console.log("✅ [ALARM SERVICE] Starting Alarm Monitor Service...");
    const topics = await this.loadAlarmConfigurations();
    this.connectToMqtt(topics);
  }

  private async loadAlarmConfigurations(): Promise<string[]> {
    console.log("[ALARM SERVICE] 1. Memuat konfigurasi alarm dari database...");
    const configsFromDb = await this.prisma.alarmConfiguration.findMany({
      include: { device: true, bits: true },
    });

    this.alarmConfigs.clear();
    const topics = new Set<string>();

    for (const config of configsFromDb) {
      if (config.device?.topic) {
        const topic = config.device.topic;
        topics.add(topic);
        if (!this.alarmConfigs.has(topic)) {
          this.alarmConfigs.set(topic, []);
        }
        this.alarmConfigs.get(topic)?.push(config as FullAlarmConfig);
      }
    }

    console.log(
      `[ALARM SERVICE] 2. Selesai memuat ${configsFromDb.length} aturan alarm untuk ${topics.size} topik.`
    );
    return Array.from(topics);
  }

  private connectToMqtt(topics: string[]) {
    const brokerUrl = `mqtt://${process.env.MQTT_BROKER_ADDRESS}:${process.env.MQTT_BROKER_PORT}`;
    this.mqttClient = mqtt.connect(brokerUrl);

    this.mqttClient.on("connect", () => {
      console.log(
        `[ALARM SERVICE] 3. Terhubung ke Broker MQTT di ${brokerUrl}`
      );
      if (topics.length > 0) {
        this.mqttClient?.subscribe(topics, (err) => {
          if (!err) {
            console.log(
              `[ALARM SERVICE] 4. Berhasil subscribe ke topik: [${topics.join(
                ", "
              )}]`
            );
          } else {
            console.error("[ALARM SERVICE] Gagal subscribe ke topik:", err);
          }
        });
      }
    });

    this.mqttClient.on("message", (topic, payload) => {
      this.handleMessage(topic, payload.toString());
    });

    this.mqttClient.on("error", (error) =>
      console.error("[ALARM SERVICE] MQTT Error:", error)
    );
  }

  private handleMessage(topic: string, payloadStr: string) {
    console.log(`\n[ALARM SERVICE] 5. Pesan diterima di topik [${topic}]`);
    console.log(`   L-- Payload mentah: ${payloadStr}`);

    const configs = this.alarmConfigs.get(topic);
    if (!configs) {
      console.warn(
        `   L-- Peringatan: Tidak ada konfigurasi alarm untuk topik ini.`
      );
      return;
    }

    try {
      const outerPayload = JSON.parse(payloadStr);
      const payload =
        typeof outerPayload.value === "string"
          ? JSON.parse(outerPayload.value)
          : outerPayload.value || outerPayload;

      console.log(`   L-- Payload setelah di-parse:`, payload);

      for (const config of configs) {
        this.checkAlarm(config, payload);
      }
    } catch (error) {
      console.error(
        `[ALARM SERVICE] Error memproses pesan di topik ${topic}:`,
        error
      );
    }
  }

  private checkAlarm(config: FullAlarmConfig, payload: any) {
    console.log(`   L-- 6. Mengecek aturan: "${config.customName}"`);
    const value = payload[config.key];
    if (value === undefined) {
      console.warn(
        `       L-- Peringatan: Key "${config.key}" tidak ditemukan di payload.`
      );
      return;
    }
    console.log(`       L-- Nilai dari key "${config.key}" adalah: ${value}`);

    switch (config.keyType) {
      case "THRESHOLD":
        this.checkThresholdAlarm(config, value);
        break;
      case "DIRECT":
        this.checkDirectAlarm(config, value);
        break;
      case "BIT_VALUE":
        this.checkBitValueAlarm(config, value);
        break;
    }
  }

  private checkThresholdAlarm(config: FullAlarmConfig, value: number) {
    const prevState = this.alarmStates.get(config.id)?.active as
      | boolean
      | undefined;
    let isActive = false;
    if (config.maxOnly) {
      isActive = value > (config.maxValue ?? Infinity);
      console.log(
        `       L-- [THRESHOLD] Pengecekan MaxOnly: (${value} > ${config.maxValue}) -> ${isActive}`
      );
    } else {
      isActive =
        value < (config.minValue ?? -Infinity) ||
        value > (config.maxValue ?? Infinity);
      console.log(
        `       L-- [THRESHOLD] Pengecekan Min/Max: (${value} < ${config.minValue} || ${value} > ${config.maxValue}) -> ${isActive}`
      );
    }
    if (isActive !== prevState) {
      console.log(
        `       L-- STATUS BERUBAH! Sebelumnya: ${prevState}, Sekarang: ${isActive}`
      );
      this.alarmStates.set(config.id, { active: isActive });
      this.logAlarmEvent(config, isActive, value);
    }
  }

  private checkDirectAlarm(config: FullAlarmConfig, value: boolean | number) {
    const prevState = this.alarmStates.get(config.id)?.active as
      | boolean
      | undefined;
    const isActive = value === true || value === 1;
    console.log(
      `       L-- [DIRECT] Pengecekan: (${value} === true || ${value} === 1) -> ${isActive}`
    );
    if (isActive !== prevState) {
      console.log(
        `       L-- STATUS BERUBAH! Sebelumnya: ${prevState}, Sekarang: ${isActive}`
      );
      this.alarmStates.set(config.id, { active: isActive });
      this.logAlarmEvent(config, isActive, value);
    }
  }

  private checkBitValueAlarm(config: FullAlarmConfig, value: number) {
    if (!Number.isInteger(value)) return;
    const prevState =
      (this.alarmStates.get(config.id)?.active as boolean[] | undefined) || [];
    const newActiveState: boolean[] = [];
    console.log(`       L-- [BIT_VALUE] Mengecek nilai integer: ${value}`);
    for (const bitConfig of config.bits) {
      const bitPosition = bitConfig.bitPosition;
      const isBitActive = ((value >> bitPosition) & 1) === 1;
      newActiveState[bitPosition] = isBitActive;
      console.log(
        `           L-- Bit Posisi ${bitPosition} ("${bitConfig.customName}"): Status -> ${isBitActive}`
      );
      if (isBitActive !== prevState[bitPosition]) {
        console.log(
          `           L-- STATUS BIT BERUBAH! Sebelumnya: ${prevState[bitPosition]}, Sekarang: ${isBitActive}`
        );
        this.logAlarmEvent(config, isBitActive, value, bitConfig);
      }
    }
    this.alarmStates.set(config.id, { active: newActiveState });
  }

  private async logAlarmEvent(
    config: FullAlarmConfig,
    isActive: boolean,
    value: any,
    bitConfig?: AlarmBitConfiguration
  ) {
    const alarmName = bitConfig ? bitConfig.customName : config.customName;
    const status = isActive ? AlarmLogStatus.ACTIVE : AlarmLogStatus.CLEARED;
    console.log(
      `[ALARM EVENT] 7. Mencatat ke DB: Alarm: "${alarmName}", Status: ${status}, Value: ${value}`
    );
    try {
      if (isActive) {
        await this.prisma.alarmLog.create({
          data: {
            alarmConfigId: config.id,
            status: AlarmLogStatus.ACTIVE,
            triggeringValue: String(value),
          },
        });
      } else {
        const lastActiveLog = await this.prisma.alarmLog.findFirst({
          where: {
            alarmConfigId: config.id,
            status: AlarmLogStatus.ACTIVE,
            AND: { alarmConfig: { customName: alarmName } },
          },
          orderBy: { timestamp: "desc" },
        });
        if (lastActiveLog) {
          await this.prisma.alarmLog.update({
            where: { id: lastActiveLog.id },
            data: { status: AlarmLogStatus.CLEARED, clearedAt: new Date() },
          });
        }
      }
      console.log(`   L-- Berhasil mencatat ke database.`);
    } catch (error) {
      console.error(
        `[ALARM EVENT] Gagal mencatat log untuk "${alarmName}":`,
        error
      );
    }
  }
}

let serviceInstance: AlarmMonitorService | null = null;
export function getAlarmMonitorService() {
  if (!serviceInstance) {
    serviceInstance = new AlarmMonitorService();
    serviceInstance.start();
  }
  return serviceInstance;
}
