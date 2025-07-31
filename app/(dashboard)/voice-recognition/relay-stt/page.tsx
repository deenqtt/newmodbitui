// File: app/(dashboard)/voice-recognition/relay-control/page.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { MqttProvider, useMqtt } from "@/contexts/MqttContext";

// --- UI Components & Icons ---
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Mic, MicOff } from "lucide-react";

// =================================================================
// Main Page Component
// =================================================================
function RelaySTTPage() {
  const { client, connectionStatus } = useMqtt();
  const [relayStatus, setRelayStatus] = useState<("ON" | "OFF")[]>([
    "OFF",
    "OFF",
    "OFF",
    "OFF",
  ]);
  const [isListening, setIsListening] = useState(false);
  const [recognizedText, setRecognizedText] = useState("");
  const [recognition, setRecognition] = useState<any>(null);

  const speakMessage = (message: string) => {
    try {
      const speech = new SpeechSynthesisUtterance(message);
      speech.lang = "id-ID";
      window.speechSynthesis.speak(speech);
    } catch (error) {
      console.error("Speech synthesis failed:", error);
    }
  };

  const publishToMQTT = useCallback(
    (pin: number, status: 0 | 1) => {
      if (client && connectionStatus === "Connected") {
        const payload = {
          mac: "02:81:19:b9:03:4b", // Hardcoded as in the original Vue file
          protocol_type: "Modular",
          device: "RELAYMINI",
          function: "write",
          value: { pin: pin, data: status },
          device_bus: 0,
          address: 36,
          Timestamp: new Date().toISOString(),
        };
        client.publish("modular", JSON.stringify(payload));
      }
    },
    [client, connectionStatus]
  );

  const processCommand = (command: string) => {
    const lowerCommand = command.toLowerCase().trim();
    setRecognizedText(command);
    let commandRecognized = false;
    let responseMessage = "";

    const newStatus = [...relayStatus];

    const toggleRelay = (numbers: string, status: 0 | 1) => {
      const relayNumbers = numbers
        .replace(/dan/g, ",")
        .split(",")
        .map((num) => parseInt(num.trim(), 10))
        .filter((index) => index >= 1 && index <= 4);

      relayNumbers.forEach((index) => {
        newStatus[index - 1] = status === 1 ? "ON" : "OFF";
        publishToMQTT(index, status);
      });
    };

    if (lowerCommand.includes("nyalakan semua relay")) {
      for (let i = 0; i < 4; i++) newStatus[i] = "ON";
      for (let i = 1; i <= 4; i++) publishToMQTT(i, 1);
      responseMessage = "Semua relay telah dinyalakan.";
      commandRecognized = true;
    } else if (lowerCommand.includes("matikan semua relay")) {
      for (let i = 0; i < 4; i++) newStatus[i] = "OFF";
      for (let i = 1; i <= 4; i++) publishToMQTT(i, 0);
      responseMessage = "Semua relay telah dimatikan.";
      commandRecognized = true;
    } else {
      const regexNyalakan = /nyalakan relay ([\d, dan]+)/;
      const regexMatikan = /matikan relay ([\d, dan]+)/;

      if (regexNyalakan.test(lowerCommand)) {
        const match = lowerCommand.match(regexNyalakan);
        toggleRelay(match![1], 1);
        responseMessage = `Relay ${match![1]} telah dinyalakan.`;
        commandRecognized = true;
      } else if (regexMatikan.test(lowerCommand)) {
        const match = lowerCommand.match(regexMatikan);
        toggleRelay(match![1], 0);
        responseMessage = `Relay ${match![1]} telah dimatikan.`;
        commandRecognized = true;
      }
    }

    setRelayStatus(newStatus);

    if (!commandRecognized) {
      responseMessage = "Perintah tidak saya mengerti.";
    }
    speakMessage(responseMessage);
  };

  const startRecognition = () => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert(
        "Browser tidak mendukung Speech-to-Text. Gunakan Chrome atau Edge."
      );
      return;
    }

    const rec = new SpeechRecognition();
    rec.lang = "id-ID";
    rec.continuous = false;
    rec.interimResults = false;

    rec.onstart = () => setIsListening(true);
    rec.onresult = (event) => processCommand(event.results[0][0].transcript);
    rec.onend = () => setIsListening(false);
    rec.onerror = (event) => {
      console.error("Speech recognition error:", event);
      setIsListening(false);
    };

    rec.start();
    setRecognition(rec);
  };

  const stopRecognition = () => {
    if (recognition) {
      recognition.stop();
      setIsListening(false);
    }
  };

  return (
    <div className="container mx-auto p-4 md:p-6 lg:p-8">
      <div className="mb-6 text-center">
        <h1 className="text-4xl font-bold tracking-tight text-primary">
          🔵 AutoNetX Control
        </h1>
        <p className="text-muted-foreground mt-2">
          Voice-activated relay control system.
        </p>
      </div>

      <div
        className={`text-center font-semibold p-2 rounded-md ${
          connectionStatus === "Connected"
            ? "bg-green-100 text-green-800"
            : "bg-red-100 text-red-800"
        }`}
      >
        MQTT Broker:{" "}
        {connectionStatus === "Connected"
          ? "✅ Terhubung"
          : "❌ Tidak Terhubung"}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
        {relayStatus.map((status, index) => (
          <Card key={index} className="text-center shadow-sm">
            <CardHeader>
              <CardTitle>Relay {index + 1}</CardTitle>
            </CardHeader>
            <CardContent>
              <p
                className={`text-2xl font-bold ${
                  status === "ON" ? "text-green-600" : "text-red-600"
                }`}
              >
                {status}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="text-center mt-12 space-y-4">
        <h2 className="text-2xl font-semibold">🎙️ Katakan Sesuatu:</h2>
        <div className="mx-auto max-w-lg p-4 border rounded-lg bg-secondary min-h-[70px] flex items-center justify-center">
          <p className="text-xl font-medium text-secondary-foreground">
            {recognizedText || "..."}
          </p>
        </div>
        <div className="flex justify-center gap-4">
          <Button onClick={startRecognition} size="lg" disabled={isListening}>
            <Mic className="mr-2 h-5 w-5" />{" "}
            {isListening ? "Mendengarkan..." : "Mulai Mendengar"}
          </Button>
          {isListening && (
            <Button onClick={stopRecognition} variant="destructive" size="lg">
              <MicOff className="mr-2 h-5 w-5" /> Berhenti
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

// --- Wrapper Component dengan MqttProvider ---
export default function RelaySTTPageWithProvider() {
  return (
    <MqttProvider>
      <RelaySTTPage />
    </MqttProvider>
  );
}
