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

function calculatePUE(mainPowerValue, pduList) {
  if (
    mainPowerValue === null ||
    mainPowerValue === 0 ||
    !pduList ||
    pduList.length === 0
  )
    return null;
  const itPower = pduList.reduce((sum, pdu) => sum + (pdu.value || 0), 0);
  if (itPower === 0) return null;
  return mainPowerValue / itPower;
}

let billConfigs = [];
let pueConfigs = [];
let powerAnalyzerConfigs = [];
let mqttClient;

async function fetchAndSubscribeConfigs() {
  console.log("[MQTT Service] Memuat ulang konfigurasi dari database...");
  try {
    const newBillConfigs = await prisma.billConfiguration.findMany({
      include: { sourceDevice: true, publishTargetDevice: true },
    });
    const newPueConfigs = await prisma.pueConfiguration.findMany({
      include: { apiTopic: true },
    });
    const newPowerAnalyzerConfigs =
      await prisma.powerAnalyzerConfiguration.findMany({
        include: { apiTopic: true },
      });

    const createFingerprint = (configs, type) => {
      return new Set(
        configs.map((c) => {
          if (type === "bill")
            return `${c.id}-${c.customName}-${c.sourceDeviceUniqId}-${c.sourceDeviceKey}`;
          if (type === "pue" || type === "pa")
            return `${c.id}-${c.customName}-${JSON.stringify(
              c.pduList
            )}-${JSON.stringify(c.mainPower)}`;
          return c.id;
        })
      );
    };

    const oldFingerprints = new Set([
      ...createFingerprint(billConfigs, "bill"),
      ...createFingerprint(pueConfigs, "pue"),
      ...createFingerprint(powerAnalyzerConfigs, "pa"),
    ]);
    const newFingerprints = new Set([
      ...createFingerprint(newBillConfigs, "bill"),
      ...createFingerprint(newPueConfigs, "pue"),
      ...createFingerprint(newPowerAnalyzerConfigs, "pa"),
    ]);

    const configsChanged =
      oldFingerprints.size !== newFingerprints.size ||
      [...newFingerprints].some(
        (fingerprint) => !oldFingerprints.has(fingerprint)
      );

    if (configsChanged) {
      console.log(
        "[MQTT Service] Perubahan konfigurasi terdeteksi. Memperbarui langganan MQTT..."
      );

      billConfigs = newBillConfigs;
      pueConfigs = newPueConfigs;
      powerAnalyzerConfigs = newPowerAnalyzerConfigs;

      const allDeviceUniqIds = new Set();

      billConfigs.forEach((c) => allDeviceUniqIds.add(c.sourceDevice.uniqId));

      pueConfigs.forEach((config) => {
        if (config.mainPower?.uniqId)
          allDeviceUniqIds.add(config.mainPower.uniqId);
        if (Array.isArray(config.pduList))
          config.pduList.forEach((pdu) => {
            if (pdu.uniqId) allDeviceUniqIds.add(pdu.uniqId);
          });
      });

      powerAnalyzerConfigs.forEach((config) => {
        if (config.mainPower?.uniqId)
          allDeviceUniqIds.add(config.mainPower.uniqId);
        if (Array.isArray(config.pduList))
          config.pduList.forEach((pdu) => {
            if (pdu.uniqId) allDeviceUniqIds.add(pdu.uniqId);
          });
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

      if (topicsToUnsubscribe.length > 0 && mqttClient?.connected) {
        mqttClient.unsubscribe(topicsToUnsubscribe);
        console.log(
          `[MQTT Service] Unsubscribed from: ${topicsToUnsubscribe.join(", ")}`
        );
      }
      if (topicsToSubscribe.length > 0 && mqttClient?.connected) {
        mqttClient.subscribe(topicsToSubscribe);
        console.log(
          `[MQTT Service] Subscribed to: ${topicsToSubscribe.join(", ")}`
        );
      }

      console.log("[MQTT Service] Langganan MQTT diperbarui.");
    } else {
      console.log(
        "[MQTT Service] Tidak ada perubahan konfigurasi yang signifikan. Langganan tidak perlu diperbarui."
      );
    }
  } catch (error) {
    console.error("[MQTT Service] Gagal memuat ulang konfigurasi:", error);
  }
}

async function startService() {
  console.log(`[MQTT Service] Mencoba terhubung ke ${MQTT_URL}...`);

  const app = express();
  app.use(express.json());
  app.post("/webhook/config-update", (req, res) => {
    console.log("[Webhook] Menerima event perubahan konfigurasi via webhook.");
    fetchAndSubscribeConfigs();
    res.status(200).send("Webhook received and processing");
  });
  app.listen(WEBHOOK_PORT, () =>
    console.log(
      `[MQTT Service] Webhook server mendengarkan di http://localhost:${WEBHOOK_PORT}`
    )
  );

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
        /* Abaikan */
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

    // Tambahkan log untuk debugging
    console.log(`[DEBUG] UniqID Ditemukan: ${updatedDeviceUniqId}`);
    console.log(
      `[DEBUG] Jumlah Konfigurasi di Memori: Bill=${billConfigs.length}, PUE=${pueConfigs.length}, PA=${powerAnalyzerConfigs.length}`
    );

    if (lastKnownPayloads.has(updatedDeviceUniqId)) {
      lastKnownPayloads.get(updatedDeviceUniqId).payload = innerValuePayload;
    }
    await prisma.deviceExternal.update({
      where: { uniqId: updatedDeviceUniqId },
      data: { lastPayload: innerValuePayload, lastUpdatedByMqtt: new Date() },
    });

    // --- Pemrosesan Konfigurasi Bill ---
    const relevantBillConfigs = billConfigs.filter(
      (c) => c.sourceDevice.uniqId === updatedDeviceUniqId
    );
    for (const config of relevantBillConfigs) {
      // ... (Logika Bill)
    }

    // --- Pemrosesan Konfigurasi PUE ---
    const relevantPueConfigs = pueConfigs.filter(
      (config) =>
        config.mainPower?.uniqId === updatedDeviceUniqId ||
        (Array.isArray(config.pduList) &&
          config.pduList.some((pdu) => pdu.uniqId === updatedDeviceUniqId))
    );
    for (const pueConfig of relevantPueConfigs) {
      // ... (Logika PUE)
    }

    // --- Pemrosesan Konfigurasi Power Analyzer ---
    const relevantPowerAnalyzerConfigs = powerAnalyzerConfigs.filter(
      (config) =>
        config.mainPower?.uniqId === updatedDeviceUniqId ||
        (Array.isArray(config.pduList) &&
          config.pduList.some((pdu) => pdu.uniqId === updatedDeviceUniqId))
    );
    for (const paConfig of relevantPowerAnalyzerConfigs) {
      try {
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

        let efficiencyPercentage = null;
        if (mainPowerValue !== null && mainPowerValue !== 0) {
          efficiencyPercentage = (totalItPower / mainPowerValue) * 100;
        }

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
    }
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
