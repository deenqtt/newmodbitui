// File: components/devices/internal/ModularTable.tsx
"use client";
import { GenericI2CTable } from "./GenericI2CTable";

const partNumbers = ["RELAYMINI", "RELAY", "DRYCONTACT", "OPTOCOUPLER"];
const services = ["scheduler_control.service", "drycontact_control.service", "modular_i2c.service", "device_config.service"];

export function ModularTable() {
  return (
    <GenericI2CTable
      title="Modular Devices"
      commandTopic="command_device_i2c"
      responseTopic="response_device_i2c"
      getDataCommand="getDataI2C"
      partNumberOptions={partNumbers}
      servicesToRestart={services}
    />
  );
}