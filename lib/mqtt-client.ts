// File: lib/mqtt-client.ts
import mqtt from "mqtt";

const MQTT_BROKER_URL =
  process.env.MQTT_BROKER_URL || "mqtt://192.168.0.139:1883";

let client: mqtt.MqttClient | null = null;

export function getMqttClient(): mqtt.MqttClient {
  if (!client) {
    console.log("🚀 [MQTT] Creating a new MQTT client instance...");
    const options: mqtt.IClientOptions = {
      clientId: `backend-ec25-${Math.random().toString(16).slice(2)}`,
      username: process.env.MQTT_USERNAME,
      password: process.env.MQTT_PASSWORD,
      reconnectPeriod: 5000,
    };

    client = mqtt.connect(MQTT_BROKER_URL, options);

    client.on("connect", () =>
      console.log("🔗 [MQTT] Global client connected to broker")
    );
    client.on("error", (err) =>
      console.error("❌ [MQTT] Global client error:", err)
    );
    client.on("reconnect", () =>
      console.log("🔄 [MQTT] Global client reconnecting...")
    );
    client.on("close", () =>
      console.log("🔌 [MQTT] Global client connection closed")
    );
  }
  return client;
}
