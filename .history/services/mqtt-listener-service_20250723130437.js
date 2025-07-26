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


// Fungsi utama untuk memulai servis
async function startService() {
  // ... (bagian startService dan koneksi MQTT tetap sama)

    client.on("message", async (topic, message) => {
      const payloadStr = message.toString();
      console.log(`[MQTT Service] Pesan diterima di topik [${topic}]`);

      let outerParsedPayload; // Ganti 'payload' menjadi 'outerParsedPayload'
      try {
        outerParsedPayload = JSON.parse(payloadStr);
      } catch (e) {
        console.warn(
          `[MQTT Service] Gagal memparsing payload sebagai JSON untuk topik [${topic}]: ${payloadStr}. Error: ${e.message}`
        );
        return; // Hentikan pemrosesan jika payload bukan JSON
      }

      // --- NEW: Logika Parsing Inner Payload (mirip dengan frontend) ---
      let innerValuePayload = {};
      if (
        outerParsedPayload.value &&
        typeof outerParsedPayload.value === "string"
      ) {
        try {
          innerValuePayload = JSON.parse(outerParsedPayload.value);
          console.log("[MQTT Service] Inner 'value' Payload (parsed):", innerValuePayload);
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
        // Jika 'value' sudah berupa objek (bukan stringified JSON)
        innerValuePayload = outerParsedPayload.value;
        console.log("[MQTT Service] Inner 'value' Payload (already object):", innerValuePayload);
      } else {
        // Jika tidak ada field 'value' atau bukan string/objek, gunakan seluruh payload terluar
        innerValuePayload = outerParsedPayload;
        console.log("[MQTT Service] No 'value' field or not string/object. Using full outer payload for keys:", innerValuePayload);
      }
      // --- END NEW: Logika Parsing Inner Payload ---


      // --- Update lastKnownPayloads map dan DeviceExternal di database ---
      // Cari device yang sesuai berdasarkan topik
      let updatedDeviceUniqId = null;
      // Gunakan innerValuePayload untuk update lastPayload di DB
      // Anda perlu menemukan deviceUniqId berdasarkan topik
      const deviceToUpdate = await prisma.deviceExternal.findUnique({
          where: { topic: topic },
          select: { uniqId: true, topic: true } // Hanya ambil uniqId dan topic
      });

      if (!deviceToUpdate) {
          console.warn(`[MQTT Service] Received message for unknown or unconfigured topic: ${topic}. Skipping payload update to DB.`);
          return;
      }
      updatedDeviceUniqId = deviceToUpdate.uniqId;

      // Update payload di cache (lastKnownPayloads)
      lastKnownPayloads.set(updatedDeviceUniqId, {
          payload: innerValuePayload, // <-- GUNAKAN innerValuePayload DI SINI
          topic: topic
      });


      // Update lastPayload di database
      try {
        await prisma.deviceExternal.update({
          where: { uniqId: updatedDeviceUniqId },
          data: {
            lastPayload: innerValuePayload, // <-- GUNAKAN innerValuePayload DI SINI
            lastUpdatedByMqtt: new Date(),
          },
        });
        console.log(`[MQTT Service] lastPayload updated in DB for ${updatedDeviceUniqId}`);
      } catch (dbUpdateError) {
        console.error(`[MQTT Service] Gagal update lastPayload di DB untuk ${updatedDeviceUniqId}:`, dbUpdateError);
        // Penting: pertimbangkan untuk tidak menghentikan pemrosesan selanjutnya
        // jika update DB gagal, karena kita masih punya data di `innerValuePayload`
        // dan di cache `lastKnownPayloads` untuk perhitungan saat ini.
      }
      // --- END NEW: Update lastKnownPayloads map dan DeviceExternal di database ---


      // --- Pemrosesan Konfigurasi Bill (Existing Logic) ---
      const relevantBillConfigs = billConfigs.filter(
        (c) => c.sourceDevice.topic === topic
      );

      for (const config of relevantBillConfigs) {
        try {
          // Mengambil nilai dengan fungsi helper, SEKARANG DARI innerValuePayload
          const valueFromPayload = getNestedValue(
            innerValuePayload, // <-- GUNAKAN innerValuePayload DI SINI
            config.sourceDeviceKey
          );

          // ... (sisa logika pemrosesan Bill config tetap sama)
        } catch (error) {
          console.error(
            `[MQTT Service] Gagal memproses pesan untuk Bill config '${config.customName}':`,
            error
          );
        }
      } // End of Bill Config processing

      // --- Pemrosesan Konfigurasi PUE (NEW Logic) ---
      // ... (Logika PUE yang sudah Anda tambahkan di bawah ini akan bekerja dengan benar
      //     karena mereka akan mengambil data dari `lastKnownPayloads` yang sudah diupdate
      //     dengan `innerValuePayload`)
      const relevantPueConfigs = pueConfigs.filter((config) => {
        // Cek apakah topik yang diterima relevan dengan Main Power atau PDU di PUE configs
        return (
          (config.mainPower && lastKnownPayloads.get(config.mainPower.topicUniqId)?.topic === topic) ||
          (Array.isArray(config.pduList) &&
            config.pduList.some(
              (pdu) => lastKnownPayloads.get(pdu.topicUniqId)?.topic === topic
            ))
        );
      });

      for (const pueConfig of relevantPueConfigs) {
        try {
          // Kumpulkan nilai daya dari Main Power dan PDU list dari lastKnownPayloads (cache)
          const mainPowerDeviceData = lastKnownPayloads.get(pueConfig.mainPower.topicUniqId);
          let mainPowerValue = null;
          if (mainPowerDeviceData && mainPowerDeviceData.payload && pueConfig.mainPower.key in mainPowerDeviceData.payload) {
            const parsedValue = parseFloat(mainPowerDeviceData.payload[pueConfig.mainPower.key]);
            if (!isNaN(parsedValue)) {
              mainPowerValue = parsedValue;
            } else {
              console.warn(`[MQTT Service] Main Power key '${pueConfig.mainPower.key}' has non-numeric value for PUE config '${pueConfig.customName}'.`);
            }
          }

          const pduDataList = pueConfig.pduList.map(pdu => {
            const pduDeviceData = lastKnownPayloads.get(pdu.topicUniqId);
            let totalPduValue = null;
            if (pduDeviceData && pduDeviceData.payload) {
                let sumKeys = 0;
                let hasValidValue = false;
                pdu.keys.forEach(key => {
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
            return { ...pdu, value: totalPduValue }; // Assign calculated value
          });

          // Filter PDU yang memiliki nilai valid untuk perhitungan IT Power
          const validPduDataList = pduDataList.filter(pdu => pdu.value !== null && pdu.value !== undefined);

          // Hitung PUE
          const calculatedPUE = calculatePUE(mainPowerValue, validPduDataList);
          console.log(`[MQTT Service] PUE calculated for '${pueConfig.customName}': ${calculatedPUE}`);

          // Publikasikan hasil PUE
          if (pueConfig.apiTopic && pueConfig.apiTopic.topic) {
            const puePublishPayload = {
              Timestamp: new Date().toISOString(),
              customName: pueConfig.customName,
              pue: calculatedPUE,
              mainPowerValue: mainPowerValue,
              itPower: validPduDataList.reduce((sum, pdu) => sum + (pdu.value || 0), 0),
            };

            client.publish(
              pueConfig.apiTopic.topic,
              JSON.stringify(puePublishPayload)
            );
            console.log(
              `[MQTT Service] Hasil PUE dipublikasikan ke topik '${pueConfig.apiTopic.topic}'.`
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
      }
    }); // End of client.on("message")

startService();
