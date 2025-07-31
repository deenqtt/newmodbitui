// File: app/(dashboard)/voice-recognition/relay-control/page.tsx
"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { MqttProvider, useMqtt } from "@/contexts/MqttContext";
import Swal from "sweetalert2";

// --- UI Components & Icons ---
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Mic, MicOff, Bot } from "lucide-react";
import { Label } from "@radix-ui/react-dropdown-menu";

// --- Type Definitions ---
type ModularDevice = {
  id: string;
  name: string;
  topicName: string;
  partNumber: string;
  ipDevice: string;
  deviceBus: number;
  mac?: string; // MAC address might be in the payload
};

// --- Konfigurasi Toast ---
const Toast = Swal.mixin({
  toast: true,
  position: "top-end",
  showConfirmButton: false,
  timer: 3000,
  timerProgressBar: true,
});

// =================================================================
// Main Page Component
// =================================================================
function VoiceRecognitionControlPage() {
  const { client, connectionStatus } = useMqtt();
  const [modularDevices, setModularDevices] = useState<ModularDevice[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<ModularDevice | null>(
    null
  );
  const [subscribedTopic, setSubscribedTopic] = useState<string | null>(null);
  const [devicePins, setDevicePins] = useState<Record<string, boolean>>({});
  const [isListening, setIsListening] = useState(false);
  const [recognizedText, setRecognizedText] = useState("");
  const [responseText, setResponseText] = useState("");
  const [recognition, setRecognition] = useState<any>(null);

  // Fetch modular devices (assuming an API exists for this)
  useEffect(() => {
    async function fetchModularDevices() {
      try {
        // Asumsi Anda memiliki API untuk mengambil daftar perangkat modular/relay
        const response = await fetch("/api/devices/modular"); // Ganti dengan endpoint API Anda
        if (!response.ok) throw new Error("Failed to fetch devices");
        const data = await response.json();
        setModularDevices(data);
      } catch (error) {
        console.error(error);
        Toast.fire({
          icon: "error",
          title: "Could not fetch modular devices.",
        });
      }
    }
    fetchModularDevices();
  }, []);

  const handleMqttMessage = useCallback(
    (topic: string, message: Buffer) => {
      if (topic === subscribedTopic) {
        try {
          const payload = JSON.parse(message.toString());
          // Simpan MAC address jika ada di payload
          if (payload.mac && selectedDevice) {
            setSelectedDevice((prev) => ({ ...prev!, mac: payload.mac }));
          }
          // Asumsi 'value' adalah string JSON berisi status pin
          if (typeof payload.value === "string") {
            const pinStatus = JSON.parse(payload.value);
            setDevicePins(pinStatus);
          }
        } catch (e) {
          console.error("Failed to parse MQTT message:", e);
        }
      }
    },
    [subscribedTopic, selectedDevice]
  );

  // Subscribe/Unsubscribe logic
  useEffect(() => {
    if (client && connectionStatus === "Connected") {
      if (subscribedTopic) {
        client.unsubscribe(subscribedTopic);
      }
      if (selectedDevice?.topicName) {
        const newTopic = selectedDevice.topicName;
        client.subscribe(newTopic);
        setSubscribedTopic(newTopic);
        client.on("message", handleMqttMessage);
      }
      return () => {
        if (selectedDevice?.topicName) {
          client.off("message", handleMqttMessage);
        }
      };
    }
  }, [
    client,
    connectionStatus,
    selectedDevice,
    subscribedTopic,
    handleMqttMessage,
  ]);

  const speakMessage = (message: string) => {
    try {
      const speech = new SpeechSynthesisUtterance(message);
      speech.lang = "id-ID";
      window.speechSynthesis.speak(speech);
    } catch (error) {
      console.error("Speech synthesis failed:", error);
    }
  };

  const processCommand = (command: string) => {
    const lowerCommand = command.toLowerCase().trim();
    setRecognizedText(command);

    if (!selectedDevice) {
      setResponseText("Silakan pilih perangkat terlebih dahulu.");
      speakMessage("Silakan pilih perangkat terlebih dahulu.");
      return;
    }

    let action: number | null = null;
    if (lowerCommand.startsWith("nyalakan")) action = 1;
    else if (lowerCommand.startsWith("matikan")) action = 0;

    if (action === null) {
      setResponseText(
        "Perintah tidak dikenali. Gunakan 'nyalakan' atau 'matikan'."
      );
      return;
    }

    const target = lowerCommand
      .replace("nyalakan", "")
      .replace("matikan", "")
      .trim();
    const pinMatch = target.match(/relay (\d+)/);

    if (!pinMatch) {
      setResponseText(`Target tidak valid: "${target}"`);
      return;
    }

    const pinNumber = parseInt(pinMatch[1]);
    const pinKey = `Relay${pinNumber}`;

    if (!(pinKey in devicePins)) {
      setResponseText(`Pin ${pinNumber} tidak ditemukan di perangkat ini.`);
      return;
    }

    const payload = {
      mac: selectedDevice.mac || "Unknown MAC",
      protocol_type: "Modular",
      device: selectedDevice.partNumber,
      function: "write",
      value: { pin: pinNumber, data: action },
      address: parseInt(selectedDevice.ipDevice),
      device_bus: selectedDevice.deviceBus || 0,
      Timestamp: new Date().toISOString(),
    };

    client?.publish("modular", JSON.stringify(payload));
    const response = `Perintah untuk ${
      action === 1 ? "menyalakan" : "mematikan"
    } relay ${pinNumber} telah dikirim.`;
    setResponseText(response);
    speakMessage(response);
  };

  const startRecognition = () => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      Swal.fire(
        "Error",
        "Browser tidak mendukung Speech-to-Text. Gunakan Chrome atau Edge.",
        "error"
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

  const filteredRelayPins = useMemo(() => {
    return Object.fromEntries(
      Object.entries(devicePins).filter(([key]) =>
        key.toLowerCase().includes("relay")
      )
    );
  }, [devicePins]);

  return (
    <div className="container mx-auto p-4 md:p-6 lg:p-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">
          Voice Recognition Control
        </h1>
        <p className="text-muted-foreground">
          Control your relay devices using voice commands.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Device Control</CardTitle>
          <CardDescription>
            Select a modular device to monitor its status and control it with
            your voice.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="max-w-md space-y-2">
            <Label htmlFor="device-select">Pilih Device Modular:</Label>
            <Select onValueChange={(val) => setSelectedDevice(JSON.parse(val))}>
              <SelectTrigger id="device-select">
                <SelectValue placeholder="-- Pilih Device --" />
              </SelectTrigger>
              <SelectContent>
                {modularDevices.map((device) => (
                  <SelectItem key={device.id} value={JSON.stringify(device)}>
                    {device.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedDevice && (
            <div>
              <h3 className="font-semibold mb-2">Relay Status</h3>
              <div className="flex flex-wrap gap-4">
                {Object.keys(filteredRelayPins).length > 0 ? (
                  Object.entries(filteredRelayPins).map(([pin, value]) => (
                    <div
                      key={pin}
                      className="p-4 border rounded-lg w-32 text-center"
                    >
                      <p className="font-bold">{pin}</p>
                      <p className={value ? "text-green-600" : "text-red-600"}>
                        {value ? "ON" : "OFF"}
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Waiting for relay status data...
                  </p>
                )}
              </div>
            </div>
          )}

          <div className="text-center pt-6 border-t">
            <div className="mx-auto max-w-md space-y-3">
              <div className="p-4 border rounded-lg bg-slate-50 dark:bg-slate-800 min-h-[60px] flex items-center justify-center">
                <p className="text-lg font-semibold text-muted-foreground">
                  {recognizedText || "..."}
                </p>
              </div>
              <div className="flex justify-center gap-4">
                <Button onClick={startRecognition} disabled={isListening}>
                  <Mic className="mr-2 h-4 w-4" /> Start Listening
                </Button>
                {isListening && (
                  <Button onClick={stopRecognition} variant="destructive">
                    <MicOff className="mr-2 h-4 w-4" /> Stop
                  </Button>
                )}
              </div>
              {responseText && (
                <p className="text-sm font-medium text-primary mt-4">
                  {responseText}
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// --- Wrapper Component dengan MqttProvider ---
export default function VoiceRecognitionControlPageWithProvider() {
  return (
    <MqttProvider>
      <VoiceRecognitionControlPage />
    </MqttProvider>
  );
}
