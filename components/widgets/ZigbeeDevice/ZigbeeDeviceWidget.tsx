// File: components/widgets/ZigbeeDevice/ZigbeeDeviceWidgetEnhanced.tsx
"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Progress } from "@/components/ui/progress";
import {
  Zap,
  Wifi,
  WifiOff,
  Thermometer,
  Droplets,
  Activity,
  Lightbulb,
  Battery,
  AlertCircle,
  Eye,
  DoorOpen,
  DoorClosed,
  Waves,
  Power,
  Sun,
  Moon,
  Home,
  Gauge,
  ToggleLeft,
  Volume2,
  Wind,
  Snowflake,
  Flame,
  ShieldAlert,
  Leaf,
  Navigation,
  Lock,
  Unlock,
  RotateCcw,
  Target,
  Maximize2,
  Settings,
  Radio,
  AirVent,
  Globe,
  Fingerprint,
  Cpu,
  Speaker,
  Smartphone,
  CircuitBoard,
  Flashlight,
  Timer,
  Siren,
  Keyboard,
  MousePointer,
  ChevronsUpDown,
  Refrigerator,
  Car,
  Dog,
  TreePine,
  Camera,
  Palette,
  RotateCw,
  ChevronUp,
  ChevronDown,
  Play,
  Pause,
  VolumeX,
  Volume1,
  HeartHandshake,
  Gamepad2,
  Fan,
} from "lucide-react";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "";

interface ZigbeeDeviceConfig {
  deviceId: string;
  friendlyName: string;
  customName: string;
  deviceType: string;
  manufacturer?: string;
  modelId?: string;
}

interface DeviceData {
  id: string;
  deviceId: string;
  friendlyName: string;
  deviceType: string;
  manufacturer?: string;
  modelId?: string;
  capabilities: any;
  lastSeen?: string;
  isOnline: boolean;
  currentState: any;
  createdAt: string;
  updatedAt: string;
}

interface Props {
  config: ZigbeeDeviceConfig;
}

// ULTIMATE Device Type Detection - Enhanced 4500+ Device Support with Backend Sync
const ULTIMATE_DEVICE_PATTERNS = {
  // =================== PRIMARY SENSORS ===================
  motion_sensor: {
    stateKeys: ["occupancy", "motion", "presence"],
    modelPatterns: [
      "motion",
      "pir",
      "occupancy",
      "rtcgq",
      "sts-irm",
      "snzb-03",
      "ts0202",
      "motionv",
      "3325-s",
    ],
    manufacturerHints: ["smartthings", "xiaomi", "aqara", "sonoff", "tuya"],
    icon: Activity,
    primaryColor: "text-green-600",
    capabilities: [
      "occupancy",
      "temperature",
      "battery",
      "tamper",
      "illuminance",
    ],
    priority: 1,
  },

  presence_sensor: {
    stateKeys: ["presence", "radar", "distance"],
    modelPatterns: ["presence", "radar", "mmwave", "fp1", "agl04"],
    manufacturerHints: ["aqara", "tuya"],
    icon: Eye,
    primaryColor: "text-blue-600",
    capabilities: ["presence", "distance", "direction", "battery"],
    priority: 1,
  },

  door_sensor: {
    stateKeys: ["contact"],
    modelPatterns: [
      "door",
      "window",
      "contact",
      "magnet",
      "mccgq",
      "snzb-04",
      "3300-s",
      "multiv",
      "3321-s",
    ],
    manufacturerHints: ["xiaomi", "aqara", "smartthings", "sonoff"],
    icon: DoorClosed,
    primaryColor: "text-purple-600",
    capabilities: ["contact", "temperature", "battery"],
    priority: 1,
  },

  water_sensor: {
    stateKeys: ["water_leak", "leak", "water_detected", "trigger_count"],
    modelPatterns: [
      "water",
      "leak",
      "flood",
      "wleak",
      "sjcgq",
      "ts0207",
      "agl02",
    ],
    manufacturerHints: ["xiaomi", "aqara", "tuya"],
    icon: Droplets,
    primaryColor: "text-blue-500",
    capabilities: ["water_leak", "trigger_count", "battery", "voltage"],
    priority: 1,
  },

  smoke_sensor: {
    stateKeys: ["smoke", "smoke_detected", "fire"],
    modelPatterns: ["smoke", "fire", "ts0205"],
    manufacturerHints: ["tuya", "heiman"],
    icon: ShieldAlert,
    primaryColor: "text-red-600",
    capabilities: ["smoke", "battery", "test"],
    priority: 1,
  },

  gas_sensor: {
    stateKeys: ["gas", "gas_detected", "co", "methane"],
    modelPatterns: ["gas", "co", "methane", "ts0204"],
    manufacturerHints: ["tuya", "heiman"],
    icon: Wind,
    primaryColor: "text-orange-600",
    capabilities: ["gas", "co", "battery"],
    priority: 1,
  },

  vibration_sensor: {
    stateKeys: ["vibration", "vibration_detected", "drop", "tilt"],
    modelPatterns: ["vibration", "shake", "drop", "ts0210"],
    manufacturerHints: ["xiaomi", "aqara", "tuya"],
    icon: Waves,
    primaryColor: "text-yellow-600",
    capabilities: ["vibration", "drop", "tilt", "battery"],
    priority: 1,
  },

  // =================== ENVIRONMENTAL SENSORS ===================
  climate_sensor: {
    stateKeys: ["temperature", "humidity"],
    modelPatterns: [
      "weather",
      "climate",
      "wsdcgq",
      "ht",
      "snzb-02",
      "ts0201",
      "sen_ill.mgl01",
    ],
    manufacturerHints: ["xiaomi", "aqara", "sonoff", "tuya"],
    icon: Home,
    primaryColor: "text-green-500",
    capabilities: ["temperature", "humidity", "pressure", "battery"],
    priority: 2,
  },

  temperature_sensor: {
    stateKeys: ["temperature"],
    modelPatterns: ["temperature", "temp"],
    manufacturerHints: ["generic"],
    icon: Thermometer,
    primaryColor: "text-red-500",
    capabilities: ["temperature", "battery"],
    priority: 2,
  },

  humidity_sensor: {
    stateKeys: ["humidity"],
    modelPatterns: ["humidity"],
    manufacturerHints: ["generic"],
    icon: Droplets,
    primaryColor: "text-blue-400",
    capabilities: ["humidity", "battery"],
    priority: 2,
  },

  pressure_sensor: {
    stateKeys: ["pressure"],
    modelPatterns: ["pressure", "baro"],
    manufacturerHints: ["generic"],
    icon: Gauge,
    primaryColor: "text-purple-500",
    capabilities: ["pressure", "battery"],
    priority: 2,
  },

  illuminance_sensor: {
    stateKeys: ["illuminance", "illuminance_lux"],
    modelPatterns: ["light", "illuminance", "lux", "sen_ill"],
    manufacturerHints: ["xiaomi", "philips"],
    icon: Sun,
    primaryColor: "text-yellow-500",
    capabilities: ["illuminance", "battery"],
    priority: 2,
  },

  air_quality_sensor: {
    stateKeys: ["co2", "voc", "pm25", "pm10", "formaldehyde", "eco2", "tvoc"],
    modelPatterns: ["air", "quality", "co2", "voc", "pm25", "ts0601_air"],
    manufacturerHints: ["tuya", "xiaomi"],
    icon: Leaf,
    primaryColor: "text-green-400",
    capabilities: ["co2", "voc", "pm25", "pm10", "battery"],
    priority: 2,
  },

  // =================== LIGHTING DEVICES ===================
  light: {
    stateKeys: ["state", "brightness"],
    modelPatterns: [
      "bulb",
      "light",
      "led",
      "lamp",
      "lwb",
      "lwa",
      "tradfri",
      "aqcn02",
      "cwopcn",
    ],
    manufacturerHints: ["philips", "ikea", "osram", "sengled", "xiaomi"],
    icon: Lightbulb,
    primaryColor: "text-yellow-600",
    capabilities: ["state", "brightness"],
    priority: 3,
  },

  color_light: {
    stateKeys: ["state", "brightness", "color", "color_xy", "color_hs"],
    modelPatterns: [
      "color",
      "rgb",
      "hue",
      "lct",
      "cws",
      "ts0505",
      "lst",
      "cwopcn02",
      "cwopcn03",
    ],
    manufacturerHints: ["philips", "ikea", "tuya", "gledopto", "xiaomi"],
    icon: Lightbulb,
    primaryColor: "text-rainbow",
    capabilities: ["state", "brightness", "color", "color_temp"],
    priority: 3,
  },

  dimmer: {
    stateKeys: ["state", "brightness"],
    modelPatterns: ["dimmer", "dim", "rwl021"],
    manufacturerHints: ["philips", "ikea", "legrand"],
    icon: ChevronsUpDown,
    primaryColor: "text-yellow-500",
    capabilities: ["state", "brightness"],
    priority: 3,
  },

  // =================== SWITCHES & PLUGS ===================
  switch: {
    stateKeys: ["state"],
    modelPatterns: [
      "switch",
      "relay",
      "ts000",
      "ts001",
      "basiczbr",
      "zbmini",
      "ts0011",
      "ts0012",
      "ts0013",
      "ts0014",
    ],
    manufacturerHints: ["tuya", "sonoff", "aqara", "legrand"],
    icon: ToggleLeft,
    primaryColor: "text-blue-600",
    capabilities: ["state"],
    priority: 3,
  },

  plug: {
    stateKeys: ["state", "power", "voltage", "current", "energy"],
    modelPatterns: [
      "plug",
      "socket",
      "outlet",
      "zncz",
      "ts0121",
      "s31zb",
      "ts011f",
      "ts0101",
      "mmeu01",
      "maus01",
    ],
    manufacturerHints: ["xiaomi", "tuya", "sonoff", "ikea"],
    icon: Power,
    primaryColor: "text-green-600",
    capabilities: ["state", "power", "voltage", "current", "energy"],
    priority: 3,
  },

  // =================== CONTROLS & REMOTES ===================
  button: {
    stateKeys: ["action", "click"],
    modelPatterns: [
      "button",
      "switch",
      "wxkg",
      "snzb-01",
      "ts000f",
      "remote.b1acn01",
    ],
    manufacturerHints: ["xiaomi", "aqara", "sonoff", "tuya"],
    icon: MousePointer,
    primaryColor: "text-purple-600",
    capabilities: ["action", "battery"],
    priority: 4,
  },

  remote: {
    stateKeys: ["action"],
    modelPatterns: ["remote", "controller", "rwl", "tradfri remote"],
    manufacturerHints: ["philips", "ikea", "xiaomi"],
    icon: Volume2,
    primaryColor: "text-blue-500",
    capabilities: ["action", "battery"],
    priority: 4,
  },

  cube: {
    stateKeys: ["action", "side", "angle"],
    modelPatterns: ["cube", "mfkzq", "aqgl01"],
    manufacturerHints: ["xiaomi", "aqara"],
    icon: Navigation,
    primaryColor: "text-indigo-600",
    capabilities: ["action", "side", "angle", "battery"],
    priority: 4,
  },

  // =================== COVERS & MOTORS ===================
  cover: {
    stateKeys: ["position", "state"],
    modelPatterns: [
      "blind",
      "curtain",
      "shade",
      "roller",
      "fyrtur",
      "kadrilj",
      "ts0302",
      "ts130f",
    ],
    manufacturerHints: ["ikea", "tuya", "aqara"],
    icon: Maximize2,
    primaryColor: "text-gray-600",
    capabilities: ["position", "state", "tilt"],
    priority: 3,
  },

  // =================== CLIMATE CONTROL ===================
  thermostat: {
    stateKeys: ["current_heating_setpoint", "system_mode", "local_temperature"],
    modelPatterns: ["thermostat", "ts0601_thermostat"],
    manufacturerHints: ["tuya", "danfoss", "eurotronic"],
    icon: Thermometer,
    primaryColor: "text-orange-600",
    capabilities: [
      "current_heating_setpoint",
      "system_mode",
      "local_temperature",
    ],
    priority: 3,
  },

  radiator_valve: {
    stateKeys: ["current_heating_setpoint", "position"],
    modelPatterns: ["valve", "radiator", "ts0601_radiator"],
    manufacturerHints: ["tuya", "danfoss"],
    icon: Thermometer,
    primaryColor: "text-red-400",
    capabilities: ["current_heating_setpoint", "position", "battery"],
    priority: 3,
  },

  fan: {
    stateKeys: ["fan_state", "fan_mode"],
    modelPatterns: ["fan"],
    manufacturerHints: ["tuya", "generic"],
    icon: Fan,
    primaryColor: "text-blue-400",
    capabilities: ["fan_state", "fan_mode"],
    priority: 3,
  },

  // =================== SECURITY & ACCESS ===================
  lock: {
    stateKeys: ["lock_state", "state"],
    modelPatterns: ["lock", "door_lock"],
    manufacturerHints: ["tuya", "yale", "schlage"],
    icon: Lock,
    primaryColor: "text-red-600",
    capabilities: ["lock_state", "battery"],
    priority: 3,
  },

  keypad: {
    stateKeys: ["action", "code"],
    modelPatterns: ["keypad"],
    manufacturerHints: ["tuya", "yale"],
    icon: Keyboard,
    primaryColor: "text-gray-600",
    capabilities: ["action", "code", "battery"],
    priority: 4,
  },

  // =================== SPECIALTY DEVICES ===================
  siren: {
    stateKeys: ["warning", "alarm", "state"],
    modelPatterns: ["siren", "alarm", "warning"],
    manufacturerHints: ["tuya", "heiman"],
    icon: Siren,
    primaryColor: "text-red-500",
    capabilities: ["warning", "alarm", "state", "battery"],
    priority: 4,
  },

  // =================== SMART HOME ECOSYSTEM ===================
  hub: {
    stateKeys: ["state"],
    modelPatterns: ["hub", "gateway", "bridge"],
    manufacturerHints: ["xiaomi", "tuya", "philips"],
    icon: Globe,
    primaryColor: "text-blue-700",
    capabilities: ["state"],
    priority: 5,
  },

  // =================== FALLBACK ===================
  unknown: {
    stateKeys: [],
    modelPatterns: [],
    manufacturerHints: [],
    icon: CircuitBoard,
    primaryColor: "text-gray-500",
    capabilities: [],
    priority: 10,
  },
};

// Enhanced device type detection with backend sync and capability awareness
const detectUltimateDeviceType = (
  state: any,
  modelId?: string,
  manufacturer?: string,
  capabilities?: any,
  databaseType?: string
): string => {
  console.log(`🔍 ULTIMATE Widget Detection:`, {
    databaseType,
    stateKeys: state ? Object.keys(state) : [],
    modelId,
    manufacturer,
    capabilityKeys: capabilities ? Object.keys(capabilities) : [],
  });

  // PRIORITY 1: Use database type if reliable and not "unknown"
  if (databaseType && databaseType !== "unknown" && databaseType !== "sensor") {
    console.log(`✅ Using backend database type: ${databaseType}`);
    return databaseType;
  }

  // PRIORITY 2: Enhanced pattern matching with comprehensive scoring
  const stateKeys = state ? Object.keys(state) : [];
  const model = modelId?.toLowerCase() || "";
  const vendor = manufacturer?.toLowerCase() || "";
  const capKeys = capabilities ? Object.keys(capabilities) : [];

  // Check each device pattern with enhanced scoring
  let bestMatch = { type: "unknown", score: 0 };

  for (const [deviceType, pattern] of Object.entries(
    ULTIMATE_DEVICE_PATTERNS
  )) {
    let score = 0;

    // Score by state keys (highest weight)
    const stateMatches = pattern.stateKeys.filter((key) =>
      stateKeys.includes(key)
    );
    score += stateMatches.length * 15;

    // Score by capability keys (high weight)
    const capMatches = pattern.capabilities.filter((cap) =>
      capKeys.includes(cap)
    );
    score += capMatches.length * 12;

    // Score by model patterns (medium weight)
    const modelMatches = pattern.modelPatterns.filter((pat) =>
      model.includes(pat)
    );
    score += modelMatches.length * 8;

    // Score by manufacturer hints (low weight)
    const vendorMatches = pattern.manufacturerHints.filter((hint) =>
      vendor.includes(hint)
    );
    score += vendorMatches.length * 4;

    // Special logic bonuses
    if (
      deviceType === "climate_sensor" &&
      stateKeys.includes("temperature") &&
      stateKeys.includes("humidity")
    ) {
      score += 20; // Boost for temp+humidity combo
    }

    if (
      deviceType === "color_light" &&
      (stateKeys.includes("color") || stateKeys.includes("color_xy"))
    ) {
      score += 25; // Strong indicator for color light
    }

    if (
      deviceType === "plug" &&
      (stateKeys.includes("power") || stateKeys.includes("energy"))
    ) {
      score += 20; // Power measurement = smart plug
    }

    // Primary function detection bonus
    if (pattern.stateKeys.length > 0 && stateMatches.length > 0) {
      score += 30; // Strong bonus for primary function match
    }

    // Priority adjustment (lower priority = higher score adjustment)
    score += (10 - pattern.priority) * 2;

    if (score > bestMatch.score) {
      bestMatch = { type: deviceType, score };
    }

    console.log(
      `📊 ${deviceType}: score=${score} (state:${stateMatches.length}, cap:${capMatches.length}, model:${modelMatches.length}, vendor:${vendorMatches.length})`
    );
  }

  console.log(`🎯 Best match: ${bestMatch.type} (score: ${bestMatch.score})`);
  return bestMatch.score > 10 ? bestMatch.type : "unknown";
};

// Get device configuration
const getDeviceConfig = (deviceType: string) => {
  return (
    ULTIMATE_DEVICE_PATTERNS[deviceType] || ULTIMATE_DEVICE_PATTERNS.unknown
  );
};

// Enhanced capability detection from device capabilities
const getAvailableControls = (capabilities: any, currentState: any) => {
  if (!capabilities) return [];

  const controls = [];

  Object.keys(capabilities).forEach((key) => {
    const cap = capabilities[key];

    // Check if capability is writable
    if (cap.writable || (cap.access && (cap.access & 2) !== 0)) {
      if (key === "state") {
        controls.push({
          type: "toggle",
          key,
          label: "Power",
          currentValue: currentState?.[key],
        });
      } else if (key === "brightness") {
        controls.push({
          type: "slider",
          key,
          label: "Brightness",
          min: cap.min || 0,
          max: cap.max || 255,
          step: 1,
          currentValue: currentState?.[key] || 0,
        });
      } else if (key === "color_temp") {
        controls.push({
          type: "slider",
          key,
          label: "Color Temperature",
          min: cap.min || 2700,
          max: cap.max || 6500,
          step: 100,
          unit: "K",
          currentValue: currentState?.[key] || 3000,
        });
      } else if (key === "position") {
        controls.push({
          type: "slider",
          key,
          label: "Position",
          min: 0,
          max: 100,
          step: 1,
          unit: "%",
          currentValue: currentState?.[key] || 0,
        });
      } else if (key === "current_heating_setpoint") {
        controls.push({
          type: "slider",
          key,
          label: "Target Temperature",
          min: cap.min || 5,
          max: cap.max || 30,
          step: 0.5,
          unit: "°C",
          currentValue: currentState?.[key] || 20,
        });
      } else if (key === "fan_state") {
        controls.push({
          type: "toggle",
          key,
          label: "Fan",
          currentValue: currentState?.[key],
        });
      } else if (key === "volume") {
        controls.push({
          type: "slider",
          key,
          label: "Volume",
          min: 0,
          max: cap.max || 100,
          step: 1,
          unit: "%",
          currentValue: currentState?.[key] || 0,
        });
      }
    }
  });

  return controls;
};

// ENHANCED STATE DISPLAY - Tampilkan semua data dengan layout yang bagus dan pemisahan monitoring/control

const renderAllStateData = (deviceData: DeviceData, detectedType: string) => {
  if (!deviceData?.currentState) return null;

  const state = deviceData.currentState;

  // FILTER: Skip keys yang tidak berguna dan signal/battery
  const excludeKeys = [
    "last_updated",
    "device_temperature",
    "linkquality", // Hapus signal
    "signal", // Hapus signal
    "battery", // Hapus battery
  ];

  // Ambil semua state items yang valid
  const allStateItems = Object.entries(state)
    .filter(([key, value]) => {
      if (excludeKeys.includes(key)) return false;
      if (value === null || value === undefined || value === "") return false;
      return true;
    })
    .map(([key, value]) => {
      const config = getEnhancedStateItemConfig(key, value, detectedType);
      if (!config) return null; // Skip jika config null (battery/signal)

      return {
        key,
        label: config.label,
        value: formatStateValue(key, value),
        icon: config.icon,
        color: config.color,
        priority: config.priority,
        category: config.category,
        rawValue: value,
      };
    })
    .filter(Boolean); // Remove null items

  // Semua data masuk ke monitoring saja
  const monitoringItems = allStateItems.sort((a, b) => a.priority - b.priority);

  return (
    <div className="space-y-4">
      {/* MONITORING SECTION - Semua Data */}
      {monitoringItems.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 bg-blue-500 rounded-full"></div>
            <h3 className="text-sm font-semibold text-foreground">
              Monitoring
            </h3>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {monitoringItems.map((item) => (
              <MonitoringDataItem key={item.key} item={item} />
            ))}
          </div>
        </div>
      )}

      {/* Fallback jika tidak ada data */}
      {monitoringItems.length === 0 && (
        <div className="text-center text-sm text-muted-foreground py-8">
          <CircuitBoard className="h-12 w-12 mx-auto mb-2 opacity-30" />
          <p>No data available</p>
        </div>
      )}
    </div>
  );
};

// ENHANCED getStateItemConfig dengan kategori monitoring/control/diagnostic
const getEnhancedStateItemConfig = (
  key: string,
  value: any,
  deviceType: string
) => {
  const keyLower = key.toLowerCase();

  // Skip signal dan battery - tidak ditampilkan sama sekali
  if (keyLower.includes("linkquality") || keyLower.includes("signal")) {
    return null; // Skip signal
  }

  if (keyLower.includes("battery")) {
    return null; // Skip battery
  }

  // =================== SEMUA DATA MASUK KE MONITORING ===================

  // Motion/Presence Detection
  if (
    keyLower.includes("occupancy") ||
    keyLower.includes("motion") ||
    keyLower.includes("presence")
  ) {
    const isDetected = value === true || value === "true" || value === 1;
    return {
      icon: Activity,
      color: isDetected ? "text-green-600" : "text-muted-foreground",
      label: "Motion",
      priority: 1,
      category: "monitoring",
    };
  }

  // Door/Window Contact
  if (keyLower.includes("contact")) {
    const isOpen = value === false || value === "false" || value === 0;
    return {
      icon: isOpen ? DoorOpen : DoorClosed,
      color: isOpen ? "text-orange-600" : "text-green-600",
      label: "Door",
      priority: 1,
      category: "monitoring",
    };
  }

  // Water Leak Detection
  if (keyLower.includes("water_leak") || keyLower.includes("leak")) {
    const isLeaking = value === true || value === "true" || value === 1;
    return {
      icon: Droplets,
      color: isLeaking ? "text-red-600" : "text-green-600",
      label: "Water",
      priority: 1,
      category: "monitoring",
    };
  }

  // Temperature
  if (keyLower.includes("temperature")) {
    const temp = typeof value === "number" ? value : parseFloat(value);
    let color = "text-red-500";
    if (temp < 15) color = "text-blue-500";
    else if (temp < 25) color = "text-green-500";
    else if (temp > 30) color = "text-red-600";

    return {
      icon: Thermometer,
      color,
      label: "Temperature",
      priority: 2,
      category: "monitoring",
    };
  }

  // Humidity
  if (keyLower.includes("humidity")) {
    const humidity = typeof value === "number" ? value : parseFloat(value);
    let color = "text-blue-500";
    if (humidity > 70) color = "text-blue-600";
    else if (humidity < 30) color = "text-orange-500";

    return {
      icon: Droplets,
      color,
      label: "Humidity",
      priority: 2,
      category: "monitoring",
    };
  }

  // Power State
  if (key === "state") {
    const isOn = value === "ON" || value === true || value === "on";
    return {
      icon: Power,
      color: isOn ? "text-green-600" : "text-muted-foreground",
      label: "Power",
      priority: 1,
      category: "monitoring",
    };
  }

  // Power Measurements
  if (keyLower.includes("power")) {
    return {
      icon: Zap,
      color: "text-yellow-600",
      label: "Power",
      priority: 2,
      category: "monitoring",
    };
  }

  if (keyLower.includes("energy")) {
    return {
      icon: Battery,
      color: "text-green-600",
      label: "Energy",
      priority: 2,
      category: "monitoring",
    };
  }

  if (keyLower.includes("current")) {
    return {
      icon: Zap,
      color: "text-purple-600",
      label: "Current",
      priority: 3,
      category: "monitoring",
    };
  }

  if (keyLower.includes("voltage")) {
    return {
      icon: Zap,
      color: "text-blue-600",
      label: "Voltage",
      priority: 3,
      category: "monitoring",
    };
  }

  // Brightness
  if (keyLower.includes("brightness")) {
    return {
      icon: Sun,
      color: "text-yellow-600",
      label: "Brightness",
      priority: 2,
      category: "monitoring",
    };
  }

  // Light Level
  if (keyLower.includes("illuminance") || keyLower.includes("lux")) {
    return {
      icon: Sun,
      color: "text-yellow-500",
      label: "Light Level",
      priority: 3,
      category: "monitoring",
    };
  }

  // Last Action
  if (keyLower.includes("action")) {
    return {
      icon: MousePointer,
      color: "text-blue-600",
      label: "Last Action",
      priority: 2,
      category: "monitoring",
    };
  }

  // Air Quality
  if (keyLower.includes("co2")) {
    const co2 = typeof value === "number" ? value : parseFloat(value);
    let color = "text-green-600";
    if (co2 > 1000) color = "text-orange-600";
    if (co2 > 1500) color = "text-red-600";

    return {
      icon: Wind,
      color,
      label: "CO₂",
      priority: 3,
      category: "monitoring",
    };
  }

  // DEFAULT: Semua data lain masuk monitoring
  return {
    icon: Settings,
    color: "text-muted-foreground",
    label: key.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()),
    priority: 4,
    category: "monitoring",
  };
};

// ENHANCED Data Item Components dengan styling yang berbeda per kategori

// Monitoring Data - Larger, prominent display
const MonitoringDataItem = ({ item }: { item: any }) => {
  const Icon = item.icon;

  return (
    <div className="flex items-center gap-3 p-3 rounded-lg bg-blue-50/50 border border-blue-100">
      <div className="flex-shrink-0">
        <Icon className={`h-5 w-5 ${item.color}`} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-xs font-medium text-blue-700 uppercase tracking-wide">
          {item.label}
        </div>
        <div className="font-semibold text-sm truncate" title={item.value}>
          {item.value}
        </div>
      </div>
    </div>
  );
};

// Function untuk format nilai state agar lebih readable
const formatStateValue = (key: string, value: any): string => {
  if (value === null || value === undefined) return "N/A";

  const keyLower = key.toLowerCase();

  // Boolean values
  if (typeof value === "boolean") {
    if (
      keyLower.includes("occupancy") ||
      keyLower.includes("motion") ||
      keyLower.includes("presence")
    ) {
      return value ? "Detected" : "Clear";
    }
    if (keyLower.includes("contact")) {
      return value ? "Closed" : "Open";
    }
    if (keyLower.includes("water_leak") || keyLower.includes("leak")) {
      return value ? "Detected" : "Clear";
    }
    if (keyLower.includes("smoke") || keyLower.includes("gas")) {
      return value ? "Detected" : "Clear";
    }
    if (keyLower.includes("lock")) {
      return value ? "Locked" : "Unlocked";
    }
    return value ? "Yes" : "No";
  }

  // String values
  if (typeof value === "string") {
    // State values
    if (key === "state") {
      return value.toUpperCase();
    }

    // Action values
    if (keyLower.includes("action")) {
      return value.replace(/_/g, " ").toUpperCase();
    }

    // Mode values
    if (keyLower.includes("mode")) {
      return value
        .replace(/_/g, " ")
        .toLowerCase()
        .replace(/\b\w/g, (l) => l.toUpperCase());
    }

    return value;
  }

  // Numeric values with units
  if (typeof value === "number") {
    // Temperature
    if (keyLower.includes("temperature") || keyLower.includes("setpoint")) {
      return `${value}°C`;
    }

    // Humidity
    if (keyLower.includes("humidity")) {
      return `${value}%`;
    }

    // Pressure
    if (keyLower.includes("pressure")) {
      return `${value} hPa`;
    }

    // Light level
    if (keyLower.includes("illuminance") || keyLower.includes("lux")) {
      return `${value} lx`;
    }

    // Air quality
    if (keyLower.includes("co2")) {
      return `${value} ppm`;
    }
    if (keyLower.includes("pm25") || keyLower.includes("pm10")) {
      return `${value} μg/m³`;
    }

    // Power measurements
    if (keyLower.includes("power")) {
      return `${value} W`;
    }
    if (keyLower.includes("energy")) {
      return `${value} kWh`;
    }
    if (keyLower.includes("voltage")) {
      return `${value} V`;
    }
    if (keyLower.includes("current")) {
      return `${value} A`;
    }

    // Percentages (tanpa battery)
    if (keyLower.includes("position")) {
      return `${value}%`;
    } // Brightness (convert from 255 scale to percentage if needed)
    if (keyLower.includes("brightness")) {
      if (value > 100) {
        return `${Math.round((value / 255) * 100)}%`;
      }
      return `${value}%`;
    }

    // Color temperature
    if (keyLower.includes("color_temp")) {
      return `${value}K`;
    }

    // Distance
    if (keyLower.includes("distance")) {
      return `${value}m`;
    }

    // Angle
    if (keyLower.includes("angle")) {
      return `${value}°`;
    }

    // Generic number
    return value.toString();
  }

  // Object values (like color)
  if (typeof value === "object" && value !== null) {
    if (keyLower.includes("color")) {
      if (
        value.r !== undefined &&
        value.g !== undefined &&
        value.b !== undefined
      ) {
        return `RGB(${value.r},${value.g},${value.b})`;
      }
      if (value.x !== undefined && value.y !== undefined) {
        return `XY(${value.x.toFixed(3)},${value.y.toFixed(3)})`;
      }
      if (value.h !== undefined && value.s !== undefined) {
        return `HS(${value.h}°,${value.s}%)`;
      }
    }
    return JSON.stringify(value);
  }

  return String(value);
};

export const ZigbeeDeviceWidget = ({ config }: Props) => {
  const [deviceData, setDeviceData] = useState<DeviceData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [detectedType, setDetectedType] = useState<string>("unknown");
  const [isCommandPending, setIsCommandPending] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();

  // Enhanced fetch with error handling
  const fetchDeviceData = useCallback(async () => {
    if (!config.deviceId) return;

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/zigbee/devices/${config.deviceId}`,
        {
          headers: { "Cache-Control": "no-cache" },
          signal: AbortSignal.timeout(5000), // 5s timeout
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: Failed to fetch device data`);
      }

      const data = await response.json();
      setDeviceData(data);
      setError(null);

      console.group(`🔍 ULTIMATE Widget Debug: ${data.friendlyName}`);
      console.log("📦 Full Device Data:", data);
      console.log("🎯 Capabilities:", Object.keys(data.capabilities || {}));
      console.log("⚡ Current State:", data.currentState);
      console.groupEnd();

      // ULTIMATE device type detection with backend sync
      const detected = detectUltimateDeviceType(
        data.currentState,
        data.modelId,
        data.manufacturer,
        data.capabilities,
        data.deviceType
      );

      setDetectedType(detected);
      console.log(`🚀 ULTIMATE detection result: ${detected}`);
    } catch (err: any) {
      console.error("Error fetching device data:", err);
      setError(err.message || "Failed to load device data");
    }
  }, [config.deviceId]);

  // Setup WebSocket for real-time updates
  const setupWebSocket = useCallback(() => {
    if (!config.deviceId || wsRef.current?.readyState === WebSocket.OPEN)
      return;

    try {
      const wsUrl = `ws://${window.location.hostname}:3001/zigbee/${config.deviceId}`;
      wsRef.current = new WebSocket(wsUrl);

      wsRef.current.onopen = () => {
        console.log(`🔗 WebSocket connected for ${config.deviceId}`);
      };

      wsRef.current.onmessage = (event) => {
        try {
          const updateData = JSON.parse(event.data);
          console.log(
            `📡 Real-time update for ${config.deviceId}:`,
            updateData
          );

          setDeviceData((prev) =>
            prev
              ? {
                  ...prev,
                  currentState: { ...prev.currentState, ...updateData },
                  lastSeen: new Date().toISOString(),
                  isOnline: true,
                }
              : prev
          );
        } catch (err) {
          console.error("Error parsing WebSocket message:", err);
        }
      };

      wsRef.current.onerror = (error) => {
        console.error("WebSocket error:", error);
      };

      wsRef.current.onclose = () => {
        console.log(`🔌 WebSocket disconnected for ${config.deviceId}`);
        // Attempt reconnection after 5 seconds
        reconnectTimeoutRef.current = setTimeout(setupWebSocket, 5000);
      };
    } catch (err) {
      console.error("Failed to setup WebSocket:", err);
    }
  }, [config.deviceId]);

  // Initial data fetch and setup
  useEffect(() => {
    setIsLoading(true);
    fetchDeviceData().finally(() => setIsLoading(false));

    // Setup WebSocket for real-time updates
    setupWebSocket();

    // Fallback polling every 30 seconds
    const interval = setInterval(fetchDeviceData, 30000);

    return () => {
      clearInterval(interval);
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [fetchDeviceData, setupWebSocket]);

  // Enhanced command sending with optimistic updates and error handling
  const sendCommand = async (command: any) => {
    if (!deviceData || isCommandPending) return;

    setIsCommandPending(true);

    // Optimistic update
    const originalState = deviceData.currentState;
    setDeviceData((prev) =>
      prev
        ? {
            ...prev,
            currentState: { ...prev.currentState, ...command },
          }
        : prev
    );

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/zigbee/devices/${config.deviceId}/command`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(command),
          signal: AbortSignal.timeout(10000), // 10s timeout
        }
      );

      if (!response.ok) {
        throw new Error(`Command failed: HTTP ${response.status}`);
      }

      console.log(`✅ Command sent successfully:`, command);

      // Refresh state after successful command
      setTimeout(fetchDeviceData, 500);
    } catch (err: any) {
      console.error("Error sending command:", err);

      // Revert optimistic update on error
      setDeviceData((prev) =>
        prev
          ? {
              ...prev,
              currentState: originalState,
            }
          : prev
      );

      setError(`Command failed: ${err.message}`);

      // Clear error after 3 seconds
      setTimeout(() => setError(null), 3000);
    } finally {
      setIsCommandPending(false);
    }
  };

  // ULTIMATE device controls with capability-aware rendering
  const renderUltimateControls = () => {
    if (!deviceData?.currentState || !deviceData.isOnline) return null;

    const state = deviceData.currentState;
    const capabilities = deviceData.capabilities || {};
    const availableControls = getAvailableControls(capabilities, state);

    // If we have capability-based controls, use those
    if (availableControls.length > 0) {
      return (
        <div className="space-y-4">
          {availableControls.map((control) => {
            if (control.type === "toggle") {
              const isOn =
                control.currentValue === "ON" ||
                control.currentValue === true ||
                control.currentValue === "on";

              return (
                <div
                  key={control.key}
                  className="flex items-center justify-between"
                >
                  <span className="text-sm font-medium">{control.label}</span>
                  <Switch
                    checked={isOn}
                    onCheckedChange={(checked) => {
                      const value =
                        control.key === "state"
                          ? checked
                            ? "ON"
                            : "OFF"
                          : checked;
                      sendCommand({ [control.key]: value });
                    }}
                    disabled={isCommandPending}
                  />
                </div>
              );
            } else if (control.type === "slider") {
              return (
                <div key={control.key} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{control.label}</span>
                    <span className="text-xs text-muted-foreground">
                      {control.currentValue}
                      {control.unit || ""}
                    </span>
                  </div>
                  <Slider
                    value={[control.currentValue || control.min]}
                    onValueChange={(value) =>
                      sendCommand({ [control.key]: value[0] })
                    }
                    min={control.min}
                    max={control.max}
                    step={control.step}
                    className="w-full"
                    disabled={isCommandPending}
                  />
                </div>
              );
            }

            return null;
          })}
        </div>
      );
    }

    // Fallback to legacy controls for devices without detailed capabilities
    const controls = [];

    // State toggle (lights, switches, plugs, fans)
    if (state.state !== undefined) {
      controls.push(
        <div key="state" className="flex items-center justify-between">
          <span className="text-sm font-medium">Power</span>
          <Switch
            checked={state.state === "ON" || state.state === true}
            onCheckedChange={(checked) =>
              sendCommand({ state: checked ? "ON" : "OFF" })
            }
            disabled={isCommandPending}
          />
        </div>
      );
    }

    // Fan state toggle
    if (state.fan_state !== undefined) {
      controls.push(
        <div key="fan_state" className="flex items-center justify-between">
          <span className="text-sm font-medium">Fan</span>
          <Switch
            checked={state.fan_state === "ON" || state.fan_state === true}
            onCheckedChange={(checked) =>
              sendCommand({ fan_state: checked ? "ON" : "OFF" })
            }
            disabled={isCommandPending}
          />
        </div>
      );
    }

    // Brightness control
    if (state.brightness !== undefined) {
      controls.push(
        <div key="brightness" className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Brightness</span>
            <span className="text-xs text-muted-foreground">
              {Math.round((state.brightness / 255) * 100)}%
            </span>
          </div>
          <Slider
            value={[state.brightness || 0]}
            onValueChange={(value) => sendCommand({ brightness: value[0] })}
            max={255}
            step={1}
            className="w-full"
            disabled={isCommandPending}
          />
        </div>
      );
    }

    // Color temperature control
    if (state.color_temp !== undefined) {
      controls.push(
        <div key="color_temp" className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Color Temperature</span>
            <span className="text-xs text-muted-foreground">
              {state.color_temp}K
            </span>
          </div>
          <Slider
            value={[state.color_temp || 2700]}
            onValueChange={(value) => sendCommand({ color_temp: value[0] })}
            min={2700}
            max={6500}
            step={100}
            className="w-full"
            disabled={isCommandPending}
          />
        </div>
      );
    }

    // Position control (covers, blinds)
    if (state.position !== undefined) {
      controls.push(
        <div key="position" className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Position</span>
            <span className="text-xs text-muted-foreground">
              {state.position}%
            </span>
          </div>
          <Slider
            value={[state.position || 0]}
            onValueChange={(value) => sendCommand({ position: value[0] })}
            max={100}
            step={1}
            className="w-full"
            disabled={isCommandPending}
          />
          <div className="grid grid-cols-3 gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => sendCommand({ position: 0 })}
              disabled={isCommandPending}
            >
              Close
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => sendCommand({ position: 50 })}
              disabled={isCommandPending}
            >
              Half
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => sendCommand({ position: 100 })}
              disabled={isCommandPending}
            >
              Open
            </Button>
          </div>
        </div>
      );
    }

    // Temperature setpoint (thermostats)
    if (state.current_heating_setpoint !== undefined) {
      controls.push(
        <div key="heating_setpoint" className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Target Temperature</span>
            <span className="text-xs text-muted-foreground">
              {state.current_heating_setpoint}°C
            </span>
          </div>
          <Slider
            value={[state.current_heating_setpoint || 20]}
            onValueChange={(value) =>
              sendCommand({ current_heating_setpoint: value[0] })
            }
            min={5}
            max={30}
            step={0.5}
            className="w-full"
            disabled={isCommandPending}
          />
          <div className="grid grid-cols-2 gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                sendCommand({
                  current_heating_setpoint:
                    (state.current_heating_setpoint || 20) - 1,
                })
              }
              disabled={isCommandPending}
            >
              <ChevronDown className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                sendCommand({
                  current_heating_setpoint:
                    (state.current_heating_setpoint || 20) + 1,
                })
              }
              disabled={isCommandPending}
            >
              <ChevronUp className="h-4 w-4" />
            </Button>
          </div>
        </div>
      );
    }

    // Quick actions for lights
    if (
      (detectedType === "light" || detectedType === "color_light") &&
      state.state !== undefined
    ) {
      controls.push(
        <div key="quick_actions" className="grid grid-cols-3 gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => sendCommand({ brightness: 255 })}
            disabled={isCommandPending}
          >
            Max
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => sendCommand({ brightness: 127 })}
            disabled={isCommandPending}
          >
            Mid
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => sendCommand({ brightness: 1 })}
            disabled={isCommandPending}
          >
            Min
          </Button>
        </div>
      );
    }

    // Color controls for color lights
    if (detectedType === "color_light" && state.state === "ON") {
      controls.push(
        <div key="color_presets" className="grid grid-cols-4 gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => sendCommand({ color: { r: 255, g: 0, b: 0 } })}
            disabled={isCommandPending}
            className="h-8"
          >
            <div className="w-4 h-4 bg-red-500 rounded-full"></div>
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => sendCommand({ color: { r: 0, g: 255, b: 0 } })}
            disabled={isCommandPending}
            className="h-8"
          >
            <div className="w-4 h-4 bg-green-500 rounded-full"></div>
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => sendCommand({ color: { r: 0, g: 0, b: 255 } })}
            disabled={isCommandPending}
            className="h-8"
          >
            <div className="w-4 h-4 bg-blue-500 rounded-full"></div>
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => sendCommand({ color: { r: 255, g: 255, b: 255 } })}
            disabled={isCommandPending}
            className="h-8"
          >
            <div className="w-4 h-4 bg-white border rounded-full"></div>
          </Button>
        </div>
      );
    }

    return controls.length > 0 ? (
      <div className="space-y-4">{controls}</div>
    ) : null;
  };

  const deviceConfig = getDeviceConfig(detectedType);
  const DeviceIcon = deviceConfig.icon;

  if (isLoading) {
    return (
      <Card className="h-full">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-6 w-16" />
          </div>
          <Skeleton className="h-4 w-24" />
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="h-full border-destructive">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-destructive">
            <AlertCircle className="h-5 w-5" />
            Device Error
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-destructive mb-3">{error}</p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setError(null);
                fetchDeviceData();
              }}
              disabled={isLoading}
            >
              {isLoading ? "Loading..." : "Retry"}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-xs opacity-70"
              onClick={() => {
                console.group(
                  `Debug: ${deviceData?.friendlyName || "Unknown"}`
                );
                console.log("Full Data:", deviceData);
                console.log("Current State:", deviceData?.currentState);
                console.log("Capabilities:", deviceData?.capabilities);
                console.log("Detected Type:", detectedType);
                console.log("Error:", error);
                console.groupEnd();
              }}
            >
              Debug
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!deviceData) {
    return (
      <Card className="h-full">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            Device Not Found
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Device with ID {config.deviceId} not found.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <DeviceIcon className={`h-5 w-5 ${deviceConfig.primaryColor}`} />
            <span className="truncate">
              {config.customName || deviceData.friendlyName}
            </span>
          </CardTitle>
          <div className="flex items-center gap-2">
            {isCommandPending && (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
            )}
            <Badge
              variant={deviceData.isOnline ? "default" : "destructive"}
              className="text-xs"
            >
              {deviceData.isOnline ? (
                <div className="flex items-center gap-1">
                  <Wifi className="h-3 w-3" />
                  Online
                </div>
              ) : (
                <div className="flex items-center gap-1">
                  <WifiOff className="h-3 w-3" />
                  Offline
                </div>
              )}
            </Badge>
          </div>
        </div>
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span className="truncate">
            {deviceData.manufacturer} {deviceData.modelId}
          </span>
          <span className="capitalize text-xs px-2 py-1 bg-muted rounded">
            {detectedType.replace(/_/g, " ")}
          </span>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            Last seen:{" "}
            {deviceData.lastSeen
              ? new Date(deviceData.lastSeen).toLocaleString()
              : "Never"}
          </span>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-xs opacity-50 hover:opacity-100"
            onClick={() => {
              console.group(`Debug: ${deviceData.friendlyName}`);
              console.log("Full Data:", deviceData);
              console.log("Current State:", deviceData.currentState);
              console.log(
                "Capabilities:",
                Object.keys(deviceData.capabilities || {})
              );
              console.log("Detected Type:", detectedType);
              console.log("Device Config:", deviceConfig);
              console.log(
                "Available Controls:",
                getAvailableControls(
                  deviceData.capabilities,
                  deviceData.currentState
                )
              );
              console.groupEnd();
            }}
          >
            Debug
          </Button>
        </div>

        {/* ENHANCED STATE DISPLAY - Menampilkan SEMUA data yang tersedia */}
        {renderAllStateData(deviceData, detectedType)}

        {/* CONTROLS SECTION */}
        {renderUltimateControls()}
      </CardContent>
    </Card>
  );
};
