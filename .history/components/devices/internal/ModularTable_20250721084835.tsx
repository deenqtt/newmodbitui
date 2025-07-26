"use client";
import { GenericInternalTable } from "./GenericInternalTable";

export function ModularTable() {
  return (
    <GenericInternalTable
      title="Modular Devices"
      commandTopic="command_device_i2c"
      responseTopic="response_device_i2c"
      getDataCommand="getDataI2C"
    />
  );
}
