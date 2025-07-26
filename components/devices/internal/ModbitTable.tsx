// File: components/devices/internal/ModbitTable.tsx
"use client";
import { GenericI2CTable } from "./GenericI2CTable";

const partNumbers = [
  "SHT40",
  "FS3000",
  "ICP10111",
  "LIS3DHTR",
  "SPS30",
  "SDP810",
  "TIBBIT_GPIO",
  "DRYCONTACT_4CH",
  "OPT3007",
  "SOLITUDE_RELAY",
  "TIBBIT_DI",
];
const services = [
  "scheduler_control.service",
  "drycontact_control.service",
  "modular_i2c.service",
  "device_config.service",
];

export function ModbitTable() {
  return (
    <GenericI2CTable
      title="Modbit Devices"
      commandTopic="command_device_i2c_plain"
      responseTopic="response_device_i2c_plain"
      getDataCommand="getDataI2C"
      partNumberOptions={partNumbers}
      servicesToRestart={services}
    />
  );
}
