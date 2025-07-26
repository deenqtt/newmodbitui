// File: services/mqtt-listener-service.js

const mqtt = require("mqtt");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const MQTT_HOST = process.env.NEXT_PUBLIC_MQTT_HOST || "localhost";
const MQTT_PORT = process.env.NEXT_PUBLIC_MQTT_PORT || "9000";
const MQTT_URL = `ws://${MQTT_HOST}:${MQTT_PORT}`;

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

// Hapus puePublicationTimers dan PUBLISH_INTERVAL_MS karena tidak pakai throttling
// const puePublicationTimers = new Map();
// const PUBLISH_INTERVAL_MS = 10 * 1000; // 10 detik

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

// Fungsi utama untuk memulai servis
async function startService() {
  console.log(`[MQTT Service] Mencoba terhubung ke ${MQTT_URL} (WebSocket)...`);

  try {
    // Ambil konfigurasi Bill
    const billConfigs = await prisma.billConfiguration.findMany({
      include: {
        sourceDevice: true,
        publishTargetDevice: true,
      },
    });

    // Ambil konfigurasi PUE
    const pueConfigs = await prisma.pueConfiguration.findMany({
      include: {
        apiTopic: true, // Untuk mendapatkan topic publikasi PUE
      },
    });

    if (billConfigs.length === 0 && pueConfigs.length === 0) {
      console.log(
        "[MQTT Service] Tidak ada konfigurasi Bill atau PUE ditemukan. Mencoba lagi dalam 15 detik..."
      );
      setTimeout(startService, 15000);
      return;
    }

    console.log(
      `[MQTT Service] Ditemukan ${billConfigs.length} konfigurasi Bill dan ${pueConfigs.length} konfigurasi PUE.`
    );

    const client = mqtt.connect(MQTT_URL, {
      clientId: `mqtt-listener-service-${Math.random().toString(16).slice(2)}`,
      reconnectPeriod: 5000,
    });

    client.on("connect", async () => {
      console.log("[MQTT Service] Terhubung ke broker MQTT via WebSocket.");

      const allDeviceUniqIds = new Set();
      // Kumpulkan semua uniqId perangkat yang terlibat dari BillConfigs
      billConfigs.forEach((c) => allDeviceUniqIds.add(c.sourceDevice.uniqId));
      // Kumpulkan semua uniqId perangkat yang terlibat dari PueConfigs (Main Power & PDU List)
      pueConfigs.forEach((config) => {
        if (config.mainPower && config.mainPower.topicUniqId)
          allDeviceUniqIds.add(config.mainPower.topicUniqId);
        if (Array.isArray(config.pduList)) {
          config.pduList.forEach((pdu) => {
            if (pdu.topicUniqId) allDeviceUniqIds.add(pdu.topicUniqId);
          });
        }
      });

      // Fetch semua device external yang relevan untuk mendapatkan topic dan lastPayload awal
      const relevantDevices = await prisma.deviceExternal.findMany({
        where: {
          uniqId: {
            in: Array.from(allDeviceUniqIds),
          },
        },
        select: {
          uniqId: true,
          topic: true,
          lastPayload: true, // Ambil juga lastPayload yang sudah ada di DB
        },
      });

      const topicsToSubscribe = new Set();

      // Isi lastKnownPayloads dengan data dari DB dan kumpulkan semua topik untuk subscribe
      relevantDevices.forEach((device) => {
        lastKnownPayloads.set(device.uniqId, {
          payload: device.lastPayload || {},
          topic: device.topic,
        });
        topicsToSubscribe.add(device.topic); // Tambahkan topik ke daftar langganan
      });

      if (topicsToSubscribe.size > 0) {
        client.subscribe(Array.from(topicsToSubscribe), (err) => {
          if (!err) {
            console.log(
              "[MQTT Service] Berhasil subscribe ke topik:",
              Array.from(topicsToSubscribe).join(", ")
            );
          } else {
            console.error("[MQTT Service] Gagal subscribe:", err);
          }
        });
      } else {
        console.warn("[MQTT Service] Tidak ada topik untuk di-subscribe.");
      }
    });

    client.on("message", async (topic, message) => {
      const payloadStr = message.toString();
      console.log(`[MQTT Service] Pesan diterima di topik [${topic}]`);

      let outerParsedPayload;
      try {
        outerParsedPayload = JSON.parse(payloadStr);
      } catch (e) {
        console.warn(
          `[MQTT Service] Gagal memparsing payload sebagai JSON untuk topik [${topic}]: ${payloadStr}. Error: ${e.message}`
        );
        return; // Hentikan pemrosesan jika payload bukan JSON
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
          innerValuePayload = outerParsedPayload; // Fallback jika string 'value' tidak valid JSON
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

      // Update payload di cache
      const deviceInCache = lastKnownPayloads.get(updatedDeviceUniqId);
      if (deviceInCache) {
        deviceInCache.payload = innerValuePayload;
      }

      // Update lastPayload di database
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
            innerValuePayload, // <-- GUNAKAN innerValuePayload DI SINI
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

          const energyKwh = rawValue / 1000; // Asumsi 'rawValue' adalah Watt, diubah ke kWh
          const rupiahCost = energyKwh * config.rupiahRatePerKwh;
          const dollarCost = energyKwh * config.dollarRatePerKwh;

          // NEW: Payload Bill dengan format value string JSON dan retain: true
          const publishPayloadBill = {
            Timestamp: new Date().toISOString(),
            device_name: config.customName,
            address: config.publishTargetDevice.address,
            value: JSON.stringify({
              // Stringify object to JSON string
              power_watt: rawValue,
              cost_idr_per_hour: rupiahCost,
              cost_usd_per_hour: dollarCost,
            }),
          };

          client.publish(
            config.publishTargetDevice.topic,
            JSON.stringify(publishPayloadBill), // Stringify payload terluar
            { retain: true } // <-- Set retain ke true
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
        // Hapus throttling PUE, publikasi langsung tiap ada pesan sumber
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

          // NEW: Format payload PUE sesuai permintaan Anda
          const puePublishValue = {
            pue: parseFloat(calculatedPUE), // Pastikan ini angka
            mainPowerValue_W: mainPowerValue,
            itPower_W: itPower,
          };

          const puePublishPayload = {
            Timestamp: new Date().toISOString(),
            device_name: pueConfig.customName, // Menggunakan customName sebagai device_name
            address: pueConfig.apiTopic?.address || "pue-system-virtual", // Asumsi ada address atau default
            value: JSON.stringify(puePublishValue), // Stringify object to JSON string
          };

          if (pueConfig.apiTopic && pueConfig.apiTopic.topic) {
            client.publish(
              pueConfig.apiTopic.topic,
              JSON.stringify(puePublishPayload), // Stringify payload terluar
              { retain: true } // <-- Set retain ke true
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
    }); // End of client.on("message")

    client.on("error", (err) => {
      console.error("[MQTT Service] Error koneksi:", err.message);
    });

    client.on("close", () => {
      console.log(
        "[MQTT Service] Koneksi terputus. Mencoba menghubungkan kembali..."
      );
      // Hapus logika clear timers karena tidak ada timer throttling lagi
      // puePublicationTimers.forEach(info => {
      //     if (info.timer) clearTimeout(info.timer);
      // });
      // puePublicationTimers.clear();
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
