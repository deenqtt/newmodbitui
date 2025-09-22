// File: lib/services/calculation-service.ts
// Deskripsi: Service untuk melakukan kalkulasi Bill, PUE, dan Power Analyzer secara real-time.

import {
  PrismaClient,
  BillConfiguration,
  PueConfiguration,
  PowerAnalyzerConfiguration,
  DeviceExternal,
} from "@prisma/client";
import mqtt from "mqtt";

// Definisikan tipe gabungan untuk semua konfigurasi
type AnyConfig = (
  | BillConfiguration
  | PueConfiguration
  | PowerAnalyzerConfiguration
) & {
  type: "Bill" | "PUE" | "PowerAnalyzer";
  sourceDevices: { uniqId: string; key: string }[];
  publishTopic: string;
};

class CalculationService {
  private prisma: PrismaClient;
  private mqttClient: mqtt.MqttClient | null = null;
  private configs: AnyConfig[] = [];
  private lastValues: Map<string, { value: number; timestamp: Date }> =
    new Map();

  constructor() {
    this.prisma = new PrismaClient();
  }

  public async start() {
    this.connectToMqtt();
    await this.refreshConfigurations();

    if ((global as any).calcServiceInterval) {
      clearInterval((global as any).calcServiceInterval);
    }
    (global as any).calcServiceInterval = setInterval(
      () => this.refreshConfigurations(),
      15 * 1000
    );
  }

  private async refreshConfigurations() {
    const billConfigs = await this.prisma.billConfiguration.findMany({
      include: { publishTargetDevice: true },
    });
    const pueConfigs = await this.prisma.pueConfiguration.findMany({
      include: { apiTopic: true },
    });
    const powerAnalyzerConfigs =
      await this.prisma.powerAnalyzerConfiguration.findMany({
        include: { apiTopic: true },
      });

    const allConfigs: AnyConfig[] = [];
    const topicsToSubscribe = new Set<string>();

    for (const config of billConfigs) {
      if (config.publishTargetDevice?.topic) {
        const sourceDevice = await this.prisma.deviceExternal.findUnique({
          where: { uniqId: config.sourceDeviceUniqId },
        });
        if (sourceDevice?.topic) {
          topicsToSubscribe.add(sourceDevice.topic);
          allConfigs.push({
            ...config,
            type: "Bill",
            sourceDevices: [
              {
                uniqId: config.sourceDeviceUniqId,
                key: config.sourceDeviceKey,
              },
            ],
            publishTopic: config.publishTargetDevice.topic,
          });
        }
      }
    }

    const processComplexConfig = async (
      config: (PueConfiguration | PowerAnalyzerConfiguration) & {
        apiTopic: DeviceExternal | null;
      },
      type: "PUE" | "PowerAnalyzer"
    ) => {
      if (!config.apiTopic?.topic) return;

      // ✅ FIX: Parse JSON strings dengan safety check
      let pduList: any[] = [];
      let mainPower: any = null;

      try {
        // Parse pduList dari JSON string
        if (config.pduList) {
          pduList = JSON.parse(config.pduList);
          // Safety check: pastikan hasilnya array
          if (!Array.isArray(pduList)) {
            pduList = [];
          }
        }

        // Parse mainPower dari JSON string
        if (config.mainPower) {
          mainPower = JSON.parse(config.mainPower);
        }
      } catch (error) {
        console.error(
          `[CALC SERVICE] Error parsing config for ${config.customName}:`,
          error
        );
        return; // Skip config yang error
      }

      const sources: { uniqId: string; key: string }[] = [];

      // Process mainPower
      const mainUniqId = mainPower?.uniqId || mainPower?.topicUniqId;
      if (mainUniqId && mainPower?.key) {
        sources.push({ uniqId: mainUniqId, key: mainPower.key });
      }

      // ✅ FIX: Sekarang pduList sudah pasti array
      pduList.forEach((pdu) => {
        const pduUniqId = pdu.uniqId || pdu.topicUniqId;
        if (pduUniqId && Array.isArray(pdu.keys)) {
          pdu.keys.forEach((key) => sources.push({ uniqId: pduUniqId, key }));
        }
      });

      if (sources.length === 0) return;

      const sourceDevices = await this.prisma.deviceExternal.findMany({
        where: { uniqId: { in: sources.map((s) => s.uniqId) } },
      });

      sourceDevices.forEach((device) => {
        if (device.topic) topicsToSubscribe.add(device.topic);
      });

      allConfigs.push({
        ...config,
        type,
        sourceDevices: sources,
        publishTopic: config.apiTopic.topic,
      });
    };

    await Promise.all([
      ...pueConfigs.map((c) => processComplexConfig(c, "PUE")),
      ...powerAnalyzerConfigs.map((c) =>
        processComplexConfig(c, "PowerAnalyzer")
      ),
    ]);

    this.configs = allConfigs;

    if (this.mqttClient?.connected && topicsToSubscribe.size > 0) {
      this.mqttClient.subscribe(Array.from(topicsToSubscribe));
    }
  }

  private connectToMqtt() {
    if ((global as any).calcMqttClient) {
      (global as any).calcMqttClient.end(true);
    }

    // UBAH INI - Dynamic host resolution
    const brokerHost = this.getMQTTHost();
    const brokerPort = 1883;
    const brokerUrl = `mqtt://${brokerHost}:${brokerPort}`;

    const options = {
      protocolVersion: 4,
      clientId: `calculation-service-${Math.random()
        .toString(16)
        .slice(2, 10)}`,
    };
    this.mqttClient = mqtt.connect(brokerUrl, options);
    (global as any).calcMqttClient = this.mqttClient;
    this.mqttClient.on("connect", () =>
      console.log(`[CALC SERVICE] Terhubung ke Broker MQTT di ${brokerUrl}`)
    );
    this.mqttClient.on("message", (topic, payload) =>
      this.handleMessage(topic, payload.toString())
    );
    this.mqttClient.on("error", (error) =>
      console.error("[CALC SERVICE] MQTT Error:", error)
    );
  }

  private async handleMessage(topic: string, payloadStr: string) {
    try {
      const parsedPayload = JSON.parse(payloadStr);
      const device = await this.prisma.deviceExternal.findUnique({
        where: { topic },
      });
      if (!device) return;
      const valueObject = JSON.parse(parsedPayload.value);
      for (const key in valueObject) {
        const value = parseFloat(valueObject[key]);
        if (!isNaN(value)) {
          this.lastValues.set(`${device.uniqId}:${key}`, {
            value,
            timestamp: new Date(),
          });
        }
      }
      this.configs.forEach((config) => {
        if (config.sourceDevices.some((s) => s.uniqId === device.uniqId)) {
          this.triggerCalculation(config);
        }
      });
    } catch (error) {}
  }
  // TAMBAH function helper ini di class
  private getMQTTHost(): string {
    // Development: gunakan env variable
    if (process.env.NEXT_PUBLIC_MQTT_HOST) {
      return process.env.NEXT_PUBLIC_MQTT_HOST;
    }

    // Production: gunakan window.location.hostname jika tersedia (browser only)
    if (typeof window !== "undefined" && window.location) {
      return window.location.hostname;
    }

    // Fallback ke localhost
    return "localhost";
  }
  private triggerCalculation(config: AnyConfig) {
    if (
      config.sourceDevices.every((s) =>
        this.lastValues.has(`${s.uniqId}:${s.key}`)
      )
    ) {
      switch (config.type) {
        case "Bill":
          this.calculateAndPublishBill(config as any);
          break;
        case "PUE":
          this.calculateAndPublishPue(config as any);
          break;
        case "PowerAnalyzer":
          this.calculateAndPublishPowerAnalyzer(config as any);
          break;
      }
    }
  }

  private publish(topic: string, deviceName: string, valuePayload: object) {
    if (!this.mqttClient) return;
    const finalPayload = {
      device_name: deviceName,
      value: JSON.stringify(valuePayload),
      Timestamp: new Date().toISOString(),
    };
    this.mqttClient.publish(topic, JSON.stringify(finalPayload));
  }

  private calculateAndPublishBill(
    config: BillConfiguration & { publishTargetDevice: DeviceExternal }
  ) {
    const sourceValue =
      this.lastValues.get(
        `${config.sourceDeviceUniqId}:${config.sourceDeviceKey}`
      )?.value ?? 0;
    const energyInKwh = (sourceValue * 1) / 1000;
    const rupiahCost = energyInKwh * (config.rupiahRatePerKwh ?? 1467);
    const dollarCost = energyInKwh * (config.dollarRatePerKwh ?? 0.1);
    const result = {
      rawValue: sourceValue,
      rupiahCost: parseFloat(rupiahCost.toFixed(2)),
      dollarCost: parseFloat(dollarCost.toFixed(2)),
    };
    this.publish(config.publishTargetDevice.topic, config.customName, result);
  }

  private calculateAndPublishPue(
    config: PueConfiguration & { apiTopic: DeviceExternal }
  ) {
    // ✅ FIX: Parse JSON strings dengan safety
    let mainPowerConfig: any = null;
    let pduList: any[] = [];

    try {
      if (config.mainPower) {
        mainPowerConfig = JSON.parse(config.mainPower);
      }
      if (config.pduList) {
        pduList = JSON.parse(config.pduList);
        if (!Array.isArray(pduList)) pduList = [];
      }
    } catch (error) {
      console.error(
        `[CALC SERVICE] PUE Parse error for ${config.customName}:`,
        error
      );
      return;
    }

    const mainUniqId = mainPowerConfig?.uniqId || mainPowerConfig?.topicUniqId;
    const mainPowerValue =
      this.lastValues.get(`${mainUniqId}:${mainPowerConfig?.key}`)?.value ?? 0;

    let itPower = 0;
    const itPowerDetails: { name: string; value: number }[] = [];
    pduList.forEach((pdu) => {
      const pduUniqId = pdu.uniqId || pdu.topicUniqId;
      const pduTotal = pdu.keys.reduce(
        (sum: number, key: string) =>
          sum + (this.lastValues.get(`${pduUniqId}:${key}`)?.value ?? 0),
        0
      );
      itPower += pduTotal;
      itPowerDetails.push({ name: pdu.name, value: pduTotal });
    });
    const pueValue = itPower > 0 ? mainPowerValue / itPower : 0;
    const result = {
      totalFacilityPower: mainPowerValue,
      totalItPower: itPower,
      pueValue: parseFloat(pueValue.toFixed(2)),
      itPowerDetails,
    };
    this.publish(config.apiTopic.topic, config.customName, result);
  }

  private calculateAndPublishPowerAnalyzer(
    config: PowerAnalyzerConfiguration & { apiTopic: DeviceExternal }
  ) {
    // ✅ FIX: Parse JSON strings dengan safety
    let mainPowerConfig: any = null;
    let pduList: any[] = [];

    try {
      if (config.mainPower) {
        mainPowerConfig = JSON.parse(config.mainPower);
      }
      if (config.pduList) {
        pduList = JSON.parse(config.pduList);
        if (!Array.isArray(pduList)) pduList = [];
      }
    } catch (error) {
      console.error(
        `[CALC SERVICE] PowerAnalyzer Parse error for ${config.customName}:`,
        error
      );
      return;
    }

    const mainUniqId = mainPowerConfig?.uniqId || mainPowerConfig?.topicUniqId;
    const mainPowerValue =
      this.lastValues.get(`${mainUniqId}:${mainPowerConfig?.key}`)?.value ?? 0;

    let itPower = 0;
    const itPowerDetails: { name: string; value: number }[] = [];
    pduList.forEach((pdu) => {
      const pduUniqId = pdu.uniqId || pdu.topicUniqId;
      const pduTotal = pdu.keys.reduce(
        (sum: number, key: string) =>
          sum + (this.lastValues.get(`${pduUniqId}:${key}`)?.value ?? 0),
        0
      );
      itPower += pduTotal;
      itPowerDetails.push({ name: pdu.name, value: pduTotal });
    });
    const itLoadPercentage =
      mainPowerValue > 0 ? (itPower / mainPowerValue) * 100 : 0;
    const result = {
      totalFacilityPower: mainPowerValue,
      totalItPower: itPower,
      itLoadPercentage: `${itLoadPercentage.toFixed(2)}%`,
      itPowerDetails,
    };
    this.publish(config.apiTopic.topic, config.customName, result);
  }
}

const calculationServiceInstance = new CalculationService();
let isCalcServiceStarted = false;
export const getCalculationService = () => {
  if (!isCalcServiceStarted) {
    calculationServiceInstance.start();
    isCalcServiceStarted = true;
  }
  return calculationServiceInstance;
};
