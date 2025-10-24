import { prisma } from "@/lib/prisma";
import mqtt from "mqtt";

// Konfigurasi untuk Gateway Stats
const MQTT_BROKER_URL = process.env.MQTT_BROKER_URL || "mqtt://localhost:1883";
const GATEWAY_STATS_TOPIC = "lora/gateway/+/stats"; // Sesuai dengan topic_prefix dari C code

let gatewayStatsClient: mqtt.MqttClient | null = null;

export function getGatewayStatsListenerService() {
  if (gatewayStatsClient && gatewayStatsClient.connected) {
    return;
  }

  const options: mqtt.IClientOptions = {
    clientId: `backend-gateway-stats-${Math.random().toString(16).slice(2)}`,
    username: process.env.MQTT_USERNAME,
    password: process.env.MQTT_PASSWORD,
  };

  gatewayStatsClient = mqtt.connect(MQTT_BROKER_URL, options);

  gatewayStatsClient.on("connect", () => {
    gatewayStatsClient?.subscribe(GATEWAY_STATS_TOPIC, (err) => {
      if (err) {
        console.error(
          `❌ [Gateway Stats] Gagal subscribe ke topik: ${GATEWAY_STATS_TOPIC}`,
          err
        );
      } else {
        console.log(
          `📊 [Gateway Stats] Berhasil subscribe ke topik: ${GATEWAY_STATS_TOPIC}`
        );
      }
    });
  });

  gatewayStatsClient.on("message", async (topic, payload) => {
    try {
      const message = JSON.parse(payload.toString());

      // Extract gateway ID dari topic (lora/gateway/001/stats -> gateway ID = 001)
      const gatewayId = topic.split("/")[2];

      if (!gatewayId || !message.timestamp) {
        console.warn(
          "⚠️ [Gateway Stats] Pesan tidak memiliki gateway ID atau timestamp"
        );
        return;
      }

      // Upsert gateway info
      const gateway = await prisma.loraGateway.upsert({
        where: { gatewayId: gatewayId },
        update: {
          lastSeen: new Date(),
          isOnline: true,
        },
        create: {
          gatewayId: gatewayId,
          name: `Gateway ${gatewayId}`,
          lastSeen: new Date(),
          isOnline: true,
        },
      });

      // Simpan statistics
      await prisma.gatewayStats.create({
        data: {
          gatewayId: gateway.id,
          timestamp: new Date(message.timestamp),

          // Upstream statistics
          rfPacketsReceived: message.upstream?.rf_packets_received || 0,
          rfPacketsOk: message.upstream?.rf_packets_ok || 0,
          rfPacketsBad: message.upstream?.rf_packets_bad || 0,
          rfPacketsNocrc: message.upstream?.rf_packets_nocrc || 0,
          rfPacketsForwarded: message.upstream?.rf_packets_forwarded || 0,
          upstreamPayloadBytes: message.upstream?.payload_bytes || 0,
          upstreamDatagramsSent: message.upstream?.datagrams_sent || 0,
          upstreamNetworkBytes: message.upstream?.network_bytes || 0,
          upstreamAckRatio: message.upstream?.ack_ratio || 0,
          crcOkRatio: message.upstream?.crc_ok_ratio || 0,
          crcFailRatio: message.upstream?.crc_fail_ratio || 0,
          noCrcRatio: message.upstream?.no_crc_ratio || 0,

          // Downstream statistics
          pullDataSent: message.downstream?.pull_data_sent || 0,
          pullAckReceived: message.downstream?.pull_ack_received || 0,
          downstreamDatagramsReceived:
            message.downstream?.datagrams_received || 0,
          downstreamNetworkBytes: message.downstream?.network_bytes || 0,
          downstreamPayloadBytes: message.downstream?.payload_bytes || 0,
          txOk: message.downstream?.tx_ok || 0,
          txErrors: message.downstream?.tx_errors || 0,
          downstreamAckRatio: message.downstream?.ack_ratio || 0,

          // SX1302 status
          counterInst: message.sx1302_status?.counter_inst?.toString() || "0",
          counterPps: message.sx1302_status?.counter_pps?.toString() || "0",

          // Beacon status
          beaconQueued: message.beacon_status?.queued || 0,
          beaconSent: message.beacon_status?.sent || 0,
          beaconRejected: message.beacon_status?.rejected || 0,
        },
      });

      console.log(
        `📊 [Gateway Stats] Data tersimpan untuk Gateway ${gatewayId}`
      );
    } catch (error) {
      console.error("❌ [Gateway Stats] Error processing message:", error);
    }
  });

  gatewayStatsClient.on("error", (err) => {
    console.error("❌ [Gateway Stats] MQTT Error:", err);
  });

  gatewayStatsClient.on("close", () => {
    console.log("🔌 [Gateway Stats] MQTT Connection closed");
  });
}
