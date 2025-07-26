// File: services/mqtt-listener-service.js

const mqtt = require("mqtt");
const { PrismaClient } = require("@prisma/client");
const express = require("express");
const crypto = require("crypto");
const dotenv = require("dotenv");
dotenv.config();

const prisma = new PrismaClient();

const MQTT_HOST = process.env.NEXT_PUBLIC_MQTT_HOST || "localhost";
const MQTT_PORT = process.env.NEXT_PUBLIC_MQTT_PORT || "9000";
const MQTT_URL = `ws://${MQTT_HOST}:${MQTT_PORT}`;

const WEBHOOK_PORT = process.env.WEBHOOK_PORT || 3001;
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET;

// Fungsi helper untuk mengambil nilai dari objek, termasuk yang nested
function getNestedValue(obj, path) {
  if (!path) return undefined;
  return path
    .split(".")
    .reduce(
      (acc, key) => (acc && acc[key] !== undefined ? acc[key] : undefined),
      obj
    );
}

const lastKnownPayloads = new Map();

// Fungsi untuk menghitung PUE (Standar Industri: Main Power / IT Power)
function calculatePUE(mainPowerValue, pduList) {
  if (
    mainPowerValue === null ||
    mainPowerValue === 0 ||
    !pduList ||
    pduList.length === 0
  ) {
    return null;
  }
  const itPower = pduList.reduce((sum, pdu) => sum + (pdu.value || 0), 0);
  if (itPower === 0) {
    return null; // Avoid division by zero, return null instead of "0"
  }
  const pue = mainPowerValue / itPower;
  return pue;
}

let billConfigs = [];
let pueConfigs = [];
let powerAnalyzerConfigs = [];
let mqttClient;

async function fetchAndSubscribeConfigs() {
  console.log("[MQTT Service] Memuat ulang konfigurasi dari database...");
  try {
    billConfigs = await prisma.billConfiguration.findMany({
      include: { sourceDevice: true, publishTargetDevice: true },
    });
    pueConfigs = await prisma.pueConfiguration.findMany({
      include: { apiTopic: true },
    });
    powerAnalyzerConfigs = await prisma.powerAnalyzerConfiguration.findMany({
      include: { apiTopic: true },
    });

    const allDeviceUniqIds = new Set();

    billConfigs.forEach((c) => allDeviceUniqIds.add(c.sourceDevice.uniqId));

    pueConfigs.forEach((config) => {
      if (config.mainPower && config.mainPower.uniqId)
        allDeviceUniqIds.add(config.mainPower.uniqId);
      if (Array.isArray(config.pduList)) {
        config.pduList.forEach((pdu) => {
          if (pdu.uniqId) allDeviceUniqIds.add(pdu.uniqId);
        });
      }
    });

    // --- DIPERBARUI: Mengambil UniqID untuk Power Analyzer dari pduList dan mainPower ---
    powerAnalyzerConfigs.forEach((config) => {
      if (config.mainPower && config.mainPower.uniqId) {
        allDeviceUniqIds.add(config.mainPower.uniqId);
      }
      if (Array.isArray(config.pduList)) {
        config.pduList.forEach((pdu) => {
          if (pdu.uniqId) allDeviceUniqIds.add(pdu.uniqId);
        });
      }
    });

    const relevantDevices = await prisma.deviceExternal.findMany({
      where: { uniqId: { in: Array.from(allDeviceUniqIds) } },
    });
    const newTopicsToSubscribe = new Set(relevantDevices.map((d) => d.topic));

    lastKnownPayloads.clear();
    relevantDevices.forEach((device) => {
      lastKnownPayloads.set(device.uniqId, {
        payload: device.lastPayload || {},
        topic: device.topic,
      });
    });

    const currentSubscribedTopics = new Set(
      mqttClient.subscriptions ? Object.keys(mqttClient.subscriptions) : []
    );
    const topicsToUnsubscribe = [...currentSubscribedTopics].filter(
      (topic) => !newTopicsToSubscribe.has(topic)
    );
    const topicsToSubscribe = [...newTopicsToSubscribe].filter(
      (topic) => !currentSubscribedTopics.has(topic)
    );

    if (topicsToUnsubscribe.length > 0 && mqttClient && mqttClient.connected) {
      console.log(
        `[MQTT Service] Unsubscribing from: ${topicsToUnsubscribe.join(", ")}`
      );
      mqttClient.unsubscribe(topicsToUnsubscribe);
    }
    if (topicsToSubscribe.length > 0 && mqttClient && mqttClient.connected) {
      console.log(
        `[MQTT Service] Subscribing to: ${topicsToSubscribe.join(", ")}`
      );
      mqttClient.subscribe(topicsToSubscribe);
    }

    console.log("[MQTT Service] Langganan MQTT diperbarui.");
  } catch (error) {
    console.error("[MQTT Service] Gagal memuat ulang konfigurasi:", error);
  }
}

async function startService() {
  console.log(`[MQTT Service] Mencoba terhubung ke ${MQTT_URL}...`);

  const app = express();
  app.use(express.json());

  app.post("/webhook/config-update", (req, res) => {
    // ... (Logika Webhook tidak berubah)
    console.log("[Webhook] Menerima event perubahan konfigurasi via webhook.");
    fetchAndSubscribeConfigs();
    res.status(200).send("Webhook received and processing");
  });

  app.listen(WEBHOOK_PORT, () => {
    console.log(
      `[MQTT Service] Webhook server mendengarkan di http://localhost:${WEBHOOK_PORT}`
    );
  });

  mqttClient = mqtt.connect(MQTT_URL, {
    clientId: `mqtt-listener-service-${Date.now()}`,
  });

  mqttClient.on("connect", async () => {
    console.log("[MQTT Service] Terhubung ke broker MQTT.");
    await fetchAndSubscribeConfigs();
  });

  mqttClient.on("message", async (topic, message) => {
    const payloadStr = message.toString();
    console.log(`[MQTT Service] Pesan diterima di topik [${topic}]`);

    let parsedPayload;
    try {
      parsedPayload = JSON.parse(payloadStr);
    } catch (e) {
      console.warn(
        `[MQTT Service] Gagal memparsing payload untuk topik [${topic}]`
      );
      return;
    }

    let innerValuePayload = parsedPayload;
    if (typeof parsedPayload.value === "string") {
      try {
        innerValuePayload = JSON.parse(parsedPayload.value);
      } catch (e) {
        /* Abaikan jika gagal */
      }
    } else if (
      typeof parsedPayload.value === "object" &&
      parsedPayload.value !== null
    ) {
      innerValuePayload = parsedPayload.value;
    }

    const device = await prisma.deviceExternal.findUnique({
      where: { topic },
      select: { uniqId: true },
    });
    if (!device) {
      console.warn(
        `[MQTT Service] Menerima pesan untuk topik tidak dikenal: ${topic}`
      );
      return;
    }
    const updatedDeviceUniqId = device.uniqId;

    if (lastKnownPayloads.has(updatedDeviceUniqId)) {
      lastKnownPayloads.get(updatedDeviceUniqId).payload = innerValuePayload;
    }
    await prisma.deviceExternal.update({
      where: { uniqId: updatedDeviceUniqId },
      data: { lastPayload: innerValuePayload, lastUpdatedByMqtt: new Date() },
    });

    // --- Pemrosesan Konfigurasi Bill (Tidak Berubah) ---
    // ...

    // --- Pemrosesan Konfigurasi PUE (Tidak Berubah) ---
    // ...

    // --- DIPERBARUI: Pemrosesan Konfigurasi Power Analyzer ---
    const relevantPowerAnalyzerConfigs = powerAnalyzerConfigs.filter(
      (config) => {
        const isMainPowerSource =
          config.mainPower?.uniqId === updatedDeviceUniqId;
        const isPduSource =
          Array.isArray(config.pduList) &&
          config.pduList.some((pdu) => pdu.uniqId === updatedDeviceUniqId);
        return isMainPowerSource || isPduSource;
      }
    );

    for (const paConfig of relevantPowerAnalyzerConfigs) {
      try {
        // 1. Ambil nilai Main Power dari cache
        const mainPowerDeviceData = lastKnownPayloads.get(
          paConfig.mainPower.uniqId
        );
        let mainPowerValue = null;
        if (
          mainPowerDeviceData?.payload &&
          paConfig.mainPower.key in mainPowerDeviceData.payload
        ) {
          const parsed = parseFloat(
            mainPowerDeviceData.payload[paConfig.mainPower.key]
          );
          if (!isNaN(parsed)) mainPowerValue = parsed;
        }

        // 2. Hitung total IT Power dari semua PDU
        let totalItPower = 0;
        if (Array.isArray(paConfig.pduList)) {
          paConfig.pduList.forEach((pdu) => {
            const pduDeviceData = lastKnownPayloads.get(pdu.uniqId);
            if (pduDeviceData?.payload) {
              pdu.keys.forEach((key) => {
                if (key in pduDeviceData.payload) {
                  const val = parseFloat(pduDeviceData.payload[key]);
                  if (!isNaN(val)) totalItPower += val;
                }
              });
            }
          });
        }

        // 3. Hitung Efisiensi (%) seperti di frontend
        let efficiencyPercentage = null;
        if (mainPowerValue !== null && mainPowerValue !== 0) {
          efficiencyPercentage = (totalItPower / mainPowerValue) * 100;
        }

        // 4. Siapkan payload untuk di-publish
        const paPublishValue = {
          efficiency_percent:
            efficiencyPercentage !== null
              ? parseFloat(efficiencyPercentage.toFixed(2))
              : null,
          it_power_watt: totalItPower,
          main_power_watt: mainPowerValue,
        };

        const paPublishPayload = {
          Timestamp: new Date().toISOString(),
          device_name: paConfig.customName,
          address: paConfig.apiTopic?.address || "power-analyzer-virtual",
          value: JSON.stringify(paPublishValue),
        };

        // 5. Publish ke Topik
        if (paConfig.apiTopic?.topic) {
          mqttClient.publish(
            paConfig.apiTopic.topic,
            JSON.stringify(paPublishPayload),
            { retain: true }
          );
          console.log(
            `[MQTT Service] PUBLISHED Power Analyzer to '${paConfig.apiTopic.topic}'`
          );
        }
      } catch (error) {
        console.error(
          `[MQTT Service] Gagal memproses pesan untuk Power Analyzer config '${paConfig.customName}':`,
          error
        );
      }
    } // Akhir dari loop Power Analyzer
  });

  mqttClient.on("error", (err) =>
    console.error("[MQTT Service] Error koneksi:", err.message)
  );
  mqttClient.on("close", () =>
    console.log(
      "[MQTT Service] Koneksi terputus. Mencoba menghubungkan kembali..."
    )
  );
}

startService();
