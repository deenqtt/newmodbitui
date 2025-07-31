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
  private subscribedTopics: Set<string> = new Set();

  constructor() {
    this.prisma = new PrismaClient();
  }

  public async start() {
    this.connectToMqtt();
    await this.refreshConfigurations();

    if ((global as any).alarmMonitorInterval) {
      clearInterval((global as any).alarmMonitorInterval);
    }
    (global as any).alarmMonitorInterval = setInterval(
      () => this.refreshConfigurations(),
      15 * 1000
    );
  }

  public async refreshConfigurations() {
    const configsFromDb = await this.prisma.alarmConfiguration.findMany({
      include: { device: true, bits: true },
    });

    const newAlarmConfigs = new Map<string, FullAlarmConfig[]>();
    const newTopics = new Set<string>();

    for (const config of configsFromDb) {
      if (config.device?.topic) {
        const topic = config.device.topic;
        newTopics.add(topic);
        if (!newAlarmConfigs.has(topic)) {
          newAlarmConfigs.set(topic, []);
        }
        newAlarmConfigs.get(topic)?.push(config as FullAlarmConfig);
      }
    }

    this.alarmConfigs = newAlarmConfigs;
    console.log(
      `[ALARM SERVICE] Load complete: ${configsFromDb.length} rules for ${newTopics.size} topics.`
    );

    if (this.mqttClient?.connected) {
      const topicsToUnsubscribe = [...this.subscribedTopics].filter(
        (t) => !newTopics.has(t)
      );
      const topicsToSubscribe = [...newTopics].filter(
        (t) => !this.subscribedTopics.has(t)
      );

      if (topicsToUnsubscribe.length > 0) {
        this.mqttClient.unsubscribe(topicsToUnsubscribe, (err) => {
          if (!err) {
            console.log(
              `[ALARM SERVICE] Unsubscribed from old topics: [${topicsToUnsubscribe.join(
                ", "
              )}]`
            );
          }
        });
      }

      if (topicsToSubscribe.length > 0) {
        this.mqttClient.subscribe(topicsToSubscribe, (err) => {
          if (!err) {
            console.log(
              `[ALARM SERVICE] Subscribed to new topics: [${topicsToSubscribe.join(
                ", "
              )}]`
            );
          }
        });
      }
    }

    this.subscribedTopics = newTopics;
  }

  private connectToMqtt() {
    if ((global as any).mqttClient) {
      (global as any).mqttClient.end(true);
    }

    const brokerHost = process.env.NEXT_PUBLIC_MQTT_HOST || "localhost";
    const brokerPort = 1883;
    const brokerUrl = `mqtt://${brokerHost}:${brokerPort}`;

    const options = {
      protocolVersion: 4,
      clientId: `alarm-monitor-service-${Math.random()
        .toString(16)
        .slice(2, 10)}`,
    };

    this.mqttClient = mqtt.connect(brokerUrl, options);

    (global as any).mqttClient = this.mqttClient;

    this.mqttClient.on("connect", () => {
      if (this.subscribedTopics.size > 0) {
        this.mqttClient?.subscribe(Array.from(this.subscribedTopics));
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
    const configs = this.alarmConfigs.get(topic);
    if (!configs) {
      return;
    }

    try {
      const outerPayload = JSON.parse(payloadStr);
      const payload =
        typeof outerPayload.value === "string"
          ? JSON.parse(outerPayload.value)
          : outerPayload.value || outerPayload;

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
    const value = payload[config.key];
    if (value === undefined) {
      console.warn(
        `       L-- Peringatan: Key "${config.key}" tidak ditemukan di payload.`
      );
      return;
    }

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
    } else {
      isActive =
        value < (config.minValue ?? -Infinity) ||
        value > (config.maxValue ?? Infinity);
    }

    this.alarmStates.set(config.id, { active: isActive });

    if (isActive !== prevState) {
      if (isActive) {
        this.logAlarmEvent(config, true, value);
      } else if (prevState === true) {
        this.logAlarmEvent(config, false, value);
      }
    }
  }

  private checkDirectAlarm(config: FullAlarmConfig, value: boolean | number) {
    const prevState = this.alarmStates.get(config.id)?.active as
      | boolean
      | undefined;
    const isActive = value === true || value === 1;

    this.alarmStates.set(config.id, { active: isActive });

    if (isActive !== prevState) {
      if (isActive) {
        this.logAlarmEvent(config, true, value);
      } else if (prevState === true) {
        this.logAlarmEvent(config, false, value);
      }
    }
  }

  private checkBitValueAlarm(config: FullAlarmConfig, value: number) {
    if (!Number.isInteger(value)) return;
    const prevState =
      (this.alarmStates.get(config.id)?.active as boolean[] | undefined) || [];
    const newActiveState: boolean[] = [];

    for (const bitConfig of config.bits) {
      const bitPosition = bitConfig.bitPosition;
      const isBitActive = ((value >> bitPosition) & 1) === 1;
      newActiveState[bitPosition] = isBitActive;

      if (isBitActive !== prevState[bitPosition]) {
        if (isBitActive) {
          this.logAlarmEvent(config, true, value, bitConfig);
        } else if (prevState[bitPosition] === true) {
          this.logAlarmEvent(config, false, value, bitConfig);
        }
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
    // Buat pesan notifikasi yang deskriptif
    const notificationMessage = `Alarm "${alarmName}" ${status} with value: ${value}`;
    try {
      // Blok kode 'if (isActive) { ... } else { ... }' untuk mencatat AlarmLog
      if (isActive) {
        await this.prisma.alarmLog.create({
          data: {
            alarmConfigId: config.id,
            status: AlarmLogStatus.ACTIVE,
            triggeringValue: String(value),
            ...(bitConfig && { alarmBitConfigId: bitConfig.id }),
          },
        });
      } else {
        const lastActiveLog = await this.prisma.alarmLog.findFirst({
          where: {
            alarmConfigId: config.id,
            status: AlarmLogStatus.ACTIVE,
            ...(bitConfig ? { alarmBitConfigId: bitConfig.id } : {}),
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

      const allUsers = await this.prisma.user.findMany({
        select: { id: true },
      });

      if (allUsers.length > 0) {
        await this.prisma.notification.createMany({
          data: allUsers.map((user) => ({
            userId: user.id,
            message: notificationMessage, // Gunakan pesan yang sudah kita buat
          })),
        });
      }
      // --- AKHIR LOGIKA BARU ---
    } catch (error) {
      console.error(
        `[ALARM EVENT] Gagal mencatat log atau notifikasi untuk "${alarmName}":`,
        error
      );
    }
  }
}

const alarmMonitorServiceInstance = new AlarmMonitorService();

let isServiceStarted = false;

export const getAlarmMonitorService = () => {
  if (!isServiceStarted) {
    alarmMonitorServiceInstance.start();
    isServiceStarted = true;
  }
  return alarmMonitorServiceInstance;
};
