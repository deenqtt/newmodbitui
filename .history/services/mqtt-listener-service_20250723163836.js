// File: services/mqtt-listener-service.js

const mqtt = require("mqtt");
const { PrismaClient } = require("@prisma/client");
const express = require("express"); // Import Express
const crypto = require("crypto"); // Import crypto for webhook signature verification

const prisma = new PrismaClient();

const MQTT_HOST = process.env.NEXT_PUBLIC_MQTT_HOST || "localhost";
const MQTT_PORT = process.env.NEXT_PUBLIC_MQTT_PORT || "9000";
const MQTT_URL = `ws://${MQTT_HOST}:${MQTT_PORT}`;

// NEW: Konfigurasi untuk Express dan Webhook
const WEBHOOK_PORT = process.env.WEBHOOK_PORT || 3001; // Port untuk service menerima webhook
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET; // Secret untuk verifikasi webhook

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
// key: deviceUniqId, value: { payload: Record<string, any>, topic: string }
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

// Deklarasi variabel konfigurasi di scope yang lebih luas agar bisa diupdate
let billConfigs = []; // Ubah dari const menjadi let
let pueConfigs = []; // Ubah dari const menjadi let
let mqttClient; // Deklarasi client MQTT di sini

// Fungsi untuk mengambil dan memperbarui konfigurasi serta langganan
// Fungsi ini akan dipanggil saat connect dan juga saat menerima webhook
async function fetchAndSubscribeConfigs() {
  try {
    const newBillConfigs = await prisma.billConfiguration.findMany({
      include: { sourceDevice: true, publishTargetDevice: true },
    });
    const newPueConfigs = await prisma.pueConfiguration.findMany({
      include: { apiTopic: true },
    });

    // Cek apakah ada perubahan yang signifikan (jumlah atau ID config berubah)
    const oldBillConfigIds = new Set(billConfigs.map((c) => c.id));
    const newBillConfigIds = new Set(newBillConfigs.map((c) => c.id));
    const oldPueConfigIds = new Set(pueConfigs.map((c) => c.id));
    const newPueConfigIds = new Set(newPueConfigs.map((c) => c.id));

    const configsChanged =
      billConfigs.length !== newBillConfigs.length ||
      pueConfigs.length !== newPueConfigs.length ||
      [...newBillConfigIds].some((id) => !oldBillConfigIds.has(id)) || // Ada ID Bill baru
      [...oldBillConfigIds].some((id) => !newBillConfigIds.has(id)) || // Ada ID Bill yang hilang
      [...newPueConfigIds].some((id) => !oldPueConfigIds.has(id)) || // Ada ID PUE baru
      [...oldPueConfigIds].some((id) => !newPueConfigIds.has(id)); // Ada ID PUE yang hilang

    // Atau cara sederhana untuk perbandingan objek (kurang efisien untuk array besar)
    // const configsChanged = JSON.stringify(billConfigs) !== JSON.stringify(newBillConfigs) ||
    //                        JSON.stringify(pueConfigs) !== JSON.stringify(newPueConfigs);

    if (
      configsChanged ||
      (billConfigs.length === 0 && pueConfigs.length === 0)
    ) {
      // Perbarui referensi global
      billConfigs = newBillConfigs;
      pueConfigs = newPueConfigs;

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

      const relevantDevices = await prisma.deviceExternal.findMany({
        where: { uniqId: { in: Array.from(allDeviceUniqIds) } },
        select: { uniqId: true, topic: true, lastPayload: true },
      });

      const newTopicsToSubscribe = new Set();
      const tempLastKnownPayloads = new Map(); // Pakai map sementara

      relevantDevices.forEach((device) => {
        tempLastKnownPayloads.set(device.uniqId, {
          payload: device.lastPayload || {},
          topic: device.topic,
        });
        newTopicsToSubscribe.add(device.topic);
      });

      // Lakukan unsubscribe yang tidak lagi dibutuhkan
      const currentSubscribedTopics = new Set(
        mqttClient.subscriptions ? Object.keys(mqttClient.subscriptions) : []
      );

      const topicsToUnsubscribe = Array.from(currentSubscribedTopics).filter(
        (topic) => !newTopicsToSubscribe.has(topic)
      );

      if (topicsToUnsubscribe.length > 0) {
        if (mqttClient && mqttClient.connected)
          mqttClient.unsubscribe(topicsToUnsubscribe); // Pastikan client terhubung
      }

      // Lakukan subscribe ke topik baru
      const topicsToSubscribeArray = Array.from(newTopicsToSubscribe).filter(
        (topic) => !currentSubscribedTopics.has(topic) // Hanya subscribe jika belum disubscribe
      );

      if (topicsToSubscribeArray.length > 0) {
        if (mqttClient && mqttClient.connected)
          mqttClient.subscribe(topicsToSubscribeArray); // Pastikan client terhubung
      }

      // Perbarui lastKnownPayloads global
      lastKnownPayloads.clear();
      tempLastKnownPayloads.forEach((v, k) => lastKnownPayloads.set(k, v));
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

// Fungsi utama untuk memulai servis
async function startService() {
  try {
    // --- Inisialisasi Express App untuk Webhook ---
    const app = express();
    app.use(express.json()); // Middleware untuk parsing JSON body

    app.post("/webhook/config-update", (req, res) => {
      // Verifikasi Webhook Signature (Opsional tapi Sangat Direkomendasikan)
      // Untuk Supabase, header ini biasanya 'x-supabase-webhook-hmac' dan signature base64
      if (WEBHOOK_SECRET) {
        const signature = req.headers["x-supabase-webhook-hmac"];
        const rawBody = JSON.stringify(req.body); // Body mentah harus dipakai untuk verifikasi

        if (!signature) {
          console.warn("[Webhook] Missing X-Supabase-Webhook-Hmac header.");
          return res.status(401).send("Unauthorized: Missing signature");
        }

        try {
          const expectedSignature = crypto
            .createHmac("sha256", WEBHOOK_SECRET)
            .update(rawBody) // Gunakan raw body string
            .digest("base64"); // Supabase biasanya base64

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

      fetchAndSubscribeConfigs(); // Panggil fungsi untuk memuat ulang dan memperbarui langganan
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
    // --- End Express App Inisialisasi ---

    mqttClient = mqtt.connect(MQTT_URL, {
      clientId: `mqtt-listener-service-${Math.random().toString(16).slice(2)}`,
      reconnectPeriod: 5000,
    });

    mqttClient.on("connect", async () => {
      console.log("[MQTT Service] Terhubung ke broker MQTT via WebSocket.");
      await fetchAndSubscribeConfigs(); // Panggil ini untuk langganan awal
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

      // --- Logika Parsing Inner Payload (mirip dengan frontend) ---
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
      // --- END Logika Parsing Inner Payload ---

      // --- Update lastKnownPayloads map dan DeviceExternal di database ---
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
      // --- END Update lastKnownPayloads map dan DeviceExternal di database ---

      // --- Pemrosesan Konfigurasi Bill (Existing Logic) ---
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
            value: JSON.stringify(puePublishValue), // Stringify object to JSON string
          };

          if (pueConfig.apiTopic && pueConfig.apiTopic.topic) {
            client.publish(
              pueConfig.apiTopic.topic,
              JSON.stringify(puePublishPayload),
              { retain: true }
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
    }); // End of client.on("message")

    mqttClient.on("error", (err) => {
      console.error("[MQTT Service] Error koneksi:", err.message);
    });

    mqttClient.on("close", () => {});
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
