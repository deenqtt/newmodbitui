// File: lib/services/alarm-monitor.ts

import { PrismaClient } from "@prisma/client";
import mqtt from "mqtt";
import { AlarmConfiguration, AlarmBitConfiguration, DeviceExternal, AlarmLogStatus } from "@prisma/client";

// Tipe data gabungan untuk kemudahan
type FullAlarmConfig = AlarmConfiguration & {
  device: DeviceExternal;
  bits: AlarmBitConfiguration[];
};

class AlarmMonitorService {
  private prisma: PrismaClient;
  private mqttClient: mqtt.MqttClient | null = null;
  // Menyimpan konfigurasi alarm, dikelompokkan berdasarkan topik MQTT
  private alarmConfigs: Map<string, FullAlarmConfig[]> = new Map(); 
  // Menyimpan status terakhir dari setiap alarm untuk mendeteksi perubahan
  private alarmStates: Map<string, { active: boolean | boolean[] }> = new Map(); 

  constructor() {
    this.prisma = new PrismaClient();
  }

  public async start() {
    console.log("✅ [ALARM SERVICE] Starting Alarm Monitor Service...");
    await this.loadAlarmConfigurations();
    this.connectToMqtt();
  }

  private async loadAlarmConfigurations() {
    console.log("[ALARM SERVICE] Loading alarm configurations from database...");
    const configsFromDb = await this.prisma.alarmConfiguration.findMany({
      include: {
        device: true, // Ambil data device terkait dalam satu query
        bits: true,   // Ambil data bit terkait dalam satu query
      },
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
    
    console.log(`[ALARM SERVICE] Loaded ${configsFromDb.length} alarm configs across ${topics.size} topics.`);
    return Array.from(topics);
  }

  private connectToMqtt() {
    const brokerUrl = `mqtt://${process.env.MQTT_BROKER_ADDRESS}:${process.env.MQTT_BROKER_PORT}`;
    this.mqttClient = mqtt.connect(brokerUrl);

    this.mqttClient.on("connect", async () => {
      console.log(`[ALARM SERVICE] Connected to MQTT Broker at ${brokerUrl}`);
      const topics = await this.loadAlarmConfigurations(); // Muat ulang jika koneksi terputus
      if (topics.length > 0) {
        this.mqttClient?.subscribe(topics, (err) => {
          if (!err) {
            console.log(`[ALARM SERVICE] Subscribed to ${topics.length} topics.`);
          }
        });
      }
    });

    this.mqttClient.on("message", (topic, payload) => {
      this.handleMessage(topic, payload.toString());
    });

    this.mqttClient.on("error", (error) => {
      console.error("[ALARM SERVICE] MQTT Error:", error);
    });
  }

  private handleMessage(topic: string, payloadStr: string) {
    const configs = this.alarmConfigs.get(topic);
    if (!configs) return;

    try {
      const outerPayload = JSON.parse(payloadStr);
      const payload = typeof outerPayload.value === 'string' 
        ? JSON.parse(outerPayload.value) 
        : (outerPayload.value || outerPayload);
      
      for (const config of configs) {
        this.checkAlarm(config, payload);
      }
    } catch (error) {
      console.error(`[ALARM SERVICE] Error processing message on topic ${topic}:`, error);
    }
  }

  private checkAlarm(config: FullAlarmConfig, payload: any) {
    const value = payload[config.key];
    if (value === undefined) return;

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
    const prevState = this.alarmStates.get(config.id)?.active as boolean | undefined;
    let isActive = false;

    if (config.maxOnly) {
      isActive = value > (config.maxValue ?? Infinity);
    } else {
      isActive = value < (config.minValue ?? -Infinity) || value > (config.maxValue ?? Infinity);
    }

    if (isActive !== prevState) {
      this.alarmStates.set(config.id, { active: isActive });
      this.logAlarmEvent(config, isActive, value);
    }
  }

  private checkDirectAlarm(config: FullAlarmConfig, value: boolean | number) {
    const prevState = this.alarmStates.get(config.id)?.active as boolean | undefined;
    const isActive = value === true || value === 1;

    if (isActive !== prevState) {
      this.alarmStates.set(config.id, { active: isActive });
      this.logAlarmEvent(config, isActive, value);
    }
  }
  
  private checkBitValueAlarm(config: FullAlarmConfig, value: number) {
    if (!Number.isInteger(value)) return;
    
    const prevState = this.alarmStates.get(config.id)?.active as boolean[] | undefined || [];
    const newActiveState: boolean[] = [];

    for (const bitConfig of config.bits) {
      const bitPosition = bitConfig.bitPosition;
      const isBitActive = ((value >> bitPosition) & 1) === 1;
      newActiveState[bitPosition] = isBitActive;

      if (isBitActive !== prevState[bitPosition]) {
        this.logAlarmEvent(config, isBitActive, value, bitConfig);
      }
    }
    this.alarmStates.set(config.id, { active: newActiveState });
  }

  private async logAlarmEvent(config: FullAlarmConfig, isActive: boolean, value: any, bitConfig?: AlarmBitConfiguration) {
    const alarmName = bitConfig ? bitConfig.customName : config.customName;
    const status = isActive ? AlarmLogStatus.ACTIVE : AlarmLogStatus.CLEARED;
    
    console.log(`[ALARM EVENT] Alarm: "${alarmName}", Status: ${status}, Value: ${value}`);

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
            },
            orderBy: { timestamp: 'desc' }
        });
        if (lastActiveLog) {
            await this.prisma.alarmLog.update({
                where: { id: lastActiveLog.id },
                data: {
                    status: AlarmLogStatus.CLEARED,
                    clearedAt: new Date(),
                },
            });
        }
      }
    } catch (error) {
      console.error(`[ALARM SERVICE] Failed to log alarm event for "${alarmName}":`, error);
    }
  }
}

// Singleton instance untuk memastikan service hanya berjalan sekali
let serviceInstance: AlarmMonitorService | null = null;

export function getAlarmMonitorService() {
  if (!serviceInstance) {
    serviceInstance = new AlarmMonitorService();
    serviceInstance.start();
  }
  return serviceInstance;
}
