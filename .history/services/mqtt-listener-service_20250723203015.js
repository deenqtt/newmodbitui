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

if (!WEBHOOK_SECRET) {
  console.warn(
    "WARNING: WEBHOOK_SECRET environment variable is not set. Webhook verification will be skipped."
  );
}

// Fungsi helper untuk mengambil nilai dari objek, termasuk yang nested
function getNestedValue(obj, path) {
  if (!path) return undefined;
  const keys = path.split(".");
  return keys.reduce(
    (acc, key) => (acc && acc[key] !== undefined ? acc[key] : undefined),
    obj
  );
}

// Map untuk menyimpan nilai payload terakhir yang diterima, diindeks oleh topicUniqId
const lastKnownPayloads = new Map();

// Fungsi untuk menghitung PUE (mirip dengan frontend)
function calculatePUE(mainPowerValue, pduList) {
  if (
    mainPowerValue === null ||
    mainPowerValue === 0 ||
    !pduList ||
    pduList.length === 0
  ) {
    return "N/A";
  }

  const itPower = pduList.reduce((sum, pdu) => sum + (pdu.value || 0), 0);
  if (itPower === 0) {
    return "0";
  }

  const pue = (mainPowerValue / itPower).toFixed(2);
  return pue;
}

// NEW: Fungsi untuk menghitung total nilai Power Analyzer dari listSensors
function calculatePowerAnalyzerTotal(config, lastKnownPayloadsMap) {
  if (!config.listSensors || config.listSensors.length === 0) {
    return null;
  }
  let totalValue = 0;
  let hasValidSensor = false;

  // Asumsi listSensors adalah array objek { topicUniqId, key }
  (config.listSensors || []).forEach((sensor) => {
    const sensorDeviceData = lastKnownPayloadsMap.get(sensor.topicUniqId);
    if (
      sensorDeviceData &&
      sensorDeviceData.payload &&
      sensor.key in sensorDeviceData.payload
    ) {
      const val = parseFloat(sensorDeviceData.payload[sensor.key]);
      if (!isNaN(val)) {
        totalValue += val;
        hasValidSensor = true;
      }
    }
  });

  return hasValidSensor ? totalValue : null;
}

// Deklarasi variabel konfigurasi di scope yang lebih luas agar bisa diupdate
let billConfigs = [];
let pueConfigs = [];
let powerAnalyzerConfigs = []; // NEW: Tambahkan ini
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
      }); // NEW: Ambil konfigurasi Power Analyzer

    const oldBillConfigIds = new Set(billConfigs.map((c) => c.id));
    const newBillConfigIds = new Set(newBillConfigs.map((c) => c.id));
    const oldPueConfigIds = new Set(pueConfigs.map((c) => c.id));
    const newPueConfigIds = new Set(newPueConfigs.map((c) => c.id));
    const oldPowerAnalyzerConfigIds = new Set(
      powerAnalyzerConfigs.map((c) => c.id)
    ); // NEW
    const newPowerAnalyzerConfigIds = new Set(
      newPowerAnalyzerConfigs.map((c) => c.id)
    ); // NEW

    const configsChanged =
      billConfigs.length !== newBillConfigs.length ||
      pueConfigs.length !== newPueConfigs.length ||
      powerAnalyzerConfigs.length !== newPowerAnalyzerConfigs.length || // NEW
      [...newBillConfigIds].some((id) => !oldBillConfigIds.has(id)) ||
      [...oldBillConfigIds].some((id) => !newBillConfigIds.has(id)) ||
      [...newPueConfigIds].some((id) => !oldPueConfigIds.has(id)) ||
      [...oldPueConfigIds].some((id) => !newPueConfigIds.has(id)) ||
      [...newPowerAnalyzerConfigIds].some(
        (id) => !oldPowerAnalyzerConfigIds.has(id)
      ) || // NEW
      [...oldPowerAnalyzerConfigIds].some(
        (id) => !newPowerAnalyzerConfigIds.has(id)
      ); // NEW

    if (
      configsChanged ||
      (billConfigs.length === 0 &&
        pueConfigs.length === 0 &&
        powerAnalyzerConfigs.length === 0)
    ) {
      // NEW: Tambahkan PowerAnalyzerConfigs
      console.log(
        "[MQTT Service] Perubahan konfigurasi terdeteksi. Memperbarui langganan MQTT..."
      );

      billConfigs = newBillConfigs;
      pueConfigs = newPueConfigs;
      powerAnalyzerConfigs = newPowerAnalyzerConfigs; // NEW: Perbarui referensi global

      const allDeviceUniqIds = new Set();
      newBillConfigs.forEach((c) =>
        allDeviceUniqIds.add(c.sourceDevice.uniqId)
      );
      newPueConfigs.forEach((config) => {
        if (config.mainPower && config.mainPower.topicUniqId)
          allDeviceUniqIds.add(config.mainPower.topicUniqId);
        if (Array.isArray(config.pduList)) {
          config.pduList.forEach((pdu) => {
            if (pdu.topicUniqId) allDeviceUniqIds.add(pdu.topicUniqId);
          });
        }
      });
      // NEW: Tambahkan uniqId dari Power Analyzer
      newPowerAnalyzerConfigs.forEach((config) => {
        if (config.apiTopicUniqId) allDeviceUniqIds.add(config.apiTopicUniqId); // apiTopic untuk publikasi
        (config.listSensors || []).forEach((sensor) => {
          // Sensor sumber
          if (sensor.topicUniqId) allDeviceUniqIds.add(sensor.topicUniqId);
        });
      });

      const relevantDevices = await prisma.deviceExternal.findMany({
        where: { uniqId: { in: Array.from(allDeviceUniqIds) } },
        select: { uniqId: true, topic: true, lastPayload: true },
      });

      const newTopicsToSubscribe = new Set();
      const tempLastKnownPayloads = new Map();

      relevantDevices.forEach((device) => {
        tempLastKnownPayloads.set(device.uniqId, {
          payload: device.lastPayload || {},
          topic: device.topic,
        });
        newTopicsToSubscribe.add(device.topic);
      });

      const currentSubscribedTopics = new Set(
        mqttClient.subscriptions ? Object.keys(mqttClient.subscriptions) : []
      );

      const topicsToUnsubscribe = Array.from(currentSubscribedTopics).filter(
        (topic) => !newTopicsToSubscribe.has(topic)
      );

      if (topicsToUnsubscribe.length > 0) {
        console.log(
          `[MQTT Service] Unsubscribing from topics: ${topicsToUnsubscribe.join(
            ", "
          )}`
        );
        if (mqttClient && mqttClient.connected)
          mqttClient.unsubscribe(topicsToUnsubscribe);
      }

      const topicsToSubscribeArray = Array.from(newTopicsToSubscribe).filter(
        (topic) => !currentSubscribedTopics.has(topic)
      );

      if (topicsToSubscribeArray.length > 0) {
        console.log(
          `[MQTT Service] Subscribing to new topics: ${topicsToSubscribeArray.join(
            ", "
          )}`
        );
        if (mqttClient && mqttClient.connected)
          mqttClient.subscribe(topicsToSubscribeArray);
      }

      lastKnownPayloads.clear();
      tempLastKnownPayloads.forEach((v, k) => lastKnownPayloads.set(k, v));

      console.log("[MQTT Service] Langganan MQTT diperbarui.");
    } else {
      console.log(
        "[MQTT Service] Tidak ada perubahan konfigurasi yang signifikan. Langganan tidak perlu diperbarui."
      );
    }
  } catch (error) {
    console.error(
      "[MQTT Service] Gagal memuat ulang konfigurasi atau memperbarui langganan:",
      error
    );
  }
}

async function startService() {
  console.log(`[MQTT Service] Mencoba terhubung ke ${MQTT_URL} (WebSocket)...`);

  try {
    const app = express();
    app.use(express.json());

    app.post("/webhook/config-update", (req, res) => {
      if (WEBHOOK_SECRET) {
        const signature = req.headers["x-supabase-webhook-hmac"];
        const rawBody = JSON.stringify(req.body);

        if (!signature) {
          console.warn("[Webhook] Missing X-Supabase-Webhook-Hmac header.");
          return res.status(401).send("Unauthorized: Missing signature");
        }

        try {
          const expectedSignature = crypto
            .createHmac("sha256", WEBHOOK_SECRET)
            .update(rawBody)
            .digest("base64");

          if (signature !== expectedSignature) {
            console.warn(
              `[Webhook] Invalid webhook signature. Expected: ${expectedSignature}, Received: ${signature}`
            );
            return res.status(403).send("Forbidden: Invalid signature");
          }
        } catch (e) {
          console.error("[Webhook] Error verifying signature:", e);
          return res
            .status(500)
            .send("Internal Server Error during signature verification");
        }
      } else {
        console.warn(
          "[Webhook] WEBHOOK_SECRET not set, skipping signature verification."
        );
      }

      console.log(
        "[Webhook] Menerima event perubahan konfigurasi via webhook."
      );
      fetchAndSubscribeConfigs();
      res.status(200).send("Webhook received and processing");
    });

    app.listen(WEBHOOK_PORT, () => {
      console.log(
        `[MQTT Service] Webhook server mendengarkan di http://localhost:${WEBHOOK_PORT}`
      );
      if (!WEBHOOK_SECRET) {
        console.warn(
          "[MQTT Service] Pastikan WEBHOOK_SECRET diatur untuk keamanan webhook."
        );
      }
      console.log(
        `[MQTT Service] URL untuk konfigurasi Webhook Supabase (di lokal, gunakan ngrok): http://<IP_PUBLIK>:${WEBHOOK_PORT}/webhook/config-update`
      );
    });

    mqttClient = mqtt.connect(MQTT_URL, {
      clientId: `mqtt-listener-service-${Math.random().toString(16).slice(2)}`,
      reconnectPeriod: 5000,
    });

    mqttClient.on("connect", async () => {
      console.log("[MQTT Service] Terhubung ke broker MQTT via WebSocket.");
      await fetchAndSubscribeConfigs();
    });

    mqttClient.on("message", async (topic, message) => {
      const payloadStr = message.toString();
      console.log(`[MQTT Service] Pesan diterima di topik [${topic}]`);

      let outerParsedPayload;
      try {
        outerParsedPayload = JSON.parse(payloadStr);
      } catch (e) {
        console.warn(
          `[MQTT Service] Gagal memparsing payload sebagai JSON untuk topik [${topic}]: ${payloadStr}. Error: ${e.message}`
        );
        return;
      }

      let innerValuePayload = {};
      if (
        outerParsedPayload.value &&
        typeof outerParsedPayload.value === "string"
      ) {
        try {
          innerValuePayload = JSON.parse(outerParsedPayload.value);
        } catch (e) {
          console.warn(
            `[MQTT Service] Warning: 'value' field in payload for topic ${topic} is not valid JSON string. Falling back to outer payload. Value: ${outerParsedPayload.value}. Error: ${e.message}`
          );
          innerValuePayload = outerParsedPayload;
        }
      } else if (
        outerParsedPayload.value &&
        typeof outerParsedPayload.value === "object"
      ) {
        innerValuePayload = outerParsedPayload.value;
      } else {
        innerValuePayload = outerParsedPayload;
      }

      let updatedDeviceUniqId = null;

      for (const [uniqId, deviceData] of lastKnownPayloads.entries()) {
        if (deviceData.topic === topic) {
          updatedDeviceUniqId = uniqId;
          break;
        }
      }

      if (!updatedDeviceUniqId) {
        const deviceFromDb = await prisma.deviceExternal.findUnique({
          where: { topic: topic },
          select: { uniqId: true, topic: true },
        });
        if (deviceFromDb) {
          updatedDeviceUniqId = deviceFromDb.uniqId;
          lastKnownPayloads.set(updatedDeviceUniqId, {
            payload: {},
            topic: topic,
          });
        } else {
          console.warn(
            `[MQTT Service] Received message for unknown or unconfigured topic: ${topic}. Skipping all processing for this message.`
          );
          return;
        }
      }

      const deviceInCache = lastKnownPayloads.get(updatedDeviceUniqId);
      if (deviceInCache) {
        deviceInCache.payload = innerValuePayload;
      }

      try {
        await prisma.deviceExternal.update({
          where: { uniqId: updatedDeviceUniqId },
          data: {
            lastPayload: innerValuePayload,
            lastUpdatedByMqtt: new Date(),
          },
        });
        console.log(
          `[MQTT Service] lastPayload updated in DB for ${updatedDeviceUniqId}`
        );
      } catch (dbUpdateError) {
        console.error(
          `[MQTT Service] Gagal update lastPayload di DB untuk ${updatedDeviceUniqId}:`,
          dbUpdateError
        );
      }

      // --- Pemrosesan Konfigurasi Bill ---
      const relevantBillConfigs = billConfigs.filter(
        (c) => c.sourceDevice.topic === topic
      );

      for (const config of relevantBillConfigs) {
        try {
          const valueFromPayload = getNestedValue(
            innerValuePayload,
            config.sourceDeviceKey
          );

          let rawValue;
          if (valueFromPayload !== undefined && valueFromPayload !== null) {
            const parsedValue = parseFloat(valueFromPayload);
            if (!isNaN(parsedValue)) {
              rawValue = parsedValue;
              console.log(
                `[MQTT Service] Nilai '${config.sourceDeviceKey}' ditemukan dan valid untuk Bill config '${config.customName}': ${rawValue}`
              );
            } else {
              console.warn(
                `[MQTT Service] Nilai untuk key '${config.sourceDeviceKey}' di Bill config '${config.customName}' tidak valid sebagai angka: '${valueFromPayload}'. Mengabaikan pemrosesan log untuk config ini.`
              );
              continue;
            }
          } else {
            console.warn(
              `[MQTT Service] Key '${config.sourceDeviceKey}' tidak ditemukan atau nilainya null di payload untuk Bill config '${config.customName}'. Mengabaikan pemrosesan log untuk config ini.`
            );
            continue;
          }

          const energyKwh = rawValue / 1000;
          const rupiahCost = energyKwh * config.rupiahRatePerKwh;
          const dollarCost = energyKwh * config.dollarRatePerKwh;

          const publishPayloadBill = {
            Timestamp: new Date().toISOString(),
            device_name: config.customName,
            address: config.publishTargetDevice.address,
            value: JSON.stringify({
              power_watt: rawValue,
              cost_idr_per_hour: rupiahCost,
              cost_usd_per_hour: dollarCost,
            }),
          };

          mqttClient.publish(
            config.publishTargetDevice.topic,
            JSON.stringify(publishPayloadBill),
            { retain: true }
          );
          console.log(
            `[MQTT Service] PUBLISHED Bill to '${config.publishTargetDevice.topic}' (Retain: true). Payload:`,
            publishPayloadBill
          );
        } catch (error) {
          console.error(
            `[MQTT Service] Gagal memproses pesan untuk Bill config '${config.customName}':`,
            error
          );
        }
      } // End of Bill Config processing

      // --- Pemrosesan Konfigurasi PUE ---
      const relevantPueConfigs = pueConfigs.filter((config) => {
        let deviceUniqIdForTopic = null;
        for (const [uniqId, deviceData] of lastKnownPayloads.entries()) {
          if (deviceData.topic === topic) {
            deviceUniqIdForTopic = uniqId;
            break;
          }
        }

        return (
          (config.mainPower &&
            config.mainPower.topicUniqId === deviceUniqIdForTopic) ||
          (Array.isArray(config.pduList) &&
            config.pduList.some(
              (pdu) => pdu.topicUniqId === deviceUniqIdForTopic
            ))
        );
      });

      for (const pueConfig of relevantPueConfigs) {
        try {
          const mainPowerDeviceData = lastKnownPayloads.get(
            pueConfig.mainPower.topicUniqId
          );
          let mainPowerValue = null;
          if (
            mainPowerDeviceData &&
            mainPowerDeviceData.payload &&
            pueConfig.mainPower.key in mainPowerDeviceData.payload
          ) {
            const parsedValue = parseFloat(
              mainPowerDeviceData.payload[pueConfig.mainPower.key]
            );
            if (!isNaN(parsedValue)) {
              mainPowerValue = parsedValue;
            } else {
              console.warn(
                `[MQTT Service] Main Power key '${pueConfig.mainPower.key}' has non-numeric value for PUE config '${pueConfig.customName}'.`
              );
            }
          }

          const pduDataList = pueConfig.pduList.map((pdu) => {
            const pduDeviceData = lastKnownPayloads.get(pdu.topicUniqId);
            let totalPduValue = null;
            if (pduDeviceData && pduDeviceData.payload) {
              let sumKeys = 0;
              let hasValidValue = false;
              pdu.keys.forEach((key) => {
                if (key in pduDeviceData.payload) {
                  const val = parseFloat(pduDeviceData.payload[key]);
                  if (!isNaN(val)) {
                    sumKeys += val;
                    hasValidValue = true;
                  }
                }
              });
              totalPduValue = hasValidValue ? sumKeys : null;
            }
            return { ...pdu, value: totalPduValue };
          });

          const validPduDataList = pduDataList.filter(
            (pdu) => pdu.value !== null && pdu.value !== undefined
          );

          const calculatedPUE = calculatePUE(mainPowerValue, validPduDataList);
          const itPower = validPduDataList.reduce(
            (sum, pdu) => sum + (pdu.value || 0),
            0
          );

          const puePublishValue = {
            pue: parseFloat(calculatedPUE),
            mainPowerValue_W: mainPowerValue,
            itPower_W: itPower,
          };

          const puePublishPayload = {
            Timestamp: new Date().toISOString(),
            device_name: pueConfig.customName,
            address: pueConfig.apiTopic?.address || "pue-system-virtual",
            value: JSON.stringify(puePublishValue),
          };

          if (pueConfig.apiTopic && pueConfig.apiTopic.topic) {
            mqttClient.publish(
              pueConfig.apiTopic.topic,
              JSON.stringify(puePublishPayload),
              { retain: true }
            );
            console.log(
              `[MQTT Service] PUBLISHED PUE to '${pueConfig.apiTopic.topic}' (Retain: true). Payload:`,
              puePublishPayload
            );
          } else {
            console.warn(
              `[MQTT Service] apiTopic tidak ditemukan untuk PUE config '${pueConfig.customName}'. Tidak dapat mempublikasikan hasil PUE.`
            );
          }
        } catch (error) {
          console.error(
            `[MQTT Service] Gagal memproses pesan untuk PUE config '${pueConfig.customName}':`,
            error
          );
        }
      } // End of PUE Config processing

      // --- NEW: Pemrosesan Konfigurasi Power Analyzer ---
      const relevantPowerAnalyzerConfigs = powerAnalyzerConfigs.filter(
        (config) => {
          let deviceUniqIdForTopic = null;
          for (const [uniqId, deviceData] of lastKnownPayloads.entries()) {
            if (deviceData.topic === topic) {
              deviceUniqIdForTopic = uniqId;
              break;
            }
          }
          return (
            config.apiTopicUniqId === deviceUniqIdForTopic || // Jika pesan dari topik publikasi PA itu sendiri
            (Array.isArray(config.listSensors) &&
              config.listSensors.some(
                (sensor) => sensor.topicUniqId === deviceUniqIdForTopic
              ))
          );
        }
      );

      for (const paConfig of relevantPowerAnalyzerConfigs) {
        try {
          const totalPowerValue = calculatePowerAnalyzerTotal(
            paConfig,
            lastKnownPayloads
          );

          const paPublishValue = {
            total_power_W: totalPowerValue,
          };

          const paPublishPayload = {
            Timestamp: new Date().toISOString(),
            device_name: paConfig.customName,
            address:
              paConfig.apiTopic?.address || "power-analyzer-system-virtual",
            value: JSON.stringify(paPublishValue),
          };

          if (paConfig.apiTopic && paConfig.apiTopic.topic) {
            mqttClient.publish(
              paConfig.apiTopic.topic,
              JSON.stringify(paPublishPayload),
              { retain: true }
            );
            console.log(
              `[MQTT Service] PUBLISHED Power Analyzer to '${paConfig.apiTopic.topic}' (Retain: true). Payload:`,
              paPublishPayload
            );
            // Juga buat log di database PowerAnalyzerLog
            if (totalPowerValue !== null) {
              await prisma.powerAnalyzerLog.create({
                data: {
                  configId: paConfig.id,
                  value: totalPowerValue,
                },
              });
              console.log(
                `[MQTT Service] Log Power Analyzer disimpan untuk '${paConfig.customName}'. Value: ${totalPowerValue}`
              );
            }
          } else {
            console.warn(
              `[MQTT Service] apiTopic tidak ditemukan untuk Power Analyzer config '${paConfig.customName}'. Tidak dapat mempublikasikan hasil.`
            );
          }
        } catch (error) {
          console.error(
            `[MQTT Service] Gagal memproses pesan untuk Power Analyzer config '${paConfig.customName}':`,
            error
          );
        }
      } // End of Power Analyzer Config processing
    }); // End of client.on("message")

    mqttClient.on("error", (err) => {
      console.error("[MQTT Service] Error koneksi:", err.message);
    });

    mqttClient.on("close", () => {
      console.log(
        "[MQTT Service] Koneksi terputus. Mencoba menghubungkan kembali..."
      );
    });
  } catch (dbError) {
    console.error(
      "[MQTT Service] Gagal mengambil konfigurasi dari database:",
      dbError
    );
    setTimeout(startService, 15000);
  }
}

// Jalankan service saat startup
startService();
