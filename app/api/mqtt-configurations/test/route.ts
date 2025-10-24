import { NextRequest, NextResponse } from "next/server";
import { connect, MqttClient } from "mqtt";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { brokerUrl, username, password } = body;

    if (!brokerUrl) {
      return NextResponse.json(
        {
          success: false,
          error: "Broker URL is required",
        },
        { status: 400 }
      );
    }

    // Test connection with timeout
    const testConnection = new Promise((resolve, reject) => {
      const clientId = `mqtt-test-${Date.now()}-${Math.random().toString(16).substr(2, 9)}`;

      let isConnected = false;
      let connectionTimeout: NodeJS.Timeout;

      const client = connect(brokerUrl, {
        clientId,
        username: username || undefined,
        password: password || undefined,
        connectTimeout: 5000, // 5 second timeout
        reconnectPeriod: 0, // Disable auto-reconnect for test
        clean: true,
      });

      // Set timeout for connection attempt
      connectionTimeout = setTimeout(() => {
        if (!isConnected) {
          client.end();
          resolve({
            connected: false,
            error: "Connection timeout (5 seconds)",
            code: "TIMEOUT"
          });
        }
      }, 5000);

      client.on("connect", () => {
        isConnected = true;
        clearTimeout(connectionTimeout);
        client.end();
        resolve({
          connected: true,
          message: "Connection successful",
          brokerUrl,
        });
      });

      client.on("error", (error) => {
        clearTimeout(connectionTimeout);
        client.end();
        resolve({
          connected: false,
          error: error.message || "Connection failed",
          code: "CONNECTION_ERROR"
        });
      });

      client.on("reconnect", () => {
        // Ignore reconnect during test
      });
    });

    const result = await testConnection;

    return NextResponse.json({
      success: true,
      data: result,
    });

  } catch (error) {
    console.error("Error testing MQTT connection:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to test MQTT connection",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
