// File: lib/services/stats-listener.ts

import { prisma } from "@/lib/prisma";
import mqtt from "mqtt";

import { getMQTTBrokerUrl, getMQTTUsername, getMQTTPassword } from "@/lib/mqtt-config";

const MQTT_BROKER_URL = getMQTTBrokerUrl();
const STATS_TOPIC = "iot/door/stats/+"; // Dengarkan semua controller

let mqttClient: mqtt.MqttClient | null = null;

export function getStatsListenerService() {
  if (mqttClient && mqttClient.connected) return;

  mqttClient = mqtt.connect(MQTT_BROKER_URL);

  mqttClient.on("connect", () => {
    mqttClient?.subscribe(STATS_TOPIC, (err) => {
      if (err) {
        console.error("❌ Failed to subscribe to stats topic:", err);
      } else {
        console.log(`👂 Successfully subscribed to topic: ${STATS_TOPIC}`);
      }
    });
  });

  mqttClient.on("message", async (topic, payload) => {
    try {
      // Ekstrak IP address dari topik
      const ipAddress = topic.split("/")[3];
      const statsData = JSON.parse(payload.toString());

      // Update data controller di database berdasarkan IP
      await prisma.accessController.update({
        where: { ipAddress: ipAddress },
        data: {
          uptime: statsData.uptime,
          freeHeap: statsData.freeHeap,
          totalHeap: statsData.totalHeap,
          spiffsUsed: statsData.spiffsUsed,
          spiffsTotal: statsData.spiffsTotal,
          logFileSize: statsData.logFileSize,
        },
      });
    } catch (error) {
      console.error("❌ Error processing stats message:", error);
    }
  });

  mqttClient.on("error", (err) =>
    console.error("MQTT stats listener error:", err)
  );
}
